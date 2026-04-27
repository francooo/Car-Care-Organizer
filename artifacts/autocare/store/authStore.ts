import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { useVehicleStore } from "./vehicleStore";
import { useChatStore } from "./chatStore";

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

const BASE_URL = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`;

const SECURE_TOKEN_KEY = "autocare_token";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  loadSession: async () => {
    try {
      let token = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
      if (!token) {
        const legacy = await AsyncStorage.getItem("@autocare:token");
        if (legacy) {
          await SecureStore.setItemAsync(SECURE_TOKEN_KEY, legacy);
          await AsyncStorage.removeItem("@autocare:token");
          token = legacy;
        }
      }
      const raw = await AsyncStorage.getItem("@autocare:user");
      if (token && raw) {
        set({ token, user: JSON.parse(raw) as User, isLoading: false });
        return;
      }
    } catch {}
    set({ isLoading: false });
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as { token?: string; user?: User; error?: string };
    if (!res.ok || !data.token || !data.user) {
      throw new Error(data.error ?? "Credenciais inválidas");
    }
    await SecureStore.setItemAsync(SECURE_TOKEN_KEY, data.token);
    await AsyncStorage.setItem("@autocare:user", JSON.stringify(data.user));
    set({ token: data.token, user: data.user });
  },

  signup: async (name: string, email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json() as { token?: string; user?: User; error?: string };
    if (!res.ok || !data.token || !data.user) {
      throw new Error(data.error ?? "Erro ao criar conta");
    }
    await SecureStore.setItemAsync(SECURE_TOKEN_KEY, data.token);
    await AsyncStorage.setItem("@autocare:user", JSON.stringify(data.user));
    set({ token: data.token, user: data.user });
  },

  logout: async () => {
    const { token } = get();
    try {
      if (token) {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
    await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
    await AsyncStorage.multiRemove([
      "@autocare:token",
      "@autocare:user",
      "@autocare:vehicles",
      "@autocare:conversations",
    ]);
    await useVehicleStore.getState().reset();
    await useChatStore.getState().reset();
    set({ user: null, token: null });
  },
}));
