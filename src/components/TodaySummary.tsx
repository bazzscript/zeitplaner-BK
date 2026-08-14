"use client";

import type { CarryOverRow, DayItem } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { Check } from "lucide-react";

export function TodaySummary({
  dateKey,
  todayKey,
  items,
  carryOver,
  onOpenItem,
  onToggleCarryOver,
}: {
  dateKey: string;
  todayKey: string;
  items: DayItem[];
  carryOver: CarryOverRow[];
  onOpenItem: (item: DayItem, dateKey?: string) => void;
  onToggleCarryOver: (row: CarryOverRow) => void;
}) {
  if (dateKey !== todayKey) return null;

  const now = Date.now();
  const next = items
    .filter((i) => i.startTime && new Date(i.startTime).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime()
    )[0];

  const steps = items.flatMap((i) => i.subItems);
  const done = steps.filter((s) => s.isCompleted).length;
  const leftover = items.flatMap((i) =>
    i.subItems.filter((s) => s.priority === "important" && !s.isCompleted)
  );

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-[var(--optional)]">
        <span>
          Next{" "}
          <span className="font-medium text-[var(--foreground)]">
            {next
              ? `${next.title}${next.startTime ? ` · ${formatTime(next.startTime)}` : ""}`
              : "—"}
          </span>
        </span>
        <span className="hidden text-[var(--border)] sm:inline">·</span>
        <span>
          Sub-items{" "}
          <span className="font-medium text-[var(--foreground)]">
            {done}/{steps.length}
          </span>
        </span>
        <span className="hidden text-[var(--border)] sm:inline">·</span>
        <span>
          Important open{" "}
          <span className="font-medium text-[var(--foreground)]">
            {leftover.length + carryOver.length}
          </span>
        </span>
      </div>

      {carryOver.length > 0 && (
        <div className="rounded-xl border border-[var(--important)]/30 bg-[var(--card)] p-4">
          <h3 className="mb-3 text-sm font-medium">Still open</h3>
          <ul className="space-y-2">
            {carryOver.map((row) => (
              <li
                key={`${row.dateKey}-${row.sub.subItemId}`}
                className="flex items-start gap-2"
              >
                <button
                  type="button"
                  onClick={() => onToggleCarryOver(row)}
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[var(--border)]"
                  aria-label="Mark complete"
                >
                  <Check className="h-3 w-3 opacity-0" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenItem(row.item, row.dateKey)}
                  className="min-w-0 flex-1 text-left text-sm"
                >
                  <span className="font-medium">{row.sub.title}</span>
                  <span className="mt-0.5 block text-xs text-[var(--optional)]">
                    {row.item.title} · {row.dateKey}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
