import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const colors = useColors();

  if (!isOffline) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.danger }]}>
      <Feather name="wifi-off" size={14} color="#fff" />
      <Text style={styles.text}>Sem conexão – verifique sua internet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  text: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    flexShrink: 1,
  },
});
