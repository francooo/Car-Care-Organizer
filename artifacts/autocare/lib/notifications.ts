import type * as NotificationsType from "expo-notifications";
import { Platform } from "react-native";
import { FluidType, MaintenanceReminder, MaintenanceSchedule, Vehicle } from "@/store/vehicleStore";
import { getLastServiceDatesForVehicle } from "@/lib/historyUtils";

// expo-notifications crashes on Expo Go (Android, SDK 53+). Lazy-load so the
// app still works — features that need push notifications just become no-ops.
// eslint-disable-next-line @typescript-eslint/no-require-imports
let Notifications: typeof NotificationsType | null = null;
try {
  Notifications = require("expo-notifications") as typeof NotificationsType;
} catch {}

export const FLUID_LABELS: Record<FluidType, string> = {
  oil: "Óleo do Motor",
  coolant: "Líquido de Arrefecimento",
  brake: "Fluido de Freio",
  power: "Direção Hidráulica",
  washer: "Limpador de Para-brisa",
  battery: "Bateria",
};

export const FLUID_ICONS: Record<FluidType, string> = {
  oil: "droplet",
  coolant: "thermometer",
  brake: "alert-triangle",
  power: "rotate-cw",
  washer: "wind",
  battery: "zap",
};

export const DEFAULT_INTERVALS: Record<FluidType, { days: number; km: number | null }> = {
  oil:     { days: 180,  km: 5000  },
  coolant: { days: 365,  km: null  },
  brake:   { days: 730,  km: null  },
  power:   { days: 365,  km: null  },
  washer:  { days: 30,   km: null  },
  battery: { days: 365,  km: null  },
};

const AVERAGE_KM_PER_DAY = 40;

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web" || !Notifications) return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export function computeEffectiveDueDate(
  reminder: MaintenanceReminder,
  currentKm?: number
): Date {
  const lastServiceMs = new Date(reminder.lastServiceDate).getTime();

  let dueDateMs = Infinity;

  if (reminder.intervalDays) {
    const daysDue = lastServiceMs + reminder.intervalDays * 24 * 60 * 60 * 1000;
    if (daysDue < dueDateMs) dueDateMs = daysDue;
  }

  if (reminder.intervalKm) {
    let daysUntilKmDue: number;
    if (currentKm !== undefined && reminder.lastServiceOdometer !== undefined && currentKm > reminder.lastServiceOdometer) {
      const kmSinceService = currentKm - reminder.lastServiceOdometer;
      const kmRemaining = reminder.intervalKm - kmSinceService;
      const avgKmPerDay = AVERAGE_KM_PER_DAY;
      daysUntilKmDue = Math.max(0, kmRemaining / avgKmPerDay);
    } else {
      daysUntilKmDue = reminder.intervalKm / AVERAGE_KM_PER_DAY;
    }
    const kmDue = lastServiceMs + daysUntilKmDue * 24 * 60 * 60 * 1000;
    if (kmDue < dueDateMs) dueDateMs = kmDue;
  }

  if (dueDateMs === Infinity) {
    return new Date(lastServiceMs + 180 * 24 * 60 * 60 * 1000);
  }

  return new Date(dueDateMs);
}

export function getDaysUntilDue(reminder: MaintenanceReminder, currentKm?: number): number {
  const dueDate = computeEffectiveDueDate(reminder, currentKm);
  return Math.ceil((dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export function getNextDueDate(reminder: MaintenanceReminder, currentKm?: number): Date {
  return computeEffectiveDueDate(reminder, currentKm);
}

export async function scheduleMaintenanceNotification(
  vehicle: Vehicle,
  fluidType: FluidType,
  reminder: MaintenanceReminder
): Promise<string | null> {
  if (!reminder.enabled || Platform.OS === "web") return null;

  const dueDate = computeEffectiveDueDate(reminder, vehicle.currentKm);

  if (dueDate <= new Date()) return null;

  const vehicleName = vehicle.nickname ?? `${vehicle.make} ${vehicle.model}`;

  if (!Notifications) return null;
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "AutoCare AI — Manutenção",
        body: `Hora de verificar o ${FLUID_LABELS[fluidType]} do ${vehicleName}!`,
        data: { vehicleId: vehicle.id, fluidType },
        sound: true,
      },
      trigger: { date: dueDate } as NotificationsType.DateTriggerInput,
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelNotification(notificationId: string): Promise<void> {
  if (Platform.OS === "web" || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {}
}

export async function applyMaintenanceSchedule(
  vehicle: Vehicle,
  schedule: MaintenanceSchedule
): Promise<MaintenanceSchedule> {
  const historyDates = await getLastServiceDatesForVehicle(vehicle.id);
  const updated: MaintenanceSchedule = {};

  for (const [fluid, reminder] of Object.entries(schedule) as [FluidType, MaintenanceReminder][]) {
    const old = vehicle.maintenanceSchedule?.[fluid];
    if (old?.notificationId) {
      await cancelNotification(old.notificationId);
    }

    const effectiveReminder = resolveLastServiceDate(reminder, historyDates[fluid]);

    let notificationId: string | undefined;
    if (effectiveReminder.enabled) {
      const id = await scheduleMaintenanceNotification(vehicle, fluid, effectiveReminder);
      notificationId = id ?? undefined;
    }

    updated[fluid] = { ...effectiveReminder, notificationId };
  }

  return updated;
}

export async function rescheduleVehicleNotifications(vehicle: Vehicle): Promise<MaintenanceSchedule> {
  if (!vehicle.maintenanceSchedule || Platform.OS === "web") {
    return vehicle.maintenanceSchedule ?? {};
  }
  return applyMaintenanceSchedule(vehicle, vehicle.maintenanceSchedule);
}

function resolveLastServiceDate(
  reminder: MaintenanceReminder,
  historyDate: string | undefined
): MaintenanceReminder {
  if (!historyDate) return reminder;
  const historyMs = new Date(historyDate).getTime();
  const manualMs = new Date(reminder.lastServiceDate).getTime();
  if (historyMs > manualMs) {
    return { ...reminder, lastServiceDate: historyDate.split("T")[0] };
  }
  return reminder;
}
