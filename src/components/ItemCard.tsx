"use client";

import type { DayItem } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { recurrenceLabel } from "@/lib/recurrence";
import { CheckCircle2, Circle, Link2, ImageIcon } from "lucide-react";

interface ItemCardProps {
  item: DayItem;
  onClick: () => void;
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  const completedSubs = item.subItems.filter((s) => s.isCompleted).length;
  const totalSubs = item.subItems.length;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition duration-150 hover:bg-[var(--card-hover)] active:scale-[0.995]",
        item.priority === "important"
          ? "border-[var(--important)]/50 bg-[var(--card)]"
          : "border-[var(--border)] bg-[var(--card)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block h-2 w-2 shrink-0 rounded-full",
                item.priority === "important"
                  ? "bg-[var(--important)]"
                  : "bg-[var(--optional)]"
              )}
            />
            <h3 className="truncate font-medium">{item.title}</h3>
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
          {item.description && (
            <p className="mt-2 line-clamp-2 text-sm text-[var(--optional)]">
              {item.description}
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

      {totalSubs > 0 && (
        <div className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3 text-sm">
          {completedSubs === totalSubs ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <Circle className="h-4 w-4 text-[var(--optional)]" />
          )}
          <span className="text-[var(--optional)]">
            {completedSubs}/{totalSubs} sub-items
          </span>
        </div>
      )}
    </button>
  );
}
