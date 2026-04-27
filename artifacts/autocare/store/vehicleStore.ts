import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type FluidStatus = "ok" | "warning" | "critical";
export type FluidType = "oil" | "coolant" | "brake" | "power" | "washer" | "battery";

export interface FluidReading {
  type: FluidType;
  levelPct: number;
  status: FluidStatus;
  spec: string;
  amountLiters?: number;
}

export interface MaintenanceReminder {
  enabled: boolean;
  intervalDays?: number;
  intervalKm?: number;
  lastServiceDate: string;
  lastServiceOdometer?: number;
  notificationId?: string;
}

export type MaintenanceSchedule = Partial<Record<FluidType, MaintenanceReminder>>;

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  version: string;
  plate: string;
  nickname?: string;
  photoUri?: string;
  fluids?: FluidReading[];
  overallStatus?: FluidStatus;
  maintenanceSchedule?: MaintenanceSchedule;
  currentKm?: number;
  createdAt: string;
}

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
      { type: "power", levelPct: 85, status: "ok", spec: "N/A" },
      { type: "washer", levelPct: 50, status: "ok", spec: "Água destilada" },
      { type: "battery", levelPct: 60, status: "warning", spec: "12V / 45Ah" },
    ],
    createdAt: new Date().toISOString(),
  },
];

interface VehicleState {
  vehicles: Vehicle[];
  loaded: boolean;
  loadVehicles: () => Promise<void>;
  addVehicle: (v: Omit<Vehicle, "id" | "createdAt">) => Promise<Vehicle>;
  updateVehicle: (id: string, v: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  getVehicle: (id: string) => Vehicle | undefined;
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  loaded: false,

  loadVehicles: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        set({ vehicles: JSON.parse(raw), loaded: true });
        return;
      }
    } catch {}
    set({ vehicles: MOCK_VEHICLES, loaded: true });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_VEHICLES));
  },

  addVehicle: async (v) => {
    const newV: Vehicle = {
      ...v,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
    };
    const updated = [newV, ...get().vehicles];
    set({ vehicles: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newV;
  },

  updateVehicle: async (id, v) => {
    const updated = get().vehicles.map(veh => veh.id === id ? { ...veh, ...v } : veh);
    set({ vehicles: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  deleteVehicle: async (id) => {
    const updated = get().vehicles.filter(v => v.id !== id);
    set({ vehicles: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  getVehicle: (id) => get().vehicles.find(v => v.id === id),
}));
