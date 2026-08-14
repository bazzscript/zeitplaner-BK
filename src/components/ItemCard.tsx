"use client";

import type { DayItem, DisplaySubItem } from "@/lib/types";
import { cn, formatTime, type ItemPhase } from "@/lib/utils";
import { recurrenceLabel } from "@/lib/recurrence";
import { Check, ImageIcon, Link2 } from "lucide-react";

interface ItemCardProps {
  item: DayItem;
  phase?: ItemPhase;
  onOpen: () => void;
  onToggleStep?: (sub: DisplaySubItem, completed: boolean) => void;
}

export function ItemCard({
  item,
  phase = "later",
  onOpen,
  onToggleStep,
}: ItemCardProps) {
  const completed = item.subItems.filter((s) => s.isCompleted).length;

  return (
    <div
      className={cn(
        "w-full rounded-xl border p-4 text-left transition duration-150",
        phase === "past" &&
          "border-[var(--border)] bg-[var(--card)] opacity-45 grayscale",
        phase === "now" &&
          "border-[var(--accent)] bg-[var(--accent)]/10 shadow-[inset_4px_0_0_0_var(--accent)]",
        phase === "upcoming" &&
          "border-[var(--accent)]/45 bg-[var(--card)] hover:bg-[var(--card-hover)]",
        phase === "later" &&
          "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card-hover)]",
        phase === "later" &&
          item.priority === "important" &&
          "border-[var(--important)]/50"
      )}
    >
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-block h-2 w-2 shrink-0 rounded-full",
                  phase === "now"
                    ? "bg-[var(--accent)]"
                    : item.priority === "important"
                      ? "bg-[var(--important)]"
                      : "bg-[var(--optional)]"
                )}
              />
              <h3 className="truncate font-medium">{item.title}</h3>
              {phase === "past" && (
                <span className="shrink-0 rounded-full bg-[var(--background)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--optional)]">
                  Past
                </span>
              )}
              {phase === "now" && (
                <span className="shrink-0 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Now
                </span>
              )}
              {phase === "upcoming" && (
                <span className="shrink-0 rounded-full border border-[var(--accent)]/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                  Up next
                </span>
              )}
            </div>
            {item.startTime && (
              <p className="mt-1 text-sm text-[var(--optional)]">
                {formatTime(item.startTime)}
                {item.endTime && ` – ${formatTime(item.endTime)}`}
              </p>
            )}
            {item.isRecurring && (
              <p className="mt-1 text-xs text-[var(--accent)]">
                {recurrenceLabel(item.recurrenceRule)}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-[var(--optional)]">
            {item.links.length > 0 && (
              <span className="flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                {item.links.length}
              </span>
            )}
            {item.images.length > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {item.images.length}
              </span>
            )}
          </div>
        </div>
      </button>

      {item.subItems.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-[var(--border)] pt-3">
          {item.subItems.map((sub) => (
            <li key={sub.subItemId} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => onToggleStep?.(sub, !sub.isCompleted)}
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                  sub.isCompleted
                    ? "border-green-500 bg-green-500/20 text-green-500"
                    : "border-[var(--border)] hover:border-white/30"
                )}
                aria-label={sub.isCompleted ? "Mark incomplete" : "Mark complete"}
              >
                {sub.isCompleted && <Check className="h-3 w-3" />}
              </button>
              <button
                type="button"
                onClick={onOpen}
                className={cn(
                  "min-w-0 flex-1 text-left text-sm",
                  sub.isCompleted && "text-[var(--optional)] line-through"
                )}
              >
                {sub.title}
              </button>
            </li>
          ))}
          <li className="pt-1 text-xs text-[var(--optional)]">
            {completed}/{item.subItems.length} sub-items
          </li>
        </ul>
      )}
    </div>
  );
}
