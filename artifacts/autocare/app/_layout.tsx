import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { rescheduleVehicleNotifications } from "@/lib/notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuthStore } from "@/store/authStore";
import { useVehicleStore } from "@/store/vehicleStore";
import { useChatStore } from "@/store/chatStore";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function useNotificationDeepLink() {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, string> | null;
      if (data?.vehicleId) {
        router.push({ pathname: "/diagnostic/[vehicleId]", params: { vehicleId: data.vehicleId } });
      }
    });

    Notifications.getLastNotificationResponseAsync().then(response => {
      const data = response?.notification.request.content.data as Record<string, string> | null;
      if (data?.vehicleId) {
        router.push({ pathname: "/diagnostic/[vehicleId]", params: { vehicleId: data.vehicleId } });
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, loadSession } = useAuthStore();
  const { loadVehicles } = useVehicleStore();
  const { loadConversations } = useChatStore();
  const segments = useSegments();

  useNotificationDeepLink();

  useEffect(() => {
    loadSession();
    loadVehicles().then(() => {
      if (Platform.OS !== "web") {
        const { vehicles } = useVehicleStore.getState();
        vehicles.forEach(v => {
          if (v.maintenanceSchedule) rescheduleVehicleNotifications(v);
        });
      }
    });
    loadConversations();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && inAuth) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="diagnostic/[vehicleId]" options={{ headerShown: false }} />
      <Stack.Screen name="guide/[fluidType]" options={{ headerShown: false }} />
      <Stack.Screen name="vehicle/new" options={{ headerShown: false }} />
      <Stack.Screen name="vehicle/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthGuard>
                <RootLayoutNav />
              </AuthGuard>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
