import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { FluidType, MaintenanceReminder, MaintenanceSchedule, Vehicle } from "@/store/vehicleStore";

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

export const DEFAULT_INTERVALS: Record<FluidType, number> = {
  oil: 180,
  coolant: 365,
  brake: 730,
  power: 365,
  washer: 30,
  battery: 365,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function scheduleMaintenanceNotification(
  vehicle: Vehicle,
  fluidType: FluidType,
  reminder: MaintenanceReminder
): Promise<string | null> {
  if (!reminder.enabled || Platform.OS === "web") return null;

  const lastService = new Date(reminder.lastServiceDate);
  const dueDate = new Date(
    lastService.getTime() + reminder.intervalDays * 24 * 60 * 60 * 1000
  );

  if (dueDate <= new Date()) return null;

  const vehicleName = vehicle.nickname ?? `${vehicle.make} ${vehicle.model}`;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "AutoCare AI — Manutenção",
        body: `Hora de verificar o ${FLUID_LABELS[fluidType]} do ${vehicleName}!`,
        data: { vehicleId: vehicle.id, fluidType },
        sound: true,
      },
      trigger: { date: dueDate } as Notifications.DateTriggerInput,
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelNotification(notificationId: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {}
}

export async function applyMaintenanceSchedule(
  vehicle: Vehicle,
  schedule: MaintenanceSchedule
): Promise<MaintenanceSchedule> {
  const updated: MaintenanceSchedule = {};

  for (const [fluid, reminder] of Object.entries(schedule) as [
    FluidType,
    MaintenanceReminder,
  ][]) {
    const old = vehicle.maintenanceSchedule?.[fluid];

    if (old?.notificationId) {
      await cancelNotification(old.notificationId);
    }

    let notificationId: string | undefined;
    if (reminder.enabled) {
      const id = await scheduleMaintenanceNotification(vehicle, fluid, reminder);
      notificationId = id ?? undefined;
    }

    updated[fluid] = { ...reminder, notificationId };
  }

  return updated;
}

export async function rescheduleVehicleNotifications(vehicle: Vehicle): Promise<MaintenanceSchedule> {
  if (!vehicle.maintenanceSchedule || Platform.OS === "web") {
    return vehicle.maintenanceSchedule ?? {};
  }
  return applyMaintenanceSchedule(vehicle, vehicle.maintenanceSchedule);
}

export function getNextDueDate(reminder: MaintenanceReminder): Date {
  const last = new Date(reminder.lastServiceDate);
  return new Date(last.getTime() + reminder.intervalDays * 24 * 60 * 60 * 1000);
}

export function getDaysUntilDue(reminder: MaintenanceReminder): number {
  const due = getNextDueDate(reminder);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}
