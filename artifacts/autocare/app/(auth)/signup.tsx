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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function isFormValid() {
    return (
      name.length >= 3 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
      password.length >= 8 &&
      password === confirm &&
      termsAccepted
    );
  }

  async function handleSignup() {
    if (!isFormValid()) return;
    setLoading(true);
    try {
      await signup(name, email, password);
      router.replace("/(tabs)");
    } catch {
      setError("Erro ao criar conta. Tente novamente.");
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Criar Conta</Text>

        {error ? <AlertCard message={error} type="danger" /> : null}

        <TextInput
          label="Nome completo"
          value={name}
          onChangeText={setName}
          placeholder="Nome completo"
          autoCapitalize="words"
          error={name.length > 0 && name.length < 3 ? "Mínimo 3 caracteres" : ""}
        />

        <TextInput
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          keyboardType="email-address"
        />

        <TextInput
          label="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo 8 caracteres"
          secureTextEntry
          error={password.length > 0 && password.length < 8 ? "Mínimo 8 caracteres" : ""}
        />

        <TextInput
          label="Confirmar senha"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Repita a senha"
          secureTextEntry
          error={confirm.length > 0 && confirm !== password ? "Senhas não conferem" : ""}
        />

        <TouchableOpacity
          onPress={() => setTermsAccepted(!termsAccepted)}
          style={styles.termsRow}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: colors.primary,
                backgroundColor: termsAccepted ? colors.primary : "transparent",
              },
            ]}
          />
          <Text style={[styles.termsText, { color: colors.textSecondary }]}>
            Li e aceito os{" "}
            <Text style={{ color: colors.primary }}>Termos de Uso</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ marginTop: spacing.md }}>
          <Button
            title="Criar Conta"
            onPress={handleSignup}
            fullWidth
            loading={loading}
            disabled={!isFormValid() || loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    paddingHorizontal: spacing.xl,
    gap: 0,
  },
  backBtn: {
    marginBottom: spacing.lg,
  },
  backText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    marginBottom: spacing.lg,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
  },
  termsText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});
