import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";
import { FeatherIconName } from "@/types/icons";

function SettingsItem({
  icon, label, onPress, right, destructive, colors,
}: {
  icon: FeatherIconName; label: string; onPress?: () => void;
  right?: React.ReactNode; destructive?: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.settingsItem, { borderBottomColor: colors.border }]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Feather name={icon} size={18} color={destructive ? colors.danger : colors.textSecondary} />
      <Text style={[styles.settingsLabel, { color: destructive ? colors.danger : colors.textPrimary }]}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {right ?? <Feather name="chevron-right" size={16} color={colors.border} />}
      </View>
    </TouchableOpacity>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  function handleLogout() {
    Alert.alert("Sair da conta?", "Você precisará fazer login novamente.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
    ]);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.profileHeader, { borderBottomColor: colors.border }]}>
        <View style={[styles.bigAvatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.bigAvatarText}>{initials}</Text>
        </View>
        <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name ?? "Usuário"}</Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email ?? ""}</Text>
        <TouchableOpacity style={styles.editBtn}>
          <Feather name="edit-2" size={14} color={colors.primary} />
          <Text style={[styles.editBtnText, { color: colors.primary }]}>Editar perfil</Text>
        </TouchableOpacity>
      </View>

      <Section title="MINHA CONTA" colors={colors}>
        <SettingsItem icon="user" label="Editar dados" onPress={() => {}} colors={colors} />
        <SettingsItem icon="lock" label="Alterar senha" onPress={() => {}} colors={colors} />
        <SettingsItem icon="bell" label="Notificações" colors={colors}
          right={<Switch value={true} onValueChange={() => {}} trackColor={{ true: colors.primary }} />} />
        <SettingsItem icon="moon" label="Tema" colors={colors}
          right={<Text style={[styles.rightLabel, { color: colors.textSecondary }]}>Sistema</Text>} />
        <SettingsItem icon="globe" label="Idioma" colors={colors}
          right={<Text style={[styles.rightLabel, { color: colors.textSecondary }]}>Português</Text>} />
      </Section>

      <Section title="MEUS DADOS" colors={colors}>
        <SettingsItem icon="clock" label="Histórico de manutenções" onPress={() => router.push("/history")} colors={colors} />
        <SettingsItem icon="download" label="Exportar dados" onPress={() => {}} colors={colors} />
      </Section>

      <Section title="SUPORTE" colors={colors}>
        <SettingsItem icon="help-circle" label="FAQ" onPress={() => {}} colors={colors} />
        <SettingsItem icon="mail" label="Contato" onPress={() => {}} colors={colors} />
        <SettingsItem icon="file-text" label="Termos de uso" onPress={() => {}} colors={colors} />
        <SettingsItem icon="shield" label="Política de privacidade" onPress={() => {}} colors={colors} />
        <SettingsItem icon="info" label="Versão" colors={colors}
          right={<Text style={[styles.rightLabel, { color: colors.textSecondary }]}>v1.0.0</Text>} />
      </Section>

      <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, { borderColor: colors.border }]} testID="logout-btn">
        <Feather name="log-out" size={18} color={colors.danger} />
        <Text style={[styles.logoutText, { color: colors.danger }]}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  profileHeader: { alignItems: "center", paddingBottom: spacing.lg, borderBottomWidth: 1, gap: spacing.sm },
  bigAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  bigAvatarText: { color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold", fontWeight: "700" },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold", fontWeight: "700" },
  userEmail: { fontSize: 14, fontFamily: "Inter_400Regular" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  editBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  section: { gap: spacing.xs },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", fontWeight: "600", letterSpacing: 0.8 },
  sectionCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  settingsItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: 14, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  rightLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
  },
  logoutText: { fontSize: 16, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
});
