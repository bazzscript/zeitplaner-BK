import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export type ItemPhase = "past" | "now" | "upcoming" | "later";

export function getItemPhase(
  startTime: string | null,
  endTime: string | null,
  now = Date.now()
): ItemPhase {
  if (!startTime) return "later";
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : start + 60 * 60 * 1000;
  if (now > end) return "past";
  if (now >= start && now <= end) return "now";
  return "later";
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";
