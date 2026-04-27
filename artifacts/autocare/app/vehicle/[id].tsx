import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
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
import { useVehicleStore, Vehicle, FluidType, MaintenanceReminder, MaintenanceSchedule } from "@/store/vehicleStore";
import { useColors } from "@/hooks/useColors";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import spacing from "@/constants/spacing";
import {
  FLUID_LABELS,
  FLUID_ICONS,
  DEFAULT_INTERVALS,
  applyMaintenanceSchedule,
  getDaysUntilDue,
  requestNotificationPermissions,
} from "@/lib/notifications";

const FLUID_TYPES: FluidType[] = ["oil", "coolant", "brake", "power", "washer", "battery"];

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function buildDefaultSchedule(existing?: MaintenanceSchedule): Record<FluidType, MaintenanceReminder> {
  const result = {} as Record<FluidType, MaintenanceReminder>;
  for (const f of FLUID_TYPES) {
    result[f] = existing?.[f] ?? {
      enabled: false,
      intervalDays: DEFAULT_INTERVALS[f],
      lastServiceDate: todayIso(),
    };
  }
  return result;
}

export default function EditVehicleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getVehicle, updateVehicle, deleteVehicle } = useVehicleStore();
  const vehicle = getVehicle(id ?? "");

  const [version, setVersion] = useState(vehicle?.version ?? "");
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [nickname, setNickname] = useState(vehicle?.nickname ?? "");
  const [photoUri, setPhotoUri] = useState<string | undefined>(vehicle?.photoUri);
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<Record<FluidType, MaintenanceReminder>>(
    () => buildDefaultSchedule(vehicle?.maintenanceSchedule)
  );

  if (!vehicle) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.textSecondary }}>Veículo não encontrado.</Text>
      </View>
    );
  }

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  }

  function toggleReminder(fluid: FluidType, value: boolean) {
    setSchedule(prev => ({
      ...prev,
      [fluid]: { ...prev[fluid], enabled: value },
    }));
  }

  function updateInterval(fluid: FluidType, text: string) {
    const n = parseInt(text.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(n) && n > 0) {
      setSchedule(prev => ({ ...prev, [fluid]: { ...prev[fluid], intervalDays: n } }));
    } else if (text === "") {
      setSchedule(prev => ({ ...prev, [fluid]: { ...prev[fluid], intervalDays: 0 } }));
    }
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
            "Ative as notificações nas configurações do sistema para receber lembretes de manutenção."
          );
        }
      }

      const updatedVehicle: Vehicle = { ...vehicle!, version, plate, nickname: nickname || undefined, photoUri };
      const finalSchedule = await applyMaintenanceSchedule(updatedVehicle, schedule);

      await updateVehicle(vehicle!.id, {
        version,
        plate,
        nickname: nickname || undefined,
        photoUri,
        maintenanceSchedule: finalSchedule,
      });
      router.back();
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar o veículo.");
    } finally {
      setLoading(false);
    }
  }

  function handleDelete() {
    Alert.alert("Excluir veículo?", `Tem certeza que deseja excluir ${vehicle?.make} ${vehicle?.model}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => { await deleteVehicle(vehicle!.id); router.replace("/(tabs)"); } },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Editar Veículo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 + (Platform.OS === "web" ? 34 : 0) }]}>
        <TouchableOpacity onPress={pickPhoto} style={[styles.photoBox, { borderColor: colors.border, backgroundColor: colors.surface }]} activeOpacity={0.8}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <>
              <Feather name="camera" size={24} color={colors.textSecondary} />
              <Text style={[styles.photoLabel, { color: colors.textSecondary }]}>Trocar foto do veículo</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={[styles.vehicleInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.vehicleName, { color: colors.textPrimary }]}>{vehicle.make} {vehicle.model}</Text>
          <Text style={[styles.vehicleYear, { color: colors.textSecondary }]}>{vehicle.year}</Text>
        </View>

        <TextInput label="Versão / Motor" value={version} onChangeText={setVersion} placeholder="Ex: 1.0 Turbo Flex" autoCapitalize="words" />
        <TextInput label="Placa" value={plate} onChangeText={t => setPlate(t.toUpperCase())} placeholder="ABC-1234" autoCapitalize="characters" />
        <TextInput label="Apelido" value={nickname} onChangeText={setNickname} placeholder="Ex: Meu Carro" autoCapitalize="words" />

        <View style={styles.sectionHeader}>
          <Feather name="bell" size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Lembretes de Manutenção</Text>
        </View>
        <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
          Receba notificações quando for hora de verificar cada fluido.
        </Text>

        {FLUID_TYPES.map(fluid => {
          const rem = schedule[fluid];
          const daysLeft = rem.enabled ? getDaysUntilDue(rem) : null;
          return (
            <View key={fluid} style={[styles.reminderCard, { backgroundColor: colors.surface, borderColor: rem.enabled ? colors.primary : colors.border }]}>
              <View style={styles.reminderRow}>
                <View style={[styles.fluidIcon, { backgroundColor: rem.enabled ? colors.primaryLight : colors.border }]}>
                  <Feather name={FLUID_ICONS[fluid] as keyof typeof Feather.glyphMap} size={16} color={rem.enabled ? colors.primary : colors.textSecondary} />
                </View>
                <View style={styles.reminderLabel}>
                  <Text style={[styles.fluidName, { color: colors.textPrimary }]}>{FLUID_LABELS[fluid]}</Text>
                  {rem.enabled && daysLeft !== null && (
                    <Text style={[styles.dueLabel, { color: daysLeft <= 7 ? colors.warning : daysLeft < 0 ? colors.danger : colors.success }]}>
                      {daysLeft < 0 ? "Vencido" : daysLeft === 0 ? "Hoje" : `${daysLeft}d restantes`}
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
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Intervalo (dias)</Text>
                    <RNTextInput
                      style={[styles.detailInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={rem.intervalDays > 0 ? String(rem.intervalDays) : ""}
                      onChangeText={t => updateInterval(fluid, t)}
                      keyboardType="number-pad"
                      maxLength={4}
                      testID={`interval-${fluid}`}
                    />
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Última revisão</Text>
                    <RNTextInput
                      style={[styles.detailInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
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
          <Button title={loading ? "Salvando…" : "Atualizar"} onPress={handleSave} fullWidth loading={loading} />
        </View>

        <TouchableOpacity onPress={handleDelete} style={[styles.deleteBtn, { borderColor: colors.danger }]} activeOpacity={0.75} testID="delete-vehicle-btn">
          <Feather name="trash-2" size={16} color={colors.danger} />
          <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Excluir Veículo</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, justifyContent: "space-between" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  content: { padding: spacing.xl },
  photoBox: { height: 100, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginBottom: spacing.md, overflow: "hidden" },
  photoPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  photoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  vehicleInfo: { borderRadius: 12, borderWidth: 1, padding: spacing.md, marginBottom: spacing.lg },
  vehicleName: { fontSize: 18, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  vehicleYear: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xs },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  sectionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: spacing.md, lineHeight: 18 },
  reminderCard: { borderRadius: 12, borderWidth: 1, marginBottom: spacing.sm, overflow: "hidden" },
  reminderRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.sm },
  fluidIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  reminderLabel: { flex: 1 },
  fluidName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  dueLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  reminderDetails: { borderTopWidth: 1, padding: spacing.md, gap: spacing.sm },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  detailLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  detailInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6, fontSize: 14, fontFamily: "Inter_400Regular", minWidth: 110, textAlign: "right" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 52, borderRadius: 12, borderWidth: 1, marginTop: spacing.md },
  deleteBtnText: { fontSize: 16, fontFamily: "Inter_500Medium" },
});
