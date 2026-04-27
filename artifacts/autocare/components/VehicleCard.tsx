import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FluidStatus, Vehicle } from "@/store/vehicleStore";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./ui/StatusBadge";
import spacing from "@/constants/spacing";

interface VehicleCardProps {
  vehicle: Vehicle;
  onPress: () => void;
  onLongPress: () => void;
  onScanPress: () => void;
}

const FLUID_COLORS: Record<FluidStatus, string> = {
  ok: "#059669",
  warning: "#D97706",
  critical: "#DC2626",
};

export function VehicleCard({ vehicle, onPress, onLongPress, onScanPress }: VehicleCardProps) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const status = vehicle.overallStatus ?? "ok";

  useEffect(() => {
    if (status === "critical") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [status]);

  const borderColor =
    status === "critical"
      ? colors.danger
      : status === "warning"
        ? colors.warning
        : colors.border;

  const oilFluid = vehicle.fluids?.find(f => f.type === "oil");
  const brakeFluid = vehicle.fluids?.find(f => f.type === "brake");
  const coolantFluid = vehicle.fluids?.find(f => f.type === "coolant");

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor },
      ]}
    >
      <View style={styles.topRow}>
        {vehicle.photoUri ? (
          <Image source={{ uri: vehicle.photoUri }} style={[styles.thumbnail, { borderColor: colors.border }]} />
        ) : (
          <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="truck" size={22} color={colors.textSecondary} />
          </View>
        )}
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {vehicle.year} · {vehicle.version}
          </Text>
          <Text style={[styles.name, { color: colors.textPrimary }]}>
            {vehicle.nickname ?? `${vehicle.make} ${vehicle.model}`}
          </Text>
          <Text style={[styles.plate, { color: colors.textSecondary }]}>{vehicle.plate}</Text>
        </View>
        <StatusBadge status={status} />
      </View>

      {vehicle.fluids && vehicle.fluids.length > 0 && (
        <View style={styles.gaugesRow}>
          {[
            { label: "Óleo", fluid: oilFluid },
            { label: "Freio", fluid: brakeFluid },
            { label: "Arref.", fluid: coolantFluid },
          ].map(({ label, fluid }) => (
            <View key={label} style={[styles.gauge, { backgroundColor: colors.surface }]}>
              <Text style={[styles.gaugeLabel, { color: colors.textSecondary }]}>{label}</Text>
              <Text
                style={[
                  styles.gaugePct,
                  {
                    color: fluid
                      ? FLUID_COLORS[fluid.status]
                      : colors.textSecondary,
                  },
                ]}
              >
                {fluid ? `${fluid.levelPct}%` : "—"}
              </Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        onPress={onScanPress}
        style={[styles.ctaBanner, { backgroundColor: colors.primaryLight }]}
        activeOpacity={0.8}
      >
        <Feather name="camera" size={14} color={colors.primary} />
        <Text style={[styles.ctaText, { color: colors.primary }]}>Escanear motor agora →</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    resizeMode: "cover",
  },
  thumbnailPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  name: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  plate: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  gaugesRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  gauge: {
    flex: 1,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: "center",
  },
  gaugeLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  gaugePct: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  ctaBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
});
