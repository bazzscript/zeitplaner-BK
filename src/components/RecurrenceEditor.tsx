"use client";

import type { RecurrenceConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAYS = [
  { key: "MO", label: "M" },
  { key: "TU", label: "T" },
  { key: "WE", label: "W" },
  { key: "TH", label: "T" },
  { key: "FR", label: "F" },
  { key: "SA", label: "S" },
  { key: "SU", label: "S" },
];

interface RecurrenceEditorProps {
  value: RecurrenceConfig | null;
  onChange: (value: RecurrenceConfig | null) => void;
}

export function RecurrenceEditor({ value, onChange }: RecurrenceEditorProps) {
  const enabled = value !== null;

  return (
    <div className="rounded-lg border border-[var(--border)] p-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? { frequency: "weekly", interval: 1, byDay: ["MO"] }
                : null
            )
          }
        />
        Repeating activity
      </label>

      {enabled && value && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--optional)]">
                Frequency
              </label>
              <select
                value={value.frequency}
                onChange={(e) =>
                  onChange({
                    ...value,
                    frequency: e.target.value as RecurrenceConfig["frequency"],
                  })
                }
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--optional)]">
                Every
              </label>
              <input
                type="number"
                min={1}
                value={value.interval}
                onChange={(e) =>
                  onChange({ ...value, interval: Number(e.target.value) || 1 })
                }
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
          </div>

          {value.frequency === "weekly" && (
            <div>
              <label className="mb-2 block text-xs text-[var(--optional)]">
                Repeat on
              </label>
              <div className="flex gap-1">
                {DAYS.map((day) => {
                  const selected = value.byDay?.includes(day.key);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => {
                        const current = value.byDay ?? [];
                        const next = selected
                          ? current.filter((d) => d !== day.key)
                          : [...current, day.key];
                        onChange({ ...value, byDay: next.length ? next : ["MO"] });
                      }}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium",
                        selected
                          ? "bg-[var(--accent)] text-white"
                          : "border border-[var(--border)] text-[var(--optional)]"
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--optional)]">
                Ends on (optional)
              </label>
              <input
                type="date"
                value={value.until?.slice(0, 10) ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    until: e.target.value || undefined,
                    count: undefined,
                  })
                }
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--optional)]">
                Or after N times
              </label>
              <input
                type="number"
                min={1}
                value={value.count ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    count: e.target.value ? Number(e.target.value) : undefined,
                    until: undefined,
                  })
                }
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
