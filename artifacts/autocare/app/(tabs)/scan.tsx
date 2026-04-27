import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVehicles } from "@/context/VehicleContext";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";

type ScanState = "waiting" | "analyzing" | "detected";

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();
  const { vehicles } = useVehicles();
  const [scanState, setScanState] = useState<ScanState>("waiting");
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicleId ?? vehicles[0]?.id);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    scanLoop.start();
    return () => scanLoop.stop();
  }, []);

  useEffect(() => {
    if (scanState === "analyzing") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      setTimeout(() => {
        loop.stop();
        setScanState("detected");
      }, 3000);
    }
  }, [scanState]);

  async function handleGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setScanState("analyzing");
    }
  }

  function handleDiagnostic() {
    router.push({
      pathname: "/diagnostic/[vehicleId]",
      params: { vehicleId: selectedVehicleId ?? "v1" },
    });
  }

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.aiPill, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <Animated.View style={[styles.aiDot, { opacity: pulseAnim, backgroundColor: scanState === "analyzing" ? colors.success : "#6B7280" }]} />
          <Text style={styles.aiPillText}>
            {scanState === "analyzing" ? "IA analisando…" : scanState === "detected" ? "Detectado!" : "Aguardando motor"}
          </Text>
        </View>
        <TouchableOpacity style={[styles.vehicleDropdown, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <Feather name="chevron-down" size={14} color="#fff" />
          <Text style={styles.vehicleDropdownText} numberOfLines={1}>
            {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : "Selecionar"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.viewfinder}>
        <View style={[styles.cameraPlaceholder, { backgroundColor: "#111827" }]}>
          <Feather name="camera" size={64} color="#374151" />
          <Text style={styles.cameraPlaceholderText}>Aponte para o motor do veículo</Text>
        </View>

        <View style={styles.corners}>
          <View style={[styles.corner, styles.cornerTL, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: colors.primary }]} />
        </View>

        <Animated.View
          style={[
            styles.scanLine,
            { backgroundColor: colors.primary + "88" },
            {
              transform: [{
                translateY: scanLineAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 240],
                }),
              }],
            },
          ]}
        />

        {scanState === "detected" && (
          <>
            {[
              { top: "30%", left: "25%", status: "ok" as const },
              { top: "45%", left: "55%", status: "warning" as const },
              { top: "60%", left: "35%", status: "critical" as const },
            ].map((point, i) => (
              <View
                key={i}
                style={[
                  styles.detectionPoint,
                  {
                    top: point.top,
                    left: point.left,
                    backgroundColor:
                      point.status === "ok"
                        ? colors.success
                        : point.status === "warning"
                          ? colors.warning
                          : colors.danger,
                  },
                ]}
              />
            ))}
          </>
        )}
      </View>

      <View
        style={[
          styles.bottomPanel,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + spacing.md + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
      >
        {scanState === "detected" ? (
          <>
            <View style={[styles.vehicleDetectedCard, { backgroundColor: colors.surface, borderRadius: 12 }]}>
              <View>
                <Text style={[styles.detectedLabel, { color: colors.textSecondary }]}>Veículo identificado</Text>
                <Text style={[styles.detectedName, { color: colors.textPrimary }]}>
                  {selectedVehicle?.make ?? "Chevrolet"} {selectedVehicle?.model ?? "Onix"} · {selectedVehicle?.version ?? "1.0T"}
                </Text>
              </View>
              <View style={styles.confidenceBox}>
                <Text style={[styles.confidenceText, { color: colors.success }]}>94%</Text>
                <Text style={[styles.confidenceLabel, { color: colors.textSecondary }]}>confiança</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleDiagnostic}
              style={[styles.diagBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Text style={styles.diagBtnText}>Ver diagnóstico completo →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={() => setScanState("analyzing")}
            style={[styles.diagBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Feather name="camera" size={20} color="#fff" />
            <Text style={styles.diagBtnText}>Fotografar Motor</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleGallery} style={styles.galleryBtn}>
          <Text style={[styles.galleryBtnText, { color: colors.primary }]}>Usar foto da galeria</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  aiPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  aiPillText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  vehicleDropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: 130,
  },
  vehicleDropdownText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  viewfinder: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  cameraPlaceholderText: {
    color: "#6B7280",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  corners: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    top: 20,
  },
  detectionPoint: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#fff",
  },
  bottomPanel: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  vehicleDetectedCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
  },
  detectedLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  detectedName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    marginTop: 2,
  },
  confidenceBox: {
    alignItems: "center",
  },
  confidenceText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  confidenceLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  diagBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  diagBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  galleryBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
