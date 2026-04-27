import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export interface NetworkStatus {
  isConnected: boolean;
  isOffline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isOffline: false,
  });

  useEffect(() => {
    NetInfo.fetch().then(state => {
      const connected = state.isConnected ?? true;
      setStatus({ isConnected: connected, isOffline: !connected });
    }).catch(() => {});

    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected ?? true;
      setStatus({ isConnected: connected, isOffline: !connected });
    });

    return unsubscribe;
  }, []);

  return status;
}
