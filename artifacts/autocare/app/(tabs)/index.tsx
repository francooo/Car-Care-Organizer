import { Plus, Truck, WifiOff } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { useVehicleStore, Vehicle } from "@/store/vehicleStore";
import { useColors } from "@/hooks/useColors";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { VehicleCard } from "@/components/VehicleCard";
import spacing from "@/constants/spacing";

export default function GarageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { vehicles, loadVehicles, deleteVehicle, isStale } = useVehicleStore();
  const { isOffline } = useNetworkStatus();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadVehicles(true);
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadVehicles(true);
    } finally {
      setRefreshing(false);
    }
  }

  function handlePress(v: Vehicle) {
    router.push({ pathname: "/(tabs)/scan", params: { vehicleId: v.id } });
  }

  function handleScan(v: Vehicle) {
    router.push({ pathname: "/(tabs)/scan", params: { vehicleId: v.id } });
  }

  function confirmDelete(v: Vehicle) {
    Alert.alert("Remover veículo?", `Remover o ${v.make} ${v.model}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => deleteVehicle(v.id) },
    ]);
  }

  function handleLongPress(v: Vehicle) {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancelar", "Editar", "Remover"], destructiveButtonIndex: 2, cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) router.push({ pathname: "/vehicle/[id]", params: { id: v.id } });
          else if (idx === 2) confirmDelete(v);
        }
      );
    } else {
      Alert.alert("Veículo", `${v.make} ${v.model}`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Editar", onPress: () => router.push({ pathname: "/vehicle/[id]", params: { id: v.id } }) },
        { text: "Remover", style: "destructive", onPress: () => confirmDelete(v) },
      ]);
    }
  }

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            Olá, {user?.name?.split(" ")[0] ?? "Motorista"}
          </Text>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Minha Garagem</Text>
        </View>
        <TouchableOpacity
          style={[styles.avatar, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/profile")}
          testID="avatar-btn"
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>

      {(isOffline || isStale) && (
        <View style={[styles.staleBanner, { backgroundColor: isOffline ? colors.danger : colors.warning }]}>
          <WifiOff size={14} color="#fff" />
          <Text style={styles.staleBannerText}>
            {isOffline ? "Sem conexão – verifique sua internet" : "Exibindo dados em cache – puxe para atualizar"}
          </Text>
        </View>
      )}

      <FlatList
        data={vehicles}
        keyExtractor={v => v.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Truck size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Sua garagem está vazia</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Adicione seu primeiro veículo para começar
            </Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/vehicle/new")}
              testID="add-vehicle-empty-btn"
            >
              <Text style={styles.addBtnText}>Adicionar meu primeiro carro</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <VehicleCard
            vehicle={item}
            onPress={() => handlePress(item)}
            onLongPress={() => handleLongPress(item)}
            onScanPress={() => handleScan(item)}
          />
        )}
      />

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: insets.bottom + 90 + (Platform.OS === "web" ? 34 : 0) },
        ]}
        onPress={() => router.push("/vehicle/new")}
        activeOpacity={0.85}
        testID="fab-add-vehicle"
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  greeting: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", fontWeight: "700" },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold", fontWeight: "700" },
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  emptyState: { alignItems: "center", paddingTop: 60, gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", fontWeight: "600", textAlign: "center" },
  emptySub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  addBtn: { paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: 12 },
  addBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  fab: {
    position: "absolute", right: spacing.xl, width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4,
  },
  staleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingVertical: 8,
  },
  staleBannerText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    flexShrink: 1,
  },
});
