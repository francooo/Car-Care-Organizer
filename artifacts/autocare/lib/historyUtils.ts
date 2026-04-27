import AsyncStorage from "@react-native-async-storage/async-storage";
import { FluidType } from "@/store/vehicleStore";

const HISTORY_KEY = "@autocare:history";

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string;
  fluidsHandled: FluidType[];
  status: "completed" | "partial" | "scan_only";
  createdAt: string;
}

export async function getHistoryRecords(): Promise<MaintenanceRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw) as MaintenanceRecord[];
  } catch {}
  return [];
}

export async function getLastServiceFromHistory(
  vehicleId: string,
  fluidType: FluidType
): Promise<string | null> {
  const records = await getHistoryRecords();
  const relevant = records
    .filter(r => r.vehicleId === vehicleId && r.fluidsHandled.includes(fluidType))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return relevant[0]?.createdAt ?? null;
}

export async function getLastServiceDatesForVehicle(
  vehicleId: string
): Promise<Partial<Record<FluidType, string>>> {
  const records = await getHistoryRecords();
  const fluidTypes: FluidType[] = ["oil", "coolant", "brake", "power", "washer", "battery"];
  const result: Partial<Record<FluidType, string>> = {};

  for (const fluid of fluidTypes) {
    const relevant = records
      .filter(r => r.vehicleId === vehicleId && r.fluidsHandled.includes(fluid))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (relevant[0]) {
      result[fluid] = relevant[0].createdAt;
    }
  }
  return result;
}

export async function saveHistoryRecord(record: MaintenanceRecord): Promise<void> {
  const records = await getHistoryRecords();
  const updated = [record, ...records];
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}
