import { Bell, Camera, ChevronLeft, Trash2 } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { persistPickedImage } from "@/lib/persistImage";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useVehicleStore,
  Vehicle,
  FluidType,
  MaintenanceReminder,
  MaintenanceSchedule,
} from "@/store/vehicleStore";
import { useColors } from "@/hooks/useColors";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import spacing from "@/constants/spacing";
import {
  FLUID_LABELS,
  FLUID_ICONS,
  DEFAULT_INTERVALS,
  applyMaintenanceSchedule,
  getDaysUntilDue,
  requestNotificationPermissions,
} from "@/lib/notifications";
import { getLastServiceDatesForVehicle } from "@/lib/historyUtils";
import { Icon } from "@/components/Icon";
import type { IconName } from "@/components/Icon";

const FLUID_TYPES: FluidType[] = ["oil", "coolant", "brake", "power", "washer", "battery"];

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function buildDefaultSchedule(
  existing?: MaintenanceSchedule,
  historyDates?: Partial<Record<FluidType, string>>
): Record<FluidType, MaintenanceReminder> {
  const result = {} as Record<FluidType, MaintenanceReminder>;
  for (const f of FLUID_TYPES) {
    const historyDate = historyDates?.[f]?.split("T")[0];
    const existingDate = existing?.[f]?.lastServiceDate ?? todayIso();
    const effectiveDate =
      historyDate &&
      new Date(historyDate).getTime() > new Date(existingDate).getTime()
        ? historyDate
        : existingDate;

    result[f] = existing?.[f]
      ? { ...existing[f], lastServiceDate: effectiveDate }
      : {
          enabled: false,
          intervalDays: DEFAULT_INTERVALS[f].days,
          intervalKm: DEFAULT_INTERVALS[f].km ?? undefined,
          lastServiceDate: effectiveDate,
        };
  }
  return result;
}

