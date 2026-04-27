import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FluidType } from "@/store/vehicleStore";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";

type MaintenanceStatus = "completed" | "partial" | "scan_only";

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string;
  fluidsHandled: FluidType[];
  status: MaintenanceStatus;
  createdAt: string;
}

const FLUID_LABELS: Record<FluidType, string> = {
  oil: "Óleo", coolant: "Arrefec.", brake: "Freio",
  power: "Direção", washer: "Limpador", battery: "Bateria",
};

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  completed: "Concluído", partial: "Parcial", scan_only: "Apenas scan",
};

const MOCK_HISTORY: MaintenanceRecord[] = [
  { id: "h1", vehicleId: "v1", vehicleName: "Chevrolet Onix", vehiclePlate: "ABC-1D23", fluidsHandled: ["oil", "washer"], status: "completed", createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "h2", vehicleId: "v2", vehicleName: "Hyundai HB20", vehiclePlate: "XYZ-4E56", fluidsHandled: ["oil"], status: "scan_only", createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
];

const FILTER_OPTIONS: { label: string; value: FluidType | "all" }[] = [
  { label: "Todos", value: "all" },
  { label: "Óleo", value: "oil" },
  { label: "Freio", value: "brake" },
  { label: "Arrefec.", value: "coolant" },
  { label: "Direção", value: "power" },
  { label: "Limpador", value: "washer" },
];

function groupByVehicleAndDate(records: MaintenanceRecord[]) {
  const groups: Record<string, MaintenanceRecord[]> = {};
  for (const r of records) {
    const date = new Date(r.createdAt).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    const key = `${r.vehicleName} — ${date}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

function RecordItem({ record, colors }: { record: MaintenanceRecord; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const time = new Date(record.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const bgStatus = record.status === "completed" ? colors.successLight : record.status === "partial" ? colors.warningLight : colors.surface;
  const textStatus = record.status === "completed" ? colors.success : record.status === "partial" ? colors.warning : colors.textSecondary;

  return (
    <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <View style={styles.itemRow}>
          <Text style={[styles.itemTime, { color: colors.textSecondary }]}>{time}</Text>
          <View style={[styles.statusPill, { backgroundColor: bgStatus }]}>
            <Text style={[styles.statusText, { color: textStatus }]}>{STATUS_LABELS[record.status]}</Text>
          </View>
        </View>
        <Text style={[styles.itemPlate, { color: colors.textSecondary }]}>{record.vehiclePlate}</Text>
        <View style={styles.fluidTags}>
          {record.fluidsHandled.map(f => (
            <View key={f} style={[styles.fluidTag, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.fluidTagText, { color: colors.primary }]}>{FLUID_LABELS[f]}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [filter, setFilter] = useState<FluidType | "all">("all");

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("@autocare:history");
        if (raw) { setRecords(JSON.parse(raw)); return; }
      } catch {}
      setRecords(MOCK_HISTORY);
    })();
  }, []);

  const filtered = filter === "all" ? records : records.filter(r => r.fluidsHandled.includes(filter as FluidType));
  const sections = groupByVehicleAndDate(filtered);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Histórico</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.filtersRow, { borderBottomColor: colors.border }]}>
        <FlatList
          horizontal data={FILTER_OPTIONS} keyExtractor={f => f.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setFilter(item.value)}
              style={[styles.filterChip, {
                backgroundColor: filter === item.value ? colors.primary : colors.surface,
                borderColor: filter === item.value ? colors.primary : colors.border,
              }]}
            >
              <Text style={[styles.filterChipText, { color: filter === item.value ? "#fff" : colors.textSecondary }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="clock" size={64} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nenhuma manutenção registrada</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Faça um scan para registrar uma manutenção.</Text>
          <TouchableOpacity style={[styles.scanBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(tabs)/scan")}>
            <Text style={styles.scanBtnText}>Escanear agora</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={r => r.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) }]}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => <RecordItem record={item} colors={colors} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, justifyContent: "space-between" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  filtersRow: { paddingVertical: spacing.sm, borderBottomWidth: 1 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { paddingHorizontal: spacing.md },
  sectionHeader: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", fontWeight: "600", textTransform: "capitalize" },
  item: { borderRadius: 12, borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  itemTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  itemPlate: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  fluidTags: { flexDirection: "row", gap: 4, flexWrap: "wrap", marginTop: 6 },
  fluidTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  fluidTagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", fontWeight: "600", textAlign: "center" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  scanBtn: { paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: 12 },
  scanBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
});
