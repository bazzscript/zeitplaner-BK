"use client";

import { useEffect, useState, useTransition } from "react";
import { getMonthSummary } from "@/lib/actions/items";
import { cn, formatDateKey } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthViewProps {
  year: number;
  month: number;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onMonthChange: (anchor: { year: number; month: number }) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthView({
  year,
  month,
  selectedDate,
  onSelectDate,
  onMonthChange,
}: MonthViewProps) {
  const [summary, setSummary] = useState<
    Record<string, { important: number; optional: number }>
  >({});
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getMonthSummary(year, month);
      setSummary(data);
    });
  }, [year, month]);

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    onMonthChange({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const today = formatDateKey(new Date());

  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-4">
        <button
          onClick={() => shiftMonth(-1)}
          className="rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--card)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-xl font-semibold">{monthLabel}</h2>
        <button
          onClick={() => shiftMonth(1)}
          className="rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--card)]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--optional)]">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 font-medium">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateKey = formatDateKey(new Date(year, month - 1, day));
          const counts = summary[dateKey];
          const isToday = dateKey === today;
          const isSelected = dateKey === selectedDate;

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={cn(
                "flex min-h-[72px] flex-col rounded-lg border p-2 text-left transition hover:bg-[var(--card)]",
                isSelected && "border-[var(--accent)] bg-[var(--card)]",
                isToday && !isSelected && "border-[var(--accent)]/40",
                !isSelected && !isToday && "border-transparent"
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  isToday && "text-[var(--accent)]"
                )}
              >
                {day}
              </span>
              {counts && (
                <div className="mt-auto flex gap-1 pt-1">
                  {counts.important > 0 && (
                    <span className="h-1.5 flex-1 rounded-full bg-[var(--important)]" />
                  )}
                  {counts.optional > 0 && (
                    <span className="h-1.5 flex-1 rounded-full bg-[var(--optional)]" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-4 text-sm text-[var(--optional)]">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--important)]" />
          Important
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--optional)]" />
          Optional
        </span>
      </div>
    </div>
  );
}
