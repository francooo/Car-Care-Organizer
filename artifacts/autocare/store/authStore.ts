import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  loadSession: async () => {
    try {
      const token = await AsyncStorage.getItem("@autocare:token");
      const raw = await AsyncStorage.getItem("@autocare:user");
      if (token && raw) {
        set({ token, user: JSON.parse(raw), isLoading: false });
        return;
      }
    } catch {}
    set({ isLoading: false });
  },

  login: async (email: string, _password: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: _password }),
      });
      if (res.ok) {
        const data = await res.json() as { token: string; user: User };
        await AsyncStorage.setItem("@autocare:token", data.token);
        await AsyncStorage.setItem("@autocare:user", JSON.stringify(data.user));
        set({ token: data.token, user: data.user });
        return;
      }
    } catch {}
    // fallback mock
    const token = "mock-jwt-" + Date.now().toString(36);
    const user: User = { id: "user-1", name: email.split("@")[0] ?? "Usuário", email };
    await AsyncStorage.setItem("@autocare:token", token);
    await AsyncStorage.setItem("@autocare:user", JSON.stringify(user));
    set({ token, user });
  },

  signup: async (name: string, email: string, _password: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: _password }),
      });
      if (res.ok) {
        const data = await res.json() as { token: string; user: User };
        await AsyncStorage.setItem("@autocare:token", data.token);
        await AsyncStorage.setItem("@autocare:user", JSON.stringify(data.user));
        set({ token: data.token, user: data.user });
        return;
      }
    } catch {}
    const token = "mock-jwt-" + Date.now().toString(36);
    const user: User = { id: Date.now().toString(36), name, email };
    await AsyncStorage.setItem("@autocare:token", token);
    await AsyncStorage.setItem("@autocare:user", JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(["@autocare:token", "@autocare:user"]);
    set({ user: null, token: null });
  },
}));
