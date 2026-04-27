import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVehicleStore } from "@/store/vehicleStore";
import { useColors } from "@/hooks/useColors";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import spacing from "@/constants/spacing";

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
const YEARS = Array.from({ length: new Date().getFullYear() - 1989 + 2 }, (_, i) => (new Date().getFullYear() + 1 - i).toString());

function PickerSheet({
  visible, title, options, onSelect, onClose, colors,
}: {
  visible: boolean; title: string; options: string[];
  onSelect: (v: string) => void; onClose: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  if (!visible) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 200, backgroundColor: "rgba(0,0,0,0.5)" }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[pickerS.sheet, { backgroundColor: colors.background }]}>
        <Text style={[pickerS.title, { color: colors.textPrimary }]}>{title}</Text>
        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          {options.map(opt => (
            <TouchableOpacity key={opt} onPress={() => { onSelect(opt); onClose(); }} style={[pickerS.opt, { borderBottomColor: colors.border }]}>
              <Text style={[pickerS.optText, { color: colors.textPrimary }]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={onClose} style={[pickerS.cancel, { backgroundColor: colors.surface }]}>
          <Text style={[pickerS.cancelText, { color: colors.textSecondary }]}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AddVehicleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addVehicle } = useVehicleStore();

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [version, setVersion] = useState("");
  const [plate, setPlate] = useState("");
  const [nickname, setNickname] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [showMake, setShowMake] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [showYear, setShowYear] = useState(false);

  const isValid = make.length > 0 && model.length > 0 && year.length > 0 && version.length > 0 && plate.length >= 7;

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  }

  async function handleSave() {
    if (!isValid) return;
    setLoading(true);
    try {
      await addVehicle({ make, model, year: parseInt(year, 10), version, plate, nickname: nickname || undefined, photoUri, overallStatus: "ok", fluids: [] });
      router.back();
    } catch {
      Alert.alert("Erro", "Não foi possível salvar o veículo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Adicionar Veículo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) }]} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={pickPhoto} style={[styles.photoBox, { borderColor: colors.border, backgroundColor: colors.surface }]} activeOpacity={0.8}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <>
              <Feather name="camera" size={28} color={colors.textSecondary} />
              <Text style={[styles.photoLabel, { color: colors.textSecondary }]}>Adicionar foto do veículo</Text>
            </>
          )}
        </TouchableOpacity>

        {[
          { label: "Marca", val: make, placeholder: "Selecione a marca", onPress: () => setShowMake(true) },
          { label: "Modelo", val: model, placeholder: "Selecione o modelo", onPress: () => make ? setShowModel(true) : null, disabled: !make },
          { label: "Ano", val: year, placeholder: "Selecione o ano", onPress: () => setShowYear(true) },
        ].map(({ label, val, placeholder, onPress, disabled }) => (
          <TouchableOpacity key={label} onPress={onPress} style={[styles.picker, { borderColor: colors.border, backgroundColor: colors.surface, opacity: disabled ? 0.5 : 1 }]} activeOpacity={0.8}>
            <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.pickerValue, { color: val ? colors.textPrimary : colors.textSecondary }]}>
              {val || placeholder}
            </Text>
            <Feather name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}

        <TextInput label="Versão / Motor" value={version} onChangeText={setVersion} placeholder="Ex: 1.0 Turbo Flex" autoCapitalize="words" />
        <TextInput label="Placa" value={plate} onChangeText={t => setPlate(t.toUpperCase())} placeholder="ABC-1234 ou ABC-1D23" autoCapitalize="characters" />
        <TextInput label="Apelido (opcional)" value={nickname} onChangeText={setNickname} placeholder="Ex: Meu Onix" autoCapitalize="words" />

        <View style={{ marginTop: spacing.sm }}>
          <Button title={loading ? "Salvando…" : "Salvar Veículo"} onPress={handleSave} fullWidth loading={loading} disabled={!isValid || loading} />
        </View>
      </ScrollView>

      <PickerSheet visible={showMake} title="Selecione a Marca" options={MAKES} onSelect={v => { setMake(v); setModel(""); }} onClose={() => setShowMake(false)} colors={colors} />
      <PickerSheet visible={showModel} title="Selecione o Modelo" options={MODELS_BY_MAKE[make] ?? []} onSelect={setModel} onClose={() => setShowModel(false)} colors={colors} />
      <PickerSheet visible={showYear} title="Selecione o Ano" options={YEARS} onSelect={setYear} onClose={() => setShowYear(false)} colors={colors} />
    </View>
  );
}

const pickerS = StyleSheet.create({
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold", fontWeight: "600", marginBottom: spacing.sm },
  opt: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  optText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  cancel: { marginTop: spacing.sm, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 16, fontFamily: "Inter_500Medium" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, justifyContent: "space-between" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  content: { padding: spacing.xl },
  photoBox: { height: 120, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginBottom: spacing.md, overflow: "hidden" },
  photoPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  photoLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  picker: { height: 52, borderRadius: 10, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, marginBottom: spacing.md },
  pickerLabel: { fontSize: 12, fontFamily: "Inter_500Medium", width: 55 },
  pickerValue: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
});
