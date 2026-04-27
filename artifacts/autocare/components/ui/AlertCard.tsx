import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";

type AlertType = "danger" | "warning" | "info";

interface AlertCardProps {
  message: string;
  type?: AlertType;
}

export function AlertCard({ message, type = "danger" }: AlertCardProps) {
  const colors = useColors();

  const bg = type === "danger" ? colors.dangerLight : type === "warning" ? colors.warningLight : colors.primaryLight;
  const iconColor = type === "danger" ? colors.danger : type === "warning" ? colors.warning : colors.primary;
  const iconName = type === "danger" ? "alert-circle" : type === "warning" ? "alert-triangle" : "info";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Feather name={iconName} size={18} color={iconColor} />
      <Text style={[styles.text, { color: iconColor }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.md,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
