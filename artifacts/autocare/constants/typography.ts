import { TextStyle } from "react-native";

export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 40,
  },
  heading1: {
    fontSize: 24,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 32,
  },
  heading2: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 28,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: "400",
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: "400",
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
    lineHeight: 16,
  },
  micro: {
    fontSize: 10,
    fontWeight: "400",
    fontFamily: "Inter_400Regular",
    lineHeight: 14,
  },
};

export default typography;
