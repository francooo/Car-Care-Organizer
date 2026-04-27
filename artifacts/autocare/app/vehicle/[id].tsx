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

  async function handleSave() {
    setLoading(true);
    try {
      await updateVehicle(vehicle!.id, { version, plate, nickname: nickname || undefined, photoUri });
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

        <Button title={loading ? "Salvando…" : "Atualizar"} onPress={handleSave} fullWidth loading={loading} />

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
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 52, borderRadius: 12, borderWidth: 1, marginTop: spacing.md },
  deleteBtnText: { fontSize: 16, fontFamily: "Inter_500Medium" },
});
