import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FluidReading, FluidType } from "@/store/vehicleStore";
import { useColors } from "@/hooks/useColors";
import { FluidLevelBar } from "./ui/FluidLevelBar";
import { StatusBadge } from "./ui/StatusBadge";
import spacing from "@/constants/spacing";

interface FluidCardProps {
  fluid: FluidReading;
  onGuidePress: () => void;
}

const FLUID_NAMES: Record<FluidType, string> = {
  oil: "Óleo do Motor",
  coolant: "Líq. de Arrefecimento",
  brake: "Fluido de Freio",
  power: "Fluido de Direção",
  washer: "Água do Limpador",
  battery: "Bateria",
};

const FLUID_ICONS: Record<FluidType, string> = {
  oil: "droplet",
  coolant: "thermometer",
  brake: "disc",
  power: "settings",
  washer: "wind",
  battery: "battery",
};

export function FluidCard({ fluid, onGuidePress }: FluidCardProps) {
  const colors = useColors();

  const borderColor =
    fluid.status === "ok"
      ? colors.success
      : fluid.status === "warning"
        ? colors.warning
        : colors.danger;

  const iconBg =
    fluid.status === "ok"
      ? colors.successLight
      : fluid.status === "warning"
        ? colors.warningLight
        : colors.dangerLight;

  const iconColor =
    fluid.status === "ok"
      ? colors.success
      : fluid.status === "warning"
        ? colors.warning
        : colors.danger;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor }]}>
      <View style={styles.header}>
        <View style={styles.leftRow}>
          <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
            <Feather name={FLUID_ICONS[fluid.type] as any} size={20} color={iconColor} />
          </View>
          <View>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{FLUID_NAMES[fluid.type]}</Text>
            <Text style={[styles.level, { color: iconColor }]}>
              Nível: {fluid.levelPct}% ·{" "}
              {fluid.status === "ok" ? "OK" : fluid.status === "warning" ? "Baixo" : "Crítico"}
            </Text>
          </View>
        </View>
        <StatusBadge status={fluid.status} />
      </View>

      <FluidLevelBar levelPct={fluid.levelPct} status={fluid.status} />

      {fluid.spec && (
        <View style={[styles.specBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.specText, { color: colors.textSecondary }]}>
            {fluid.spec}
            {fluid.amountLiters ? ` · Adicionar ${fluid.amountLiters}L` : ""}
          </Text>
        </View>
      )}

      {fluid.status !== "ok" && (
        <TouchableOpacity
          onPress={onGuidePress}
          style={[styles.guideBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          activeOpacity={0.8}
        >
          <Feather name="play-circle" size={16} color={colors.primary} />
          <Text style={[styles.guideBtnText, { color: colors.primary }]}>Ver guia animado</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  level: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  specBox: {
    padding: 10,
    borderRadius: 10,
  },
  specText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  guideBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
  },
  guideBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
});
