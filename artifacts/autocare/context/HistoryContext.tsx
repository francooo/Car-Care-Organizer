import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { FluidType } from "./VehicleContext";

export type MaintenanceStatus = "completed" | "partial" | "scan_only";

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string;
  fluidsHandled: FluidType[];
  status: MaintenanceStatus;
  createdAt: string;
}

interface HistoryContextType {
  records: MaintenanceRecord[];
  addRecord: (r: Omit<MaintenanceRecord, "id" | "createdAt">) => Promise<void>;
}

const HistoryContext = createContext<HistoryContextType | null>(null);

const STORAGE_KEY = "@autocare:history";

const MOCK_RECORDS: MaintenanceRecord[] = [
  {
    id: "h1",
    vehicleId: "v1",
    vehicleName: "Chevrolet Onix",
    vehiclePlate: "ABC-1D23",
    fluidsHandled: ["oil", "washer"],
    status: "completed",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "h2",
    vehicleId: "v2",
    vehicleName: "Hyundai HB20",
    vehiclePlate: "XYZ-4E56",
    fluidsHandled: ["oil"],
    status: "scan_only",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setRecords(JSON.parse(raw));
      } else {
        setRecords(MOCK_RECORDS);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_RECORDS));
      }
    } catch {
      setRecords(MOCK_RECORDS);
    }
  }

  const addRecord = useCallback(async (r: Omit<MaintenanceRecord, "id" | "createdAt">) => {
    const newRecord: MaintenanceRecord = {
      ...r,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
    };
    const updated = [newRecord, ...records];
    setRecords(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [records]);

  return (
    <HistoryContext.Provider value={{ records, addRecord }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
}
