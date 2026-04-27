import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useVehicles, Vehicle } from "@/context/VehicleContext";
import { useColors } from "@/hooks/useColors";
import { VehicleCard } from "@/components/VehicleCard";
import spacing from "@/constants/spacing";

export default function GarageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { vehicles, deleteVehicle } = useVehicles();

  function handleVehiclePress(vehicle: Vehicle) {
    router.push({ pathname: "/(tabs)/scan", params: { vehicleId: vehicle.id } });
  }

  function handleScanPress(vehicle: Vehicle) {
    router.push({ pathname: "/(tabs)/scan", params: { vehicleId: vehicle.id } });
  }

  function handleLongPress(vehicle: Vehicle) {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancelar", "Editar", "Remover"],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) {
            router.push({ pathname: "/vehicle/[id]", params: { id: vehicle.id } });
          } else if (idx === 2) {
            confirmDelete(vehicle);
          }
        }
      );
    } else {
      Alert.alert("Veículo", `${vehicle.make} ${vehicle.model}`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Editar", onPress: () => router.push({ pathname: "/vehicle/[id]", params: { id: vehicle.id } }) },
        { text: "Remover", style: "destructive", onPress: () => confirmDelete(vehicle) },
      ]);
    }
  }

  function confirmDelete(vehicle: Vehicle) {
    Alert.alert("Remover veículo?", `Tem certeza que deseja remover o ${vehicle.make} ${vehicle.model}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => deleteVehicle(vehicle.id) },
    ]);
  }

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) },
        ]}
      >
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            Olá, {user?.name?.split(" ")[0] ?? "Motorista"}
          </Text>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Minha Garagem</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.avatar, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!vehicles.length}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="truck" size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Sua garagem está vazia
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Adicione seu primeiro veículo para começar
            </Text>
            <TouchableOpacity
              style={[styles.addFirstBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/vehicle/new")}
              activeOpacity={0.8}
            >
              <Text style={styles.addFirstBtnText}>Adicionar meu primeiro carro</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <VehicleCard
            vehicle={item}
            onPress={() => handleVehiclePress(item)}
            onLongPress={() => handleLongPress(item)}
            onScanPress={() => handleScanPress(item)}
          />
        )}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 90 + (Platform.OS === "web" ? 34 : 0) }]}
        onPress={() => router.push("/vehicle/new")}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={28} color="#fff" />
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
  greeting: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  addFirstBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  addFirstBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
