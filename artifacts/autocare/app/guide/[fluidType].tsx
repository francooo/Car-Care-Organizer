import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FluidType } from "@/store/vehicleStore";
import { FeatherIconName } from "@/types/icons";
import { useColors } from "@/hooks/useColors";
import { AlertCard } from "@/components/ui/AlertCard";
import spacing from "@/constants/spacing";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface Step {
  title: string;
  instruction: string;
  warning?: string;
  icon: FeatherIconName;
  color?: string;
}

const FLUID_STEPS: Record<string, Step[]> = {
  oil: [
    {
      title: "Localize o bocal",
      instruction: "Com o motor desligado e frio, identifique a tampa com símbolo OIL — geralmente amarela ou laranja, localizada no topo do motor.",
      icon: "search",
    },
    {
      title: "Gire e remova",
      instruction: "Segure a tampa firmemente e gire no sentido anti-horário até soltar completamente. Coloque em local limpo.",
      icon: "rotate-ccw",
      warning: "Nunca abra com o motor quente. Aguarde pelo menos 30 minutos após desligar.",
    },
    {
      title: "Use um funil",
      instruction: "Insira um funil limpo no bocal para evitar derramamento no motor, o que pode causar queima e fumaça.",
      icon: "filter",
    },
    {
      title: "Adicione o óleo",
      instruction: "Despeje devagar o óleo especificado para seu veículo. Verifique a vareta a cada 0,2L para não ultrapassar o nível máximo.",
      icon: "droplet",
    },
    {
      title: "Feche e verifique",
      instruction: "Reinstale a tampa girando no sentido horário até firmar bem. Ligue o motor por 1 minuto, desligue, aguarde 2 minutos e verifique novamente.",
      icon: "check-circle",
    },
  ],
  coolant: [
    {
      title: "Aguarde o motor esfriar",
      instruction: "Nunca abra o radiador com o motor quente. Aguarde pelo menos 2 horas após desligar.",
      warning: "Líquido a alta pressão pode causar queimaduras graves.",
      icon: "thermometer",
    },
    {
      title: "Localize o reservatório",
      instruction: "Identifique o reservatório translúcido com marcações MIN e MAX. Geralmente branco ou azul.",
      icon: "search",
    },
    {
      title: "Adicione o líquido",
      instruction: "Use o líquido do tipo correto para seu veículo (OAT ou HOAT). Adicione até o nível MAX.",
      icon: "droplet",
    },
  ],
  brake: [
    {
      title: "Localize o reservatório",
      instruction: "O reservatório de fluido de freio fica próximo ao pedal de freio, no compartimento do motor.",
      icon: "search",
    },
    {
      title: "Verifique o tipo",
      instruction: "Confirme o tipo de fluido no manual (DOT-3, DOT-4 ou DOT-5.1). Nunca misture tipos diferentes.",
      warning: "Fluido de freio é corrosivo. Evite contato com a pele e pintura do carro.",
      icon: "alert-circle",
    },
    {
      title: "Adicione o fluido",
      instruction: "Com cuidado, adicione o fluido até o nível MAX. Tampe imediatamente para evitar contaminação por umidade.",
      icon: "droplet",
    },
  ],
  washer: [
    {
      title: "Localize o reservatório",
      instruction: "Encontre o reservatório com ícone de limpador de para-brisa, geralmente azul.",
      icon: "search",
    },
    {
      title: "Abra e adicione",
      instruction: "Abra a tampa e adicione a mistura de água com álcool ou produto limpador específico.",
      icon: "wind",
    },
  ],
  power: [
    {
      title: "Localize o reservatório",
      instruction: "O reservatório de direção fica próximo à correia, com símbolo de volante.",
      icon: "search",
    },
    {
      title: "Adicione o fluido",
      instruction: "Use o fluido PSF adequado para seu veículo. Adicione até o nível máximo indicado.",
      icon: "droplet",
    },
  ],
  battery: [
    {
      title: "Verifique a tensão",
      instruction: "Use um multímetro para verificar a tensão. Uma bateria saudável deve marcar 12,4V–12,7V com o motor desligado.",
      icon: "battery",
    },
    {
      title: "Verifique os terminais",
      instruction: "Inspecione os terminais por sinais de corrosão (depósito esbranquiçado). Limpe com escova e solução de bicarbonato se necessário.",
      warning: "Desconecte sempre o terminal negativo primeiro.",
      icon: "tool",
    },
  ],
};

const FLUID_NAMES: Record<string, string> = {
  oil: "Óleo do Motor",
  coolant: "Arrefecimento",
  brake: "Fluido de Freio",
  power: "Direção",
  washer: "Limpador",
  battery: "Bateria",
};

function StepIconAnimation({ icon, color }: { icon: FeatherIconName; color: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    const rotate = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    pulse.start();
    rotate.start();
    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, [icon]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const shouldRotate = icon === "rotate-ccw" || icon === "droplet";

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }, shouldRotate ? { rotate: spin } : { rotate: "0deg" }] }}>
      <Feather name={icon} size={80} color={color} />
    </Animated.View>
  );
}

