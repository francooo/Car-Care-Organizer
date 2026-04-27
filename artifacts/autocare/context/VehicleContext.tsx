import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type FluidStatus = "ok" | "warning" | "critical";
export type FluidType = "oil" | "coolant" | "brake" | "power" | "washer" | "battery";

export interface FluidReading {
  type: FluidType;
  levelPct: number;
  status: FluidStatus;
  spec: string;
  amountLiters?: number;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  version: string;
  plate: string;
  nickname?: string;
  photoUrl?: string;
  fluids?: FluidReading[];
  overallStatus?: FluidStatus;
  createdAt: string;
}

interface VehicleContextType {
  vehicles: Vehicle[];
  addVehicle: (v: Omit<Vehicle, "id" | "createdAt">) => Promise<Vehicle>;
  updateVehicle: (id: string, v: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  getVehicle: (id: string) => Vehicle | undefined;
}

const VehicleContext = createContext<VehicleContextType | null>(null);

const STORAGE_KEY = "@autocare:vehicles";

const MOCK_VEHICLES: Vehicle[] = [
  {
    id: "v1",
    make: "Chevrolet",
    model: "Onix",
    year: 2022,
    version: "1.0 Turbo Flex",
    plate: "ABC-1D23",
    nickname: "Meu Onix",
    overallStatus: "warning",
    fluids: [
      { type: "oil", levelPct: 55, status: "warning", spec: "5W-30 Sintético", amountLiters: 1.2 },
      { type: "coolant", levelPct: 80, status: "ok", spec: "OAT Azul" },
      { type: "brake", levelPct: 70, status: "ok", spec: "DOT-4" },
      { type: "power", levelPct: 90, status: "ok", spec: "Padrão PSF" },
      { type: "washer", levelPct: 30, status: "warning", spec: "Água + álcool" },
      { type: "battery", levelPct: 85, status: "ok", spec: "12V / 60Ah" },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "v2",
    make: "Hyundai",
    model: "HB20",
    year: 2020,
    version: "1.0 Aspirado Flex",
    plate: "XYZ-4E56",
    overallStatus: "critical",
    fluids: [
      { type: "oil", levelPct: 20, status: "critical", spec: "5W-30 Semissintético", amountLiters: 2.5 },
      { type: "coolant", levelPct: 35, status: "critical", spec: "HOAT Verde", amountLiters: 1.0 },
      { type: "brake", levelPct: 65, status: "ok", spec: "DOT-3" },
      { type: "power", levelPct: 0, status: "ok", spec: "N/A" },
      { type: "washer", levelPct: 50, status: "ok", spec: "Água destilada" },
      { type: "battery", levelPct: 60, status: "warning", spec: "12V / 45Ah" },
    ],
    createdAt: new Date().toISOString(),
  },
];

export function VehicleProvider({ children }: { children: React.ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setVehicles(JSON.parse(raw));
      } else {
        setVehicles(MOCK_VEHICLES);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_VEHICLES));
      }
    } catch {
      setVehicles(MOCK_VEHICLES);
    }
  }

  async function saveVehicles(updated: Vehicle[]) {
    setVehicles(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  const addVehicle = useCallback(async (v: Omit<Vehicle, "id" | "createdAt">) => {
    const newVehicle: Vehicle = {
      ...v,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
    };
    await saveVehicles([newVehicle, ...vehicles]);
    return newVehicle;
  }, [vehicles]);

  const updateVehicle = useCallback(async (id: string, v: Partial<Vehicle>) => {
    const updated = vehicles.map(veh => veh.id === id ? { ...veh, ...v } : veh);
    await saveVehicles(updated);
  }, [vehicles]);

  const deleteVehicle = useCallback(async (id: string) => {
    await saveVehicles(vehicles.filter(v => v.id !== id));
  }, [vehicles]);

  const getVehicle = useCallback((id: string) => {
    return vehicles.find(v => v.id === id);
  }, [vehicles]);

  return (
    <VehicleContext.Provider value={{ vehicles, addVehicle, updateVehicle, deleteVehicle, getVehicle }}>
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicles() {
  const ctx = useContext(VehicleContext);
  if (!ctx) throw new Error("useVehicles must be used within VehicleProvider");
  return ctx;
}
