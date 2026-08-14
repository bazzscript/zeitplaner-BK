import type { RecurrenceConfig } from "./types";

const DAY_MAP: Record<string, string> = {
  SU: "SU",
  MO: "MO",
  TU: "TU",
  WE: "WE",
  TH: "TH",
  FR: "FR",
  SA: "SA",
};

export function buildRRule(config: RecurrenceConfig): string {
  const parts = [`FREQ=${config.frequency.toUpperCase()}`];
  if (config.interval > 1) parts.push(`INTERVAL=${config.interval}`);
  if (config.byDay?.length) {
    parts.push(`BYDAY=${config.byDay.map((d) => DAY_MAP[d] ?? d).join(",")}`);
  }
  if (config.count) parts.push(`COUNT=${config.count}`);
  if (config.until) {
    const until = config.until.replace(/-/g, "").replace(/:/g, "").split("T")[0];
    parts.push(`UNTIL=${until}T235959Z`);
  }
  return parts.join(";");
}

export function parseRRule(rrule: string): Partial<RecurrenceConfig> {
  const config: Partial<RecurrenceConfig> = { interval: 1 };
  for (const part of rrule.split(";")) {
    const [key, value] = part.split("=");
    if (key === "FREQ") config.frequency = value.toLowerCase() as RecurrenceConfig["frequency"];
    if (key === "INTERVAL") config.interval = Number(value);
    if (key === "BYDAY") config.byDay = value.split(",");
    if (key === "COUNT") config.count = Number(value);
    if (key === "UNTIL") config.until = value;
  }
  return config;
}

export function recurrenceLabel(rrule: string | null): string {
  if (!rrule) return "One-time";
  const config = parseRRule(rrule);
  const freq = config.frequency ?? "weekly";
  const interval = config.interval ?? 1;
  const days = config.byDay?.join(", ") ?? "";
  if (interval > 1) return `Every ${interval} ${freq}${days ? ` on ${days}` : ""}`;
  if (days) return `Weekly on ${days}`;
  return freq.charAt(0).toUpperCase() + freq.slice(1);
}