export default function GuideScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fluidType } = useLocalSearchParams<{ fluidType: FluidType }>();

  const steps = FLUID_STEPS[fluidType ?? "oil"] ?? FLUID_STEPS.oil;
  const fluidName = FLUID_NAMES[fluidType ?? "oil"] ?? "Fluido";

  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  function animateToStep(nextIndex: number, direction: "left" | "right") {
    const outDir = direction === "left" ? -SCREEN_WIDTH : SCREEN_WIDTH;
    const inDir = direction === "left" ? SCREEN_WIDTH : -SCREEN_WIDTH;

    Animated.parallel([
      Animated.timing(slideAnim, { toValue: outDir, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setCurrentStep(nextIndex);
      slideAnim.setValue(inDir);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 100, friction: 12 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }

  function goNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < steps.length - 1) {
      animateToStep(currentStep + 1, "left");
    } else {
      setCompleted(true);
    }
  }

  function goPrev() {
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateToStep(currentStep - 1, "right");
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 12 && Math.abs(gs.dy) < 60,
      onPanResponderMove: (_, gs) => {
        slideAnim.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -50) {
          goNext();
        } else if (gs.dx > 50) {
          goPrev();
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  async function handleSave() {
    try {
      const raw = await AsyncStorage.getItem("@autocare:history");
      const history = raw ? JSON.parse(raw) : [];
      history.unshift({
        id: Date.now().toString(36),
        vehicleId: "v1",
        vehicleName: "Meu Veículo",
        vehiclePlate: "—",
        fluidsHandled: [fluidType ?? "oil"],
        status: "completed",
        createdAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem("@autocare:history", JSON.stringify(history));
    } catch {}
    router.back();
  }

  if (completed) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Guia: {fluidName}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.completedContent}>
          <View style={[styles.checkCircle, { backgroundColor: colors.successLight }]}>
            <Feather name="check" size={48} color={colors.success} />
          </View>
          <Text style={[styles.completedTitle, { color: colors.textPrimary }]}>Manutenção concluída!</Text>
          <Text style={[styles.completedSub, { color: colors.textSecondary }]}>
            Excelente! Você completou o guia de manutenção do {fluidName}. Seu veículo agradece!
          </Text>
          <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85} testID="save-history-btn">
            <Text style={styles.saveBtnText}>Salvar no histórico</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.backDiagBtn}>
            <Text style={[styles.backDiagText, { color: colors.primary }]}>Voltar para o diagnóstico</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const step = steps[currentStep]!;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Guia: {fluidName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.progressBar, { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm }]}>
        <View style={styles.progressSegments}>
          {steps.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.segment,
                {
                  flex: 1,
                  backgroundColor: i <= currentStep ? colors.primary : colors.border,
                  marginRight: i < steps.length - 1 ? 4 : 0,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.stepCounter, { color: colors.textSecondary }]}>
          {currentStep + 1} / {steps.length}
        </Text>
      </View>

      <View style={styles.swipeArea} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.stepContent,
            {
              transform: [{ translateX: slideAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={[styles.animationBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <StepIconAnimation key={`${currentStep}-${step.icon}`} icon={step.icon} color={colors.primary} />
            <View style={[styles.iconRing, { borderColor: colors.primary + "25" }]} />
          </View>

          <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{step.title}</Text>
          <Text style={[styles.stepInstruction, { color: colors.textSecondary }]}>{step.instruction}</Text>
          {step.warning && <AlertCard message={step.warning} type="warning" />}

          <View style={styles.swipeHint}>
            <Feather name="chevron-left" size={14} color={colors.textSecondary} style={{ opacity: currentStep === 0 ? 0.2 : 0.6 }} />
            <Text style={[styles.swipeHintText, { color: colors.textSecondary }]}>deslize para navegar</Text>
            <Feather name="chevron-right" size={14} color={colors.textSecondary} style={{ opacity: currentStep === steps.length - 1 ? 0.2 : 0.6 }} />
          </View>
        </Animated.View>
      </View>

      <View
        style={[
          styles.navButtons,
          {
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + spacing.md + (Platform.OS === "web" ? 34 : 0),
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity
          onPress={goPrev}
          disabled={currentStep === 0}
          style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: currentStep === 0 ? 0.35 : 1 }]}
          activeOpacity={0.8}
          testID="prev-step-btn"
        >
          <Feather name="arrow-left" size={18} color={colors.textPrimary} style={{ marginRight: 6 }} />
          <Text style={[styles.navBtnText, { color: colors.textPrimary }]}>Anterior</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={goNext}
          style={[styles.navBtn, styles.nextBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          testID="next-step-btn"
        >
          <Text style={[styles.navBtnText, { color: "#fff" }]}>
            {currentStep === steps.length - 1 ? "Concluir" : "Próximo"}
          </Text>
          <Feather
            name={currentStep === steps.length - 1 ? "check" : "arrow-right"}
            size={18}
            color="#fff"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    justifyContent: "space-between",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  progressBar: { gap: 4 },
  progressSegments: { flexDirection: "row", height: 4, borderRadius: 2 },
  segment: { height: 4, borderRadius: 2 },
  stepCounter: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  swipeArea: { flex: 1, overflow: "hidden" },
  stepContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  animationBox: {
    height: 200,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    position: "relative",
    overflow: "hidden",
  },
  iconRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  stepTitle: { fontSize: 22, fontFamily: "Inter_700Bold", fontWeight: "700", lineHeight: 30 },
  stepInstruction: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 26 },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  swipeHintText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  navButtons: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  navBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  nextBtn: { borderWidth: 0 },
  navBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  completedContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  checkCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  completedTitle: { fontSize: 26, fontFamily: "Inter_700Bold", fontWeight: "700", textAlign: "center" },
  completedSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24 },
  saveBtn: { width: "100%", height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  backDiagBtn: { height: 44, alignItems: "center", justifyContent: "center" },
  backDiagText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
