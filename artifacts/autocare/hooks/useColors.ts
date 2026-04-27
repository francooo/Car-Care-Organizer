import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

export type ColorPalette = typeof colors.light & { radius: number };

export function useColors(): ColorPalette {
  const scheme = useColorScheme();
  const palette = scheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
