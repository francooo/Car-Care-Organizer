import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { FluidStatus } from "@/context/VehicleContext";
import { useColors } from "@/hooks/useColors";

interface StatusBadgeProps {
  status: FluidStatus;
}

const STATUS_LABELS: Record<FluidStatus, string> = {
  ok: "Tudo OK",
  warning: "Verificar",
  critical: "Urgente!",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = useColors();

  const bgColor =
    status === "ok"
      ? colors.successLight
      : status === "warning"
        ? colors.warningLight
        : colors.dangerLight;

  const textColor =
    status === "ok"
      ? colors.success
      : status === "warning"
        ? colors.warning
        : colors.danger;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 24,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
});
