import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { useAuthStore } from "./authStore";

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
const BASE_URL = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`;

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

interface ApiVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  version?: string | null;
  plate?: string | null;
  nickname?: string | null;
  photoUri?: string | null;
  fluids?: FluidReading[] | null;
  overallStatus?: FluidStatus | null;
  maintenanceSchedule?: MaintenanceSchedule | null;
  currentKm?: number | null;
  createdAt: string;
}

function mapApiVehicle(v: ApiVehicle): Vehicle {
  return {
    id: String(v.id),
    make: String(v.make),
    model: String(v.model),
    year: Number(v.year),
    version: v.version ?? "",
    plate: v.plate ?? "",
    nickname: v.nickname ?? undefined,
    photoUri: v.photoUri ?? undefined,
    fluids: v.fluids ?? undefined,
    overallStatus: v.overallStatus ?? undefined,
    maintenanceSchedule: v.maintenanceSchedule ?? undefined,
    currentKm: v.currentKm ?? undefined,
    createdAt: typeof v.createdAt === "string" ? v.createdAt : new Date(v.createdAt).toISOString(),
  };
}

async function persistCache(vehicles: Vehicle[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
  } catch {}
}

async function loadCache(): Promise<Vehicle[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Vehicle[];
  } catch {}
  return null;
}

interface VehicleState {
  vehicles: Vehicle[];
  loaded: boolean;
  isStale: boolean;
  loadVehicles: (force?: boolean) => Promise<void>;
  addVehicle: (v: Omit<Vehicle, "id" | "createdAt">) => Promise<Vehicle>;
  updateVehicle: (id: string, v: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  getVehicle: (id: string) => Vehicle | undefined;
  reset: () => Promise<void>;
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  loaded: false,
  isStale: false,

  loadVehicles: async (force = false) => {
    if (get().loaded && !force) return;

    const token = useAuthStore.getState().token;

    if (token) {
      try {
        const res = await fetch(`${BASE_URL}/api/vehicles`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json() as ApiVehicle[];
          const vehicles = data.map(mapApiVehicle);
          set({ vehicles, loaded: true, isStale: false });
          await persistCache(vehicles);
          return;
        }
      } catch {}
    }

    const cached = await loadCache();
    if (cached && cached.length > 0) {
      set({ vehicles: cached, loaded: true, isStale: true });
      return;
    }

    set({ loaded: true, isStale: false });
  },

  addVehicle: async (v) => {
    const token = useAuthStore.getState().token;
    if (token) {
      try {
        const res = await fetch(`${BASE_URL}/api/vehicles`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            make: v.make,
            model: v.model,
            year: v.year,
            version: v.version,
            nickname: v.nickname,
            plate: v.plate,
            photoUri: v.photoUri,
            maintenanceSchedule: v.maintenanceSchedule,
            currentKm: v.currentKm,
          }),
        });
        if (res.ok) {
          const data = await res.json() as ApiVehicle;
          const newV = mapApiVehicle(data);
          const updated = [newV, ...get().vehicles];
          set({ vehicles: updated });
          await persistCache(updated);
          return newV;
        }
      } catch {}
    }

    const newV: Vehicle = {
      ...v,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
    };
    const updated = [newV, ...get().vehicles];
    set({ vehicles: updated });
    await persistCache(updated);
    return newV;
  },

  updateVehicle: async (id, v) => {
    const token = useAuthStore.getState().token;
    if (token) {
      try {
        const res = await fetch(`${BASE_URL}/api/vehicles/${id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({
            version: v.version,
            nickname: v.nickname,
            plate: v.plate,
            photoUri: v.photoUri,
            maintenanceSchedule: v.maintenanceSchedule,
            currentKm: v.currentKm,
            overallStatus: v.overallStatus,
          }),
        });
        if (res.ok) {
          const data = await res.json() as ApiVehicle;
          const updated = get().vehicles.map(veh =>
            veh.id === id ? { ...veh, ...mapApiVehicle(data) } : veh
          );
          set({ vehicles: updated });
          await persistCache(updated);
          return;
        }
      } catch {}
    }

    const updated = get().vehicles.map(veh => veh.id === id ? { ...veh, ...v } : veh);
    set({ vehicles: updated });
    await persistCache(updated);
  },

  deleteVehicle: async (id) => {
    const token = useAuthStore.getState().token;
    if (token) {
      try {
        await fetch(`${BASE_URL}/api/vehicles/${id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
      } catch {}
    }
    const updated = get().vehicles.filter(v => v.id !== id);
    set({ vehicles: updated });
    await persistCache(updated);
  },

  getVehicle: (id) => get().vehicles.find(v => v.id === id),

  reset: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
    set({ vehicles: [], loaded: false, isStale: false });
  },
}));
