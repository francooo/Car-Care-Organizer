import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { AlertCard } from "@/components/ui/AlertCard";
import spacing from "@/constants/spacing";
import { Feather } from "@expo/vector-icons";

export default function RecoveryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Digite um e-mail válido.");
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
          <Feather name="mail" size={36} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Recuperar senha</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Digite seu e-mail e enviaremos um link para redefinir sua senha.
        </Text>

        {sent ? (
          <AlertCard
            message={`Link de recuperação enviado para ${email}. Verifique sua caixa de entrada.`}
            type="info"
          />
        ) : (
          <>
            {error ? <AlertCard message={error} type="danger" /> : null}
            <TextInput
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              keyboardType="email-address"
            />
            <Button title="Enviar link" onPress={handleSend} fullWidth loading={loading} />
          </>
        )}

        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={[styles.backLinkText, { color: colors.primary }]}>← Voltar ao login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.xl, gap: spacing.md },
  backBtn: { width: 40, height: 40, justifyContent: "center", marginBottom: spacing.md },
  iconBox: {
    width: 80, height: 80, borderRadius: 20,
    alignItems: "center", justifyContent: "center", alignSelf: "flex-start",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", fontWeight: "700" },
  sub: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  backLink: { alignItems: "center", marginTop: spacing.md },
  backLinkText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
