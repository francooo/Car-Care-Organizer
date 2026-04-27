import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVehicles } from "@/context/VehicleContext";
import { useColors } from "@/hooks/useColors";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import spacing from "@/constants/spacing";
import { Feather } from "@expo/vector-icons";

const MAKES = ["Chevrolet", "Fiat", "Volkswagen", "Hyundai", "Toyota", "Renault", "Jeep", "Ford", "Honda", "Nissan", "Peugeot", "Citroën"];
const MODELS_BY_MAKE: Record<string, string[]> = {
  Chevrolet: ["Onix", "Tracker", "Spin", "Equinox", "S10", "Cruze"],
  Fiat: ["Argo", "Pulse", "Toro", "Strada", "Cronos", "Mobi"],
  Volkswagen: ["Gol", "Polo", "T-Cross", "Nivus", "Virtus", "Saveiro"],
  Hyundai: ["HB20", "Creta", "Tucson", "Santa Fe", "HB20S"],
  Toyota: ["Corolla", "Hilux", "Yaris", "RAV4", "SW4"],
  Renault: ["Kwid", "Sandero", "Duster", "Logan", "Oroch"],
  Jeep: ["Renegade", "Compass", "Commander"],
  Ford: ["Ka", "EcoSport", "Ranger", "Territory"],
  Honda: ["Civic", "HR-V", "City", "Fit", "WR-V"],
  Nissan: ["Kicks", "Frontier", "Versa"],
  Peugeot: ["208", "2008", "3008"],
  Citroën: ["C3", "C4 Cactus", "Jumpy"],
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1989 + 2 }, (_, i) => (CURRENT_YEAR + 1 - i).toString());

export default function AddVehicleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addVehicle } = useVehicles();

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [version, setVersion] = useState("");
  const [plate, setPlate] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMakePicker, setShowMakePicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  function isFormValid() {
    return make.length > 0 && model.length > 0 && year.length > 0 && version.length > 0 && plate.length >= 7;
  }

  async function handleSave() {
    if (!isFormValid()) return;
    setLoading(true);
    try {
      await addVehicle({
        make,
        model,
        year: parseInt(year, 10),
        version,
        plate,
        nickname: nickname || undefined,
        overallStatus: "ok",
        fluids: [],
      });
      router.back();
    } catch {
      Alert.alert("Erro", "Não foi possível salvar o veículo.");
    } finally {
      setLoading(false);
    }
  }

  function PickerModal({
    visible,
    options,
    onSelect,
    onClose,
    title,
  }: { visible: boolean; options: string[]; onSelect: (v: string) => void; onClose: () => void; title: string }) {
    if (!visible) return null;
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100 }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[pickerStyles.sheet, { backgroundColor: colors.background }]}>
          <Text style={[pickerStyles.title, { color: colors.textPrimary }]}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {options.map(opt => (
              <TouchableOpacity
                key={opt}
                onPress={() => { onSelect(opt); onClose(); }}
                style={[pickerStyles.option, { borderBottomColor: colors.border }]}
              >
                <Text style={[pickerStyles.optionText, { color: colors.textPrimary }]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={[pickerStyles.cancelBtn, { backgroundColor: colors.surface }]}>
            <Text style={[pickerStyles.cancelText, { color: colors.textSecondary }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Adicionar Veículo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => setShowMakePicker(true)}
          style={[styles.picker, { borderColor: colors.border, backgroundColor: colors.surface }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Marca</Text>
          <Text style={[styles.pickerValue, { color: make ? colors.textPrimary : colors.textSecondary }]}>
            {make || "Selecione a marca"}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => make ? setShowModelPicker(true) : null}
          style={[styles.picker, { borderColor: colors.border, backgroundColor: colors.surface, opacity: make ? 1 : 0.5 }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Modelo</Text>
          <Text style={[styles.pickerValue, { color: model ? colors.textPrimary : colors.textSecondary }]}>
            {model || "Selecione o modelo"}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowYearPicker(true)}
          style={[styles.picker, { borderColor: colors.border, backgroundColor: colors.surface }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Ano</Text>
          <Text style={[styles.pickerValue, { color: year ? colors.textPrimary : colors.textSecondary }]}>
            {year || "Selecione o ano"}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

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
          onChangeText={(t) => setPlate(t.toUpperCase())}
          placeholder="ABC-1234 ou ABC-1D23"
          autoCapitalize="characters"
        />

        <TextInput
          label="Apelido (opcional)"
          value={nickname}
          onChangeText={setNickname}
          placeholder="Ex: Meu Onix"
          autoCapitalize="words"
        />

        <View style={{ marginTop: spacing.sm }}>
          <Button
            title={loading ? "Salvando…" : "Salvar Veículo"}
            onPress={handleSave}
            fullWidth
            loading={loading}
            disabled={!isFormValid() || loading}
          />
        </View>
      </ScrollView>

      <PickerModal
        visible={showMakePicker}
        title="Selecione a Marca"
        options={MAKES}
        onSelect={(v) => { setMake(v); setModel(""); }}
        onClose={() => setShowMakePicker(false)}
      />
      <PickerModal
        visible={showModelPicker}
        title="Selecione o Modelo"
        options={MODELS_BY_MAKE[make] ?? []}
        onSelect={setModel}
        onClose={() => setShowModelPicker(false)}
      />
      <PickerModal
        visible={showYearPicker}
        title="Selecione o Ano"
        options={YEARS}
        onSelect={setYear}
        onClose={() => setShowYearPicker(false)}
      />
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  option: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  cancelBtn: {
    marginTop: spacing.sm,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
});

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
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  content: {
    padding: spacing.xl,
    gap: 0,
  },
  picker: {
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  pickerLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    width: 55,
  },
  pickerValue: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
});
