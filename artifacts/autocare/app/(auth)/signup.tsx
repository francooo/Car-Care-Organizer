import { ArrowLeft, UserPlus } from "lucide-react-native";
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

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signup } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  function validate() {
    let ok = true;
    setNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmError("");

    if (!name.trim() || name.trim().length < 2) {
      setNameError("Nome deve ter pelo menos 2 caracteres");
      ok = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("E-mail inválido");
      ok = false;
    }
    if (password.length < 6) {
      setPasswordError("Senha deve ter pelo menos 6 caracteres");
      ok = false;
    }
    if (password !== confirm) {
      setConfirmError("As senhas não coincidem");
      ok = false;
    }
    return ok;
  }

  async function handleSignup() {
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await signup(name.trim(), email, password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta. Tente novamente.");
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
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
          <UserPlus size={36} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Criar conta</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Preencha os dados abaixo para começar.
        </Text>

        {error ? <AlertCard message={error} type="danger" /> : null}

        <TextInput
          label="Nome completo"
          value={name}
          onChangeText={setName}
          placeholder="Seu nome"
          autoCapitalize="words"
          error={nameError}
        />
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
          placeholder="Mínimo 6 caracteres"
          secureTextEntry
          error={passwordError}
        />
        <TextInput
          label="Confirmar senha"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Repita a senha"
          secureTextEntry
          error={confirmError}
        />

        <Button
          title="Criar conta"
          onPress={handleSignup}
          fullWidth
          loading={loading}
          disabled={loading}
        />

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Já tem uma conta?</Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text style={[styles.footerLink, { color: colors.primary }]}> Entrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: spacing.xl, gap: 0 },
  backBtn: { width: 40, height: 40, justifyContent: "center", marginBottom: spacing.md },
  iconBox: {
    width: 80, height: 80, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    alignSelf: "flex-start", marginBottom: spacing.lg,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", fontWeight: "700", marginBottom: spacing.xs },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: spacing.lg },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: spacing.md },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
});