export default function EditVehicleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getVehicle, updateVehicle, deleteVehicle, loadVehicles } = useVehicleStore();
  const vehicle = getVehicle(id ?? "");

  const [version, setVersion] = useState(vehicle?.version ?? "");
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [nickname, setNickname] = useState(vehicle?.nickname ?? "");
  const [photoUri, setPhotoUri] = useState<string | undefined>(vehicle?.photoUri);
  const [currentKm, setCurrentKm] = useState(vehicle?.currentKm?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorToastMessage, setErrorToastMessage] = useState("Não foi possível atualizar o veículo. Tente novamente.");
  const [historyDates, setHistoryDates] = useState<Partial<Record<FluidType, string>>>({});
  const [schedule, setSchedule] = useState<Record<FluidType, MaintenanceReminder>>(
    () => buildDefaultSchedule(vehicle?.maintenanceSchedule)
  );

  useEffect(() => {
    if (!vehicle) return;
    getLastServiceDatesForVehicle(vehicle.id).then(dates => {
      setHistoryDates(dates);
      setSchedule(buildDefaultSchedule(vehicle.maintenanceSchedule, dates));
    });
  }, []);

  if (!vehicle) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Text style={{ color: colors.textSecondary }}>Veículo não encontrado.</Text>
      </View>
    );
  }

  const parsedKm = currentKm ? parseInt(currentKm, 10) : undefined;

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!res.canceled && res.assets[0]) {
      const persisted = await persistPickedImage(res.assets[0].uri);
      setPhotoUri(persisted);
    }
  }

  function toggleReminder(fluid: FluidType, value: boolean) {
    setSchedule(prev => {
      const rem = prev[fluid];
      const km = parsedKm;
      const updates: Partial<MaintenanceReminder> = { enabled: value };
      if (value && !rem.lastServiceOdometer && km) {
        updates.lastServiceOdometer = km;
      }
      return { ...prev, [fluid]: { ...rem, ...updates } };
    });
  }

  function updateLastServiceOdometer(fluid: FluidType, text: string) {
    const n = parseInt(text.replace(/[^0-9]/g, ""), 10);
    setSchedule(prev => ({
      ...prev,
      [fluid]: { ...prev[fluid], lastServiceOdometer: isNaN(n) || n <= 0 ? undefined : n },
    }));
  }

  function updateIntervalDays(fluid: FluidType, text: string) {
    const n = parseInt(text.replace(/[^0-9]/g, ""), 10);
    setSchedule(prev => ({
      ...prev,
      [fluid]: { ...prev[fluid], intervalDays: isNaN(n) || n <= 0 ? undefined : n },
    }));
  }

  function updateIntervalKm(fluid: FluidType, text: string) {
    const n = parseInt(text.replace(/[^0-9]/g, ""), 10);
    setSchedule(prev => ({
      ...prev,
      [fluid]: { ...prev[fluid], intervalKm: isNaN(n) || n <= 0 ? undefined : n },
    }));
  }

  function updateLastService(fluid: FluidType, text: string) {
    setSchedule(prev => ({ ...prev, [fluid]: { ...prev[fluid], lastServiceDate: text } }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      const hasEnabled = FLUID_TYPES.some(f => schedule[f].enabled);
      if (hasEnabled && Platform.OS !== "web") {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          Alert.alert(
            "Permissão necessária",
            "Ative as notificações nas configurações do sistema para receber lembretes."
          );
        }
      }

      const kmValue = currentKm ? parseInt(currentKm.replace(/[^0-9]/g, ""), 10) : undefined;
      const updatedVehicle: Vehicle = {
        ...vehicle!,
        version,
        plate,
        nickname: nickname || undefined,
        photoUri,
        currentKm: isNaN(kmValue ?? NaN) ? undefined : kmValue,
      };

      const finalSchedule = await applyMaintenanceSchedule(updatedVehicle, schedule);

      await updateVehicle(vehicle!.id, {
        version,
        plate,
        nickname: nickname || undefined,
        photoUri,
        currentKm: updatedVehicle.currentKm,
        maintenanceSchedule: finalSchedule,
      });
      await loadVehicles(true);
      setShowToast(true);
    } catch {
      setErrorToastMessage("Não foi possível atualizar o veículo. Tente novamente.");
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      "Excluir veículo?",
      `Tem certeza que deseja excluir ${vehicle?.make} ${vehicle?.model}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicle(vehicle!.id);
              router.replace("/(tabs)");
            } catch {
              setErrorToastMessage("Não foi possível excluir o veículo. Tente novamente.");
              setShowErrorToast(true);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Editar Veículo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 120 + (Platform.OS === "web" ? 34 : 0) },
        ]}
      >
        <TouchableOpacity
          onPress={pickPhoto}
          style={[styles.photoBox, { borderColor: colors.border, backgroundColor: colors.surface }]}
          activeOpacity={0.8}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <>
              <Camera size={24} color={colors.textSecondary} />
              <Text style={[styles.photoLabel, { color: colors.textSecondary }]}>
                Trocar foto do veículo
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={[styles.vehicleInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.vehicleName, { color: colors.textPrimary }]}>
            {vehicle.make} {vehicle.model}
          </Text>
          <Text style={[styles.vehicleYear, { color: colors.textSecondary }]}>{vehicle.year}</Text>
        </View>

        <TextInput
          label="Versão / Motor"
          value={version}
          onChangeText={setVersion}
          placeholder="Ex: 1.0 Turbo Flex"
          autoCapitalize="words"
        />
        <TextInput
          label="Placa"
          value={plate}
          onChangeText={t => setPlate(t.toUpperCase())}
          placeholder="ABC-1234"
          autoCapitalize="characters"
        />
        <TextInput
          label="Apelido"
          value={nickname}
          onChangeText={setNickname}
          placeholder="Ex: Meu Carro"
          autoCapitalize="words"
        />
        <TextInput
          label="Hodômetro atual (km)"
          value={currentKm}
          onChangeText={t => setCurrentKm(t.replace(/[^0-9]/g, ""))}
          placeholder="Ex: 45000"
          keyboardType="number-pad"
        />

        <View style={styles.sectionHeader}>
          <Bell size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Lembretes de Manutenção
          </Text>
        </View>
        <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
          Receba notificações quando for hora de verificar cada fluido. Defina o intervalo em dias
          e/ou quilômetros.
        </Text>

        {FLUID_TYPES.map(fluid => {
          const rem = schedule[fluid];
          const historySource = historyDates[fluid];
          const daysLeft = rem.enabled ? getDaysUntilDue(rem, parsedKm) : null;

          return (
            <View
              key={fluid}
              style={[
                styles.reminderCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: rem.enabled ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.reminderRow}>
                <View
                  style={[
                    styles.fluidIcon,
                    {
                      backgroundColor: rem.enabled ? colors.primaryLight : colors.border,
                    },
                  ]}
                >
                  <Icon
                    name={FLUID_ICONS[fluid] as IconName}
                    size={16}
                    color={rem.enabled ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={styles.reminderLabel}>
                  <Text style={[styles.fluidName, { color: colors.textPrimary }]}>
                    {FLUID_LABELS[fluid]}
                  </Text>
                  {rem.enabled && daysLeft !== null && (
                    <Text
                      style={[
                        styles.dueLabel,
                        {
                          color:
                            daysLeft < 0
                              ? colors.danger
                              : daysLeft <= 14
                              ? colors.warning
                              : colors.success,
                        },
                      ]}
                    >
                      {daysLeft < 0
                        ? "Vencido"
                        : daysLeft === 0
                        ? "Hoje"
                        : `${daysLeft}d restantes`}
                    </Text>
                  )}
                </View>
                <Switch
                  value={rem.enabled}
                  onValueChange={v => toggleReminder(fluid, v)}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={rem.enabled ? colors.primary : colors.textSecondary}
                  testID={`switch-${fluid}`}
                />
              </View>

              {rem.enabled && (
                <View style={[styles.reminderDetails, { borderTopColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Intervalo (dias)
                    </Text>
                    <RNTextInput
                      style={[
                        styles.detailInput,
                        {
                          color: colors.textPrimary,
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                      value={rem.intervalDays ? String(rem.intervalDays) : ""}
                      onChangeText={t => updateIntervalDays(fluid, t)}
                      keyboardType="number-pad"
                      maxLength={5}
                      placeholder="—"
                      placeholderTextColor={colors.textSecondary}
                      testID={`interval-days-${fluid}`}
                    />
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Intervalo (km)
                    </Text>
                    <RNTextInput
                      style={[
                        styles.detailInput,
                        {
                          color: colors.textPrimary,
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                      value={rem.intervalKm ? String(rem.intervalKm) : ""}
                      onChangeText={t => updateIntervalKm(fluid, t)}
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholder="—"
                      placeholderTextColor={colors.textSecondary}
                      testID={`interval-km-${fluid}`}
                    />
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Hodômetro na revisão (km)
                    </Text>
                    <RNTextInput
                      style={[
                        styles.detailInput,
                        {
                          color: colors.textPrimary,
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                      value={rem.lastServiceOdometer ? String(rem.lastServiceOdometer) : ""}
                      onChangeText={t => updateLastServiceOdometer(fluid, t)}
                      keyboardType="number-pad"
                      maxLength={7}
                      placeholder={parsedKm ? String(parsedKm) : "—"}
                      placeholderTextColor={colors.textSecondary}
                      testID={`last-odometer-${fluid}`}
                    />
                  </View>
                  <View style={styles.detailRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Última revisão
                      </Text>
                      {historySource && (
                        <Text style={[styles.historyHint, { color: colors.success }]}>
                          ✓ Histórico: {new Date(historySource).toLocaleDateString("pt-BR")}
                        </Text>
                      )}
                    </View>
                    <RNTextInput
                      style={[
                        styles.detailInput,
                        {
                          color: colors.textPrimary,
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                      value={rem.lastServiceDate}
                      onChangeText={t => updateLastService(fluid, t)}
                      placeholder="AAAA-MM-DD"
                      maxLength={10}
                      testID={`last-service-${fluid}`}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ marginTop: spacing.lg }}>
          <Button
            title={loading ? "Salvando…" : "Atualizar"}
            onPress={handleSave}
            fullWidth
            loading={loading}
            disabled={loading || showToast}
          />
        </View>

        <TouchableOpacity
          onPress={handleDelete}
          style={[styles.deleteBtn, { borderColor: colors.danger }]}
          activeOpacity={0.75}
          testID="delete-vehicle-btn"
        >
          <Trash2 size={16} color={colors.danger} />
          <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Excluir Veículo</Text>
        </TouchableOpacity>
      </ScrollView>

      <Toast
        visible={showToast}
        message="Veículo atualizado com sucesso"
        duration={1800}
        onHide={() => { setShowToast(false); router.back(); }}
      />
      <Toast
        type="error"
        visible={showErrorToast}
        message={errorToastMessage}
        duration={3000}
        onHide={() => setShowErrorToast(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    justifyContent: "space-between",
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  content: { padding: spacing.xl },
  photoBox: {
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  photoPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  photoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  vehicleInfo: { borderRadius: 12, borderWidth: 1, padding: spacing.md, marginBottom: spacing.lg },
  vehicleName: { fontSize: 18, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  vehicleYear: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  sectionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: spacing.md, lineHeight: 18 },
  reminderCard: { borderRadius: 12, borderWidth: 1, marginBottom: spacing.sm, overflow: "hidden" },
  reminderRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.sm },
  fluidIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  reminderLabel: { flex: 1 },
  fluidName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  dueLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  reminderDetails: { borderTopWidth: 1, padding: spacing.md, gap: spacing.sm },
  detailRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  detailLabel: { fontSize: 13, fontFamily: "Inter_400Regular", paddingTop: 8 },
  historyHint: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  detailInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minWidth: 120,
    textAlign: "right",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  deleteBtnText: { fontSize: 16, fontFamily: "Inter_500Medium" },
});
