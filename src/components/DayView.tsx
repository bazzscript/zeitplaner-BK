"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { getDayItems, syncFromGoogle } from "@/lib/actions/items";
import type { DayItem } from "@/lib/types";
import { cn, formatDateKey, parseDateKey } from "@/lib/utils";
import { ItemCard } from "./ItemCard";
import { ItemModal } from "./ItemModal";

interface DayViewProps {
  dateKey: string;
  onDateChange: (date: string) => void;
}

export function DayView({ dateKey, onDateChange }: DayViewProps) {
  const [items, setItems] = useState<DayItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<DayItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDayItems(dateKey);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  async function handleSync() {
    const start = dateKey;
    const endDate = new Date(parseDateKey(dateKey));
    endDate.setDate(endDate.getDate() + 30);
    await syncFromGoogle(start, formatDateKey(endDate));
    await load();
  }

  function shiftDay(delta: number) {
    const d = parseDateKey(dateKey);
    d.setDate(d.getDate() + delta);
    onDateChange(formatDateKey(d));
  }

  function openNew() {
    setSelectedItem(null);
    setCreating(true);
  }

  function closeModal() {
    setCreating(false);
    setSelectedItem(null);
  }

  async function handleSaved() {
    closeModal();
    await load();
  }

  // Keep open item in sync after background refreshes (e.g. sub-item toggle)
  useEffect(() => {
    setSelectedItem((current) => {
      if (!current) return current;
      const fresh = items.find(
        (i) =>
          i.masterItemId === current.masterItemId &&
          i.instanceDate === current.instanceDate
      );
      return fresh ?? current;
    });
  }, [items]);

  const displayDate = parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDay(-1)}
            className="rounded-xl border border-[var(--border)] p-2 transition hover:bg-[var(--card)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-xl font-semibold">{displayDate}</h2>
            <button
              onClick={() => onDateChange(formatDateKey(new Date()))}
              className="text-sm text-[var(--accent)] transition hover:underline"
            >
              Today
            </button>
          </div>
          <button
            onClick={() => shiftDay(1)}
            className="rounded-xl border border-[var(--border)] p-2 transition hover:bg-[var(--card)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => void handleSync()}
            disabled={pending}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm transition hover:bg-[var(--card)] disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
            Sync Calendar
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--card)]"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] py-20 text-center">
          <p className="text-[var(--optional)]">No activities for this day.</p>
          <button
            onClick={openNew}
            className="mt-4 text-[var(--accent)] transition hover:underline"
          >
            Add your first item
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.masterItemId}-${item.instanceDate}`}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <ItemCard item={item} onClick={() => setSelectedItem(item)} />
            </div>
          ))}
        </div>
      )}

      {(creating || selectedItem) && (
        <ItemModal
          item={selectedItem}
          dateKey={dateKey}
          isNew={creating}
          onClose={closeModal}
          onSaved={() => void handleSaved()}
          onRefresh={() => void load()}
        />
      )}
    </div>
  );
}
