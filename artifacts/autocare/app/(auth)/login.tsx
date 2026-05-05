import { Globe, Zap } from "lucide-react-native";
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
import { useAuthStore } from "@/store/authStore";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { AlertCard } from "@/components/ui/AlertCard";
import spacing from "@/constants/spacing";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  function validate() {
    let ok = true;
    setEmailError("");
    setPasswordError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("E-mail inválido");
      ok = false;
    }
    if (!password) {
      setPasswordError("Senha é obrigatória");
      ok = false;
    }
    return ok;
  }

  async function handleLogin() {
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credenciais inválidas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    setError("Login com Google em breve. Por favor, use e-mail e senha.");
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
            <Zap size={32} color="#fff" />
          </View>
          <Text style={[styles.logoText, { color: colors.textPrimary }]}>AutoCare AI</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Manutenção inteligente para o seu veículo.
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Bem-vindo de volta</Text>

        {error ? <AlertCard message={error} type="danger" /> : null}

        <TouchableOpacity
          onPress={handleGoogle}
          style={[styles.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.8}
          testID="google-login-btn"
        >
          <Globe size={18} color={colors.textPrimary} />
          <Text style={[styles.googleText, { color: colors.textPrimary }]}>Entrar com Google</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text style={[styles.divText, { color: colors.textSecondary }]}>ou</Text>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
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
          title="Entrar"
          onPress={handleLogin}
          fullWidth
          loading={loading}
          disabled={loading}
        />

        <TouchableOpacity style={styles.forgotBtn} onPress={() => router.push("/(auth)/recovery")}>
          <Text style={[styles.forgotText, { color: colors.primary }]}>Esqueceu a senha?</Text>
        </TouchableOpacity>

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
  container: { paddingHorizontal: spacing.xl, gap: 0 },
  logoSection: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  logoIcon: { width: 64, height: 64, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 28, fontFamily: "Inter_700Bold", fontWeight: "700" },
  tagline: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", fontWeight: "700", marginBottom: spacing.lg },
  googleBtn: {
    height: 52, borderRadius: 12, borderWidth: 1,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, marginBottom: spacing.md,
  },
  googleText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  line: { flex: 1, height: 1 },
  divText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  forgotBtn: { alignItems: "center", marginTop: spacing.md },
  forgotText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: spacing.md },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
});
