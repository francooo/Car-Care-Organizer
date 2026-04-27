import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { AlertCard } from "@/components/ui/AlertCard";
import spacing from "@/constants/spacing";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  function validateEmail(val: string) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val);
  }

  async function handleLogin() {
    setError("");
    setEmailError("");
    setPasswordError("");
    let valid = true;
    if (!validateEmail(email)) {
      setEmailError("E-mail inválido");
      valid = false;
    }
    if (!password) {
      setPasswordError("Senha é obrigatória");
      valid = false;
    }
    if (!valid) return;

    setLoading(true);
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch {
      setError("Credenciais inválidas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      await login("usuario@google.com", "mock-google");
      router.replace("/(tabs)");
    } catch {
      setError("Erro ao entrar com Google.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
            <Feather name="zap" size={32} color="#fff" />
          </View>
          <Text style={[styles.logoText, { color: colors.textPrimary }]}>AutoCare AI</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Manutenção inteligente para o seu veículo.
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Bem-vindo de volta</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Acesse sua garagem</Text>

          {error ? <AlertCard message={error} type="danger" /> : null}

          <TouchableOpacity
            onPress={handleGoogleLogin}
            style={[styles.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Feather name="globe" size={18} color={colors.textPrimary} />
            <Text style={[styles.googleText, { color: colors.textPrimary }]}>Entrar com Google</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>ou</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TextInput
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            error={emailError}
          />

          <TextInput
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            error={passwordError}
          />

          <Button
            title={loading ? "Entrando…" : "Entrar"}
            onPress={handleLogin}
            fullWidth
            loading={loading}
            disabled={loading}
          />

          <TouchableOpacity style={styles.forgotBtn} onPress={() => {}}>
            <Text style={[styles.forgotText, { color: colors.primary }]}>Esqueceu a senha?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Não tem conta?</Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
            <Text style={[styles.footerLink, { color: colors.primary }]}> Cadastrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  logoSection: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  formSection: {
    gap: 0,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    marginBottom: spacing.lg,
  },
  googleBtn: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: spacing.md,
  },
  googleText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  forgotBtn: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  forgotText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
});
