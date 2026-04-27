import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  async function loadSession() {
    try {
      const storedToken = await AsyncStorage.getItem("@autocare:token");
      const storedUser = await AsyncStorage.getItem("@autocare:user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    const mockToken = "mock-jwt-" + Date.now().toString(36);
    const mockUser: User = {
      id: "user-1",
      name: email.split("@")[0] ?? "Usuário",
      email,
    };
    await AsyncStorage.setItem("@autocare:token", mockToken);
    await AsyncStorage.setItem("@autocare:user", JSON.stringify(mockUser));
    setToken(mockToken);
    setUser(mockUser);
  }, []);

  const signup = useCallback(async (name: string, email: string, _password: string) => {
    const mockToken = "mock-jwt-" + Date.now().toString(36);
    const mockUser: User = {
      id: "user-" + Date.now().toString(36),
      name,
      email,
    };
    await AsyncStorage.setItem("@autocare:token", mockToken);
    await AsyncStorage.setItem("@autocare:user", JSON.stringify(mockUser));
    setToken(mockToken);
    setUser(mockUser);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(["@autocare:token", "@autocare:user"]);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
