import type { DayItem } from "@/lib/types";

const KEY = "zbk-offline-days";

type Store = Record<string, DayItem[]>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

export function cacheDayItems(dateKey: string, items: DayItem[]) {
  const store = readStore();
  store[dateKey] = items;
  window.localStorage.setItem(KEY, JSON.stringify(store));
}

export function readCachedDayItems(dateKey: string): DayItem[] | null {
  const items = readStore()[dateKey];
  return items ?? null;
}
