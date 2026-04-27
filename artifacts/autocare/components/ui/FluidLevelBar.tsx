import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { FluidStatus } from "@/context/VehicleContext";
import { useColors } from "@/hooks/useColors";

interface FluidLevelBarProps {
  levelPct: number;
  status: FluidStatus;
  showLabel?: boolean;
}

export function FluidLevelBar({ levelPct, status, showLabel = true }: FluidLevelBarProps) {
  const colors = useColors();
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animWidth, {
      toValue: Math.min(levelPct / 100, 1),
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [levelPct]);

  const fillColor =
    status === "ok"
      ? colors.success
      : status === "warning"
        ? colors.warning
        : colors.danger;

  return (
    <View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: fillColor,
              width: animWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {levelPct}% •{" "}
          {status === "ok" ? "Nível Normal" : status === "warning" ? "Verificar" : "Urgente!"}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 5,
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
});
