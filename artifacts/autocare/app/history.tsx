import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FluidType } from "@/context/VehicleContext";
import { MaintenanceRecord, MaintenanceStatus, useHistory } from "@/context/HistoryContext";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";

const FILTER_OPTIONS: { label: string; value: FluidType | "all" }[] = [
  { label: "Todos", value: "all" },
  { label: "Óleo", value: "oil" },
  { label: "Freio", value: "brake" },
  { label: "Arref.", value: "coolant" },
  { label: "Direção", value: "power" },
  { label: "Limpador", value: "washer" },
];

const FLUID_LABELS: Record<FluidType, string> = {
  oil: "Óleo",
  coolant: "Arrefec.",
  brake: "Freio",
  power: "Direção",
  washer: "Limpador",
  battery: "Bateria",
};

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  completed: "Concluído",
  partial: "Parcial",
  scan_only: "Apenas scan",
};

const STATUS_COLORS: Record<MaintenanceStatus, "success" | "warning" | "textSecondary"> = {
  completed: "success",
  partial: "warning",
  scan_only: "textSecondary",
};

function HistoryItem({ record, colors }: { record: MaintenanceRecord; colors: any }) {
  const date = new Date(record.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const statusKey = STATUS_COLORS[record.status];

  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.8}
    >
      <View style={styles.itemLeft}>
        <Text style={[styles.itemDate, { color: colors.textSecondary }]}>{date}</Text>
        <Text style={[styles.itemVehicle, { color: colors.textPrimary }]}>
          {record.vehicleName}
        </Text>
        <Text style={[styles.itemPlate, { color: colors.textSecondary }]}>{record.vehiclePlate}</Text>
        <View style={styles.fluidTags}>
          {record.fluidsHandled.map(f => (
            <View key={f} style={[styles.fluidTag, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.fluidTagText, { color: colors.primary }]}>{FLUID_LABELS[f]}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.itemRight}>
        <View style={[styles.statusPill, { backgroundColor: record.status === "completed" ? colors.successLight : record.status === "partial" ? colors.warningLight : colors.surface }]}>
          <Text style={[styles.statusText, { color: colors[statusKey] ?? colors.textSecondary }]}>
            {STATUS_LABELS[record.status]}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { records } = useHistory();
  const [filter, setFilter] = useState<FluidType | "all">("all");

  const filtered = filter === "all"
    ? records
    : records.filter(r => r.fluidsHandled.includes(filter as FluidType));

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Histórico</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.filters, { borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          data={FILTER_OPTIONS}
          keyExtractor={f => f.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setFilter(item.value)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === item.value ? colors.primary : colors.surface,
                  borderColor: filter === item.value ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, { color: filter === item.value ? "#fff" : colors.textSecondary }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="clock" size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nenhuma manutenção registrada</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Faça seu primeiro scan para registrar uma manutenção.
            </Text>
            <TouchableOpacity
              style={[styles.scanBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/(tabs)/scan")}
              activeOpacity={0.85}
            >
              <Text style={styles.scanBtnText}>Escanear agora</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => <HistoryItem record={item} colors={colors} />}
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
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  filters: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  list: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  item: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  itemLeft: {
    flex: 1,
    gap: 3,
  },
  itemDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  itemVehicle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  itemPlate: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  fluidTags: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
    marginTop: 4,
  },
  fluidTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  fluidTagText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  itemRight: {
    alignItems: "center",
    gap: spacing.xs,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  scanBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: 12,
  },
  scanBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
});
