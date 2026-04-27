import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  small = false,
}: ButtonProps) {
  const colors = useColors();

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  const bgColor =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.danger
        : variant === "secondary"
          ? colors.surface
          : "transparent";

  const textColor =
    variant === "primary" || variant === "danger"
      ? "#FFFFFF"
      : variant === "ghost"
        ? colors.primary
        : colors.textPrimary;

  const borderColor =
    variant === "secondary" ? colors.border : "transparent";

  return (
    <TouchableOpacity
      onPress={disabled || loading ? undefined : handlePress}
      disabled={disabled || loading}
      accessibilityState={{ disabled: disabled || loading }}
      aria-disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        small && styles.small,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === "secondary" ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, small && styles.textSmall, { color: textColor }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  small: {
    height: 36,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
  },
  fullWidth: {
    width: "100%",
  },
  text: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  textSmall: {
    fontSize: 14,
  },
});
