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
import { FluidType, useVehicleStore } from "@/store/vehicleStore";
import { useChatStore } from "@/store/chatStore";
import { useColors } from "@/hooks/useColors";
import { OfflineBanner } from "@/components/OfflineBanner";
import { FluidCard } from "@/components/FluidCard";
import spacing from "@/constants/spacing";

export default function DiagnosticScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const { getVehicle } = useVehicleStore();
  const { startConversation } = useChatStore();

  const vehicle = getVehicle(vehicleId ?? "v1");
  const fluids = vehicle?.fluids ?? [];

  const scanDate = new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  function handleGuide(fluidType: FluidType) {
    router.push({ pathname: "/guide/[fluidType]", params: { fluidType } });
  }

  function handleChat() {
    const criticals = fluids.filter(f => f.status === "critical").length;
    const warnings = fluids.filter(f => f.status === "warning").length;
    const vName = vehicle ? `${vehicle.make} ${vehicle.model}` : "meu veículo";
    const msg = criticals > 0
      ? `Olá! Analisei meu ${vName} e detectei ${criticals} fluido(s) em nível crítico. Preciso de ajuda urgente!`
      : warnings > 0
        ? `Olá! Analisei meu ${vName} e tenho ${warnings} fluido(s) que precisam de atenção. Pode me orientar?`
        : `Olá! Acabei de escanear meu ${vName}. Tudo parece OK, mas tenho algumas perguntas.`;

    startConversation(vehicle?.id, vName, msg);
    router.push("/(tabs)/chat");
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, {
        borderBottomColor: colors.border,
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Diagnóstico</Text>
          {vehicle && (
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {vehicle.make} {vehicle.model} · {vehicle.version}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Feather name="share-2" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <OfflineBanner />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.scanDate, { color: colors.textSecondary }]}>Escaneado em: {scanDate}</Text>

        {fluids.length === 0 ? (
          <View style={styles.emptyFluids}>
            <Feather name="alert-circle" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum dado de fluido disponível. Realize um scan do motor.
            </Text>
            <TouchableOpacity
              style={[styles.scanBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push({ pathname: "/(tabs)/scan", params: { vehicleId: vehicleId ?? "v1" } })}
            >
              <Text style={styles.scanBtnText}>Escanear agora</Text>
            </TouchableOpacity>
          </View>
        ) : (
          fluids.map(fluid => (
            <FluidCard key={fluid.type} fluid={fluid} onGuidePress={() => handleGuide(fluid.type)} />
          ))
        )}
      </ScrollView>

      <View style={[styles.fabRow, {
        bottom: insets.bottom + spacing.md + (Platform.OS === "web" ? 34 : 0),
        paddingHorizontal: spacing.xl,
      }]}>
        <TouchableOpacity
          onPress={handleChat}
          style={[styles.chatFab, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          testID="chat-specialist-btn"
        >
          <Feather name="message-circle" size={20} color="#fff" />
          <Text style={styles.chatFabText}>Perguntar ao Especialista IA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "flex-end",
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  scanDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: spacing.md, textAlign: "right" },
  emptyFluids: { alignItems: "center", paddingTop: 60, gap: spacing.md },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  scanBtn: { paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: 12 },
  scanBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  fabRow: { position: "absolute", left: 0, right: 0 },
  chatFab: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, height: 52, borderRadius: 26,
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4,
  },
  chatFabText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
});
