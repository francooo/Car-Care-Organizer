import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Vehicle, useVehicleStore } from "@/store/vehicleStore";
import { useAuthStore } from "@/store/authStore";
import { useColors } from "@/hooks/useColors";
import { OfflineBanner } from "@/components/OfflineBanner";
import spacing from "@/constants/spacing";

type ScanState = "no_permission" | "starting" | "waiting" | "analyzing" | "detected" | "error";

const BASE_URL = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`;

const DETECTION_POINTS = [
  { topPct: 28, leftPct: 22, status: "warning" } as const,
  { topPct: 48, leftPct: 58, status: "critical" } as const,
  { topPct: 62, leftPct: 38, status: "ok" } as const,
];

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();
  const { vehicles, updateVehicle } = useVehicleStore();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>("starting");
  const [selectedId, setSelectedId] = useState<string | undefined>(vehicleId ?? vehicles[0]?.id);
  const [confidence, setConfidence] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (permission === null) return;
    if (!permission.granted) {
      setScanState("no_permission");
    } else {
      setScanState("waiting");
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }
  }, [permission]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (scanState === "analyzing") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [scanState]);

  async function captureAndAnalyze() {
    if (Platform.OS === "web") {
      await handleGallery();
      return;
    }
    try {
      setScanState("analyzing");
      const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.6 });
      if (!photo?.base64) throw new Error("No image captured");
      await sendToBackend(photo.base64);
    } catch {
      setScanState("error");
      setErrorMsg("Erro ao capturar foto. Tente novamente.");
    }
  }

  async function handleGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6 });
    if (!result.canceled && result.assets[0]?.base64) {
      setScanState("analyzing");
      await sendToBackend(result.assets[0].base64);
    }
  }

  async function sendToBackend(base64: string) {
    try {
      const { token } = useAuthStore.getState();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${BASE_URL}/api/scan`, {
        method: "POST",
        headers,
        body: JSON.stringify({ image: base64, vehicleId: selectedId }),
      });
      if (!res.ok) throw new Error(`Erro na análise (${res.status}). Tente novamente.`);

      type ScanApiResponse = {
        fluids: Vehicle["fluids"];
        overallStatus: Vehicle["overallStatus"];
        confidence: number;
      };
      const data = await res.json() as ScanApiResponse;

      if (selectedId) {
        await updateVehicle(selectedId, {
          fluids: data.fluids,
          overallStatus: data.overallStatus,
        });
      }
      setConfidence(Math.round(data.confidence ?? 94));
      setScanState("detected");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível conectar ao servidor. Verifique sua conexão.";
      setErrorMsg(msg);
      setScanState("error");
    }
  }

  function handleViewDiagnostic() {
    router.push({ pathname: "/diagnostic/[vehicleId]", params: { vehicleId: selectedId ?? "v1" } });
  }

  const selectedVehicle = vehicles.find(v => v.id === selectedId);

  if (scanState === "no_permission" || (permission !== null && !permission.granted)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: spacing.xl }]}>
        <Feather name="camera-off" size={64} color={colors.border} />
        <Text style={[styles.permTitle, { color: colors.textPrimary }]}>Câmera necessária</Text>
        <Text style={[styles.permSub, { color: colors.textSecondary }]}>
          O AutoCare AI precisa da câmera para fotografar o motor e fazer o diagnóstico de fluidos.
        </Text>
        {permission && !permission.canAskAgain && Platform.OS !== "web" ? (
          <TouchableOpacity style={[styles.permBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.permBtnText}>Abrir Configurações</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.permBtn, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
            testID="request-camera-btn"
          >
            <Text style={styles.permBtnText}>Permitir câmera</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.galleryAlt} onPress={handleGallery}>
          <Text style={[styles.galleryAltText, { color: colors.primary }]}>Usar foto da galeria</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="close-scanner-btn">
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={[styles.aiPill, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
          <Animated.View style={[
            styles.aiDot,
            {
              opacity: scanState === "analyzing" ? pulseAnim : 1,
              backgroundColor: scanState === "detected" ? colors.success
                : scanState === "analyzing" ? colors.warning : "#6B7280",
            }
          ]} />
          <Text style={styles.aiPillText}>
            {scanState === "analyzing" ? "IA analisando…"
              : scanState === "detected" ? "Análise concluída!"
              : scanState === "error" ? "Erro na análise"
              : "Aponte para o motor"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.vehicleBadge, { backgroundColor: "rgba(0,0,0,0.55)" }]}
          onPress={() => setShowVehiclePicker(true)}
          testID="vehicle-picker-btn"
        >
          <Text style={styles.vehicleBadgeText} numberOfLines={1}>
            {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : "Selecionar"}
          </Text>
          <Feather name="chevron-down" size={12} color="#fff" />
        </TouchableOpacity>
      </View>

      <OfflineBanner />

      <Animated.View style={[styles.viewfinder, { opacity: fadeAnim }]}>
        {Platform.OS !== "web" && permission?.granted ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111827", alignItems: "center", justifyContent: "center" }]}>
            <Feather name="camera" size={72} color="#374151" />
            <Text style={{ color: "#6B7280", fontSize: 15, fontFamily: "Inter_400Regular", marginTop: 16, textAlign: "center", paddingHorizontal: 32 }}>
              Aponte para o compartimento do motor
            </Text>
          </View>
        )}

        <View style={styles.corners}>
          {([styles.cornerTL, styles.cornerTR, styles.cornerBL, styles.cornerBR] as object[]).map((s, i) => (
            <View key={i} style={[styles.corner, s, { borderColor: colors.primary }]} />
          ))}
        </View>

        <Animated.View style={[
          styles.scanLine,
          { backgroundColor: colors.primary + "99" },
          { transform: [{ translateY: scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 260] }) }] },
        ]} />

        {scanState === "analyzing" && (
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.analyzingText}>Identificando fluidos…</Text>
          </View>
        )}

        {scanState === "detected" && (
          <>
            {DETECTION_POINTS.map((p, i) => (
              <View key={i} style={[
                styles.detectionPoint,
                {
                  top: `${p.topPct}%`,
                  left: `${p.leftPct}%`,
                  backgroundColor: p.status === "ok" ? colors.success : p.status === "warning" ? colors.warning : colors.danger,
                }
              ]} />
            ))}
          </>
        )}

        {scanState === "error" && (
          <View style={styles.errorOverlay}>
            <Feather name="alert-circle" size={36} color={colors.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}
      </Animated.View>

      <View style={[
        styles.bottomPanel,
        { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.md + (Platform.OS === "web" ? 34 : 0) },
      ]}>
        {scanState === "detected" ? (
          <>
            <View style={[styles.detectedCard, { backgroundColor: colors.surface }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detectedLabel, { color: colors.textSecondary }]}>Veículo identificado</Text>
                <Text style={[styles.detectedName, { color: colors.textPrimary }]}>
                  {selectedVehicle?.make ?? "Veículo"} {selectedVehicle?.model ?? ""} · {selectedVehicle?.version ?? ""}
                </Text>
              </View>
              <View style={styles.confidenceBox}>
                <Text style={[styles.confidencePct, { color: confidence >= 80 ? colors.success : colors.warning }]}>{confidence}%</Text>
                <Text style={[styles.confidenceLabel, { color: colors.textSecondary }]}>confiança</Text>
                <View style={[styles.confidenceBarBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.confidenceBarFill, { width: (confidence / 100) * 60, backgroundColor: confidence >= 80 ? colors.success : colors.warning }]} />
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleViewDiagnostic}
              style={[styles.mainBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              testID="view-diagnostic-btn"
            >
              <Text style={styles.mainBtnText}>Ver diagnóstico completo →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={captureAndAnalyze}
            disabled={scanState === "analyzing"}
            style={[styles.mainBtn, { backgroundColor: scanState === "analyzing" ? colors.border : colors.primary }]}
            activeOpacity={0.85}
            testID="capture-btn"
          >
            {scanState === "analyzing" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="camera" size={20} color="#fff" />
                <Text style={styles.mainBtnText}>Fotografar motor</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleGallery} style={styles.galleryBtn} testID="gallery-btn">
          <Text style={[styles.galleryBtnText, { color: colors.primary }]}>Usar foto da galeria</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showVehiclePicker} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowVehiclePicker(false)}>
          <View style={[styles.vehiclePickerSheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>Selecionar veículo</Text>
            <ScrollView>
              {vehicles.map(v => (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => { setSelectedId(v.id); setShowVehiclePicker(false); setScanState("waiting"); }}
                  style={[
                    styles.pickerItem,
                    {
                      backgroundColor: v.id === selectedId ? colors.primaryLight : colors.surface,
                      borderColor: v.id === selectedId ? colors.primary : colors.border,
                    }
                  ]}
                >
                  <Text style={[styles.pickerItemText, { color: v.id === selectedId ? colors.primary : colors.textPrimary }]}>
                    {v.make} {v.model} · {v.plate}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowVehiclePicker(false)} style={[styles.pickerCancel, { backgroundColor: colors.surface }]}>
              <Text style={[styles.pickerCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm, zIndex: 10,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  aiPill: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  aiDot: { width: 8, height: 8, borderRadius: 4 },
  aiPillText: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium" },
  vehicleBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, maxWidth: 120,
  },
  vehicleBadgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  viewfinder: { flex: 1, overflow: "hidden", position: "relative" },
  corners: { position: "absolute", top: 20, left: 20, right: 20, bottom: 20 },
  corner: { position: "absolute", width: 28, height: 28, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: { position: "absolute", left: 0, right: 0, height: 2, top: 20 },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", gap: 16,
  },
  analyzingText: { color: "#fff", fontSize: 16, fontFamily: "Inter_500Medium" },
  detectionPoint: {
    position: "absolute", width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#fff",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", gap: 12,
  },
  errorText: { color: "#fff", fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
  bottomPanel: { padding: spacing.md, gap: spacing.sm },
  detectedCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: 12,
  },
  detectedLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  detectedName: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontWeight: "600", marginTop: 2 },
  confidenceBox: { alignItems: "center", minWidth: 64 },
  confidencePct: { fontSize: 22, fontFamily: "Inter_700Bold", fontWeight: "700" },
  confidenceLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  confidenceBarBg: { width: 60, height: 4, borderRadius: 2, marginTop: 4, overflow: "hidden" },
  confidenceBarFill: { height: 4, borderRadius: 2 },
  mainBtn: {
    height: 52, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
  },
  mainBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  galleryBtn: { height: 44, alignItems: "center", justifyContent: "center" },
  galleryBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  permTitle: { fontSize: 22, fontFamily: "Inter_700Bold", fontWeight: "700", textAlign: "center", marginTop: spacing.lg },
  permSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  permBtn: { paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: 12, marginTop: spacing.sm },
  permBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  galleryAlt: { marginTop: spacing.sm },
  galleryAltText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end",
  },
  vehiclePickerSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.lg, maxHeight: "70%",
  },
  pickerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", fontWeight: "600", marginBottom: spacing.md },
  pickerItem: {
    padding: spacing.md, borderRadius: 12, marginBottom: spacing.sm, borderWidth: 1.5,
  },
  pickerItemText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  pickerCancel: {
    height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: spacing.sm,
  },
  pickerCancelText: { fontSize: 16, fontFamily: "Inter_500Medium" },
});
