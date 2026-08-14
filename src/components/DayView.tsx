"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { getDayItems, syncFromGoogle, toggleSubItemComplete } from "@/lib/actions/items";
import { getCarryOver } from "@/lib/actions/features";
import type { CarryOverRow, DayItem, DisplaySubItem } from "@/lib/types";
import { cn, formatDateKey, getItemPhase, parseDateKey } from "@/lib/utils";
import { cacheDayItems, readCachedDayItems } from "@/lib/offline";
import { ItemCard } from "./ItemCard";
import { ItemModal } from "./ItemModal";
import { TodaySummary } from "./TodaySummary";

interface DayViewProps {
  dateKey: string;
  onDateChange: (date: string) => void;
  focusItemId?: string | null;
  onFocusConsumed?: () => void;
  startCreating?: boolean;
  onCreateConsumed?: () => void;
}

export function DayView({
  dateKey,
  onDateChange,
  focusItemId,
  onFocusConsumed,
  startCreating,
  onCreateConsumed,
}: DayViewProps) {
  const [items, setItems] = useState<DayItem[]>([]);
  const [carryOver, setCarryOver] = useState<CarryOverRow[]>([]);
  const [selectedItem, setSelectedItem] = useState<DayItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const todayKey = formatDateKey(new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDayItems(dateKey);
      setItems(data);
      setOffline(false);
      cacheDayItems(dateKey, data);
      if (dateKey === todayKey) {
        const open = await getCarryOver(dateKey);
        setCarryOver(open);
      } else {
        setCarryOver([]);
      }
    } catch {
      const cached = readCachedDayItems(dateKey);
      if (cached) {
        setItems(cached);
        setOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, [dateKey, todayKey]);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (startCreating) {
      setSelectedItem(null);
      setCreating(true);
      onCreateConsumed?.();
    }
  }, [startCreating, onCreateConsumed]);

  useEffect(() => {
    if (!focusItemId || loading) return;
    const found = items.find((i) => i.masterItemId === focusItemId);
    if (found) {
      setCreating(false);
      setSelectedItem(found);
      onFocusConsumed?.();
    }
  }, [focusItemId, items, loading, onFocusConsumed]);

  async function handleSync() {
    if (offline) return;
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
    if (offline) return;
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

  async function toggleStep(item: DayItem, sub: DisplaySubItem, completed: boolean) {
    setItems((prev) =>
      prev.map((it) =>
        it.masterItemId === item.masterItemId
          ? {
              ...it,
              subItems: it.subItems.map((s) =>
                s.subItemId === sub.subItemId ? { ...s, isCompleted: completed } : s
              ),
            }
          : it
      )
    );
    await toggleSubItemComplete(
      item.masterItemId,
      sub.subItemId,
      completed,
      item.isRecurring ? item.instanceDate : undefined
    );
    await load();
  }

  async function toggleCarry(row: CarryOverRow) {
    await toggleSubItemComplete(
      row.item.masterItemId,
      row.sub.subItemId,
      true,
      row.item.isRecurring ? row.dateKey : undefined
    );
    await load();
  }

  const displayDate = parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const upcomingId = items
    .filter((i) => getItemPhase(i.startTime, i.endTime, now) === "later")
    .sort(
      (a, b) =>
        new Date(a.startTime ?? 0).getTime() -
        new Date(b.startTime ?? 0).getTime()
    )[0]?.masterItemId;

  return (
    <div>
      {offline && (
        <p className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-center text-sm text-[var(--optional)]">
          You’re offline. Showing the last saved plan. Editing is disabled.
        </p>
      )}

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
              onClick={() => onDateChange(todayKey)}
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
            disabled={pending || offline}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm transition hover:bg-[var(--card)] disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
            Sync Calendar
          </button>
          <button
            onClick={openNew}
            disabled={offline}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>
      </div>

      <TodaySummary
        dateKey={dateKey}
        todayKey={todayKey}
        items={items}
        carryOver={carryOver}
        onOpenItem={(item, d) => {
          if (d && d !== dateKey) onDateChange(d);
          setSelectedItem(item);
        }}
        onToggleCarryOver={(row) => void toggleCarry(row)}
      />

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
            disabled={offline}
            className="mt-4 text-[var(--accent)] transition hover:underline disabled:opacity-50"
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
              <ItemCard
                item={item}
                phase={
                  getItemPhase(item.startTime, item.endTime, now) === "later" &&
                  item.masterItemId === upcomingId
                    ? "upcoming"
                    : getItemPhase(item.startTime, item.endTime, now)
                }
                onOpen={() => setSelectedItem(item)}
                onToggleStep={(sub, completed) =>
                  void toggleStep(item, sub, completed)
                }
              />
            </div>
          ))}
        </div>
      )}

      {(creating || selectedItem) && (
        <ItemModal
          item={selectedItem}
          dateKey={selectedItem?.instanceDate ?? dateKey}
          isNew={creating}
          onClose={closeModal}
          onSaved={() => void handleSaved()}
          onRefresh={() => void load()}
        />
      )}
    </div>
  );
}
