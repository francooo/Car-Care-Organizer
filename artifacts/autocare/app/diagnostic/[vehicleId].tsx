import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FluidType, useVehicles } from "@/context/VehicleContext";
import { useChat } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";
import { FluidCard } from "@/components/FluidCard";
import spacing from "@/constants/spacing";

export default function DiagnosticScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const { getVehicle } = useVehicles();
  const { startConversation } = useChat();

  const vehicle = getVehicle(vehicleId ?? "v1");
  const fluids = vehicle?.fluids ?? [];
  const scanDate = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleGuidePress(fluidType: FluidType) {
    router.push({ pathname: "/guide/[fluidType]", params: { fluidType } });
  }

  function handleChatPress() {
    const criticals = fluids.filter(f => f.status === "critical");
    const warnings = fluids.filter(f => f.status === "warning");
    const message = criticals.length > 0
      ? `Olá! Analisei seu ${vehicle?.make} ${vehicle?.model}. Detectei ${criticals.length} fluido(s) em nível crítico. Preciso de orientações urgentes!`
      : warnings.length > 0
        ? `Olá! Analisei seu ${vehicle?.make} ${vehicle?.model}. Tenho ${warnings.length} fluido(s) que precisam de atenção. Pode me orientar?`
        : `Olá! Acabei de escanear meu ${vehicle?.make} ${vehicle?.model}. Tudo parece OK, mas tenho algumas perguntas.`;

    startConversation(vehicle?.id, `${vehicle?.make} ${vehicle?.model}`, message);
    router.push("/(tabs)/chat");
  }

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
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Diagnóstico</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.version}` : "Veículo"}
          </Text>
        </View>
        <TouchableOpacity style={styles.shareBtn}>
          <Feather name="share-2" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.scanDate, { color: colors.textSecondary }]}>
          Escaneado em: {scanDate}
        </Text>

        {fluids.map((fluid) => (
          <FluidCard
            key={fluid.type}
            fluid={fluid}
            onGuidePress={() => handleGuidePress(fluid.type)}
          />
        ))}
      </ScrollView>

      <View
        style={[
          styles.fabRow,
          {
            bottom: insets.bottom + spacing.md + (Platform.OS === "web" ? 34 : 0),
            paddingHorizontal: spacing.xl,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleChatPress}
          style={[styles.chatFab, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Feather name="message-circle" size={20} color="#fff" />
          <Text style={styles.chatFabText}>Perguntar ao especialista IA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  shareBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  scanDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: spacing.md,
    textAlign: "right",
  },
  fabRow: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  chatFab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 52,
    borderRadius: 26,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  chatFabText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
});
