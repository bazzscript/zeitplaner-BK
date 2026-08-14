"use client";

import { useEffect, useState } from "react";
import { DayView } from "./DayView";
import { MonthView } from "./MonthView";
import { ThemeToggle } from "./ThemeToggle";
import { signOut } from "@/lib/actions/items";
import { cn } from "@/lib/utils";
import { Calendar, LayoutGrid, LogOut, Menu, X } from "lucide-react";

interface AppShellProps {
  userName: string;
  userAvatar?: string | null;
  initialDate: string;
}

export function AppShell({ userName, userAvatar, initialDate }: AppShellProps) {
  const [view, setView] = useState<"day" | "month">("day");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const d = new Date(initialDate + "T12:00:00");
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function selectView(next: "day" | "month") {
    setView(next);
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-xl p-2 text-[var(--foreground)] transition hover:bg-[var(--card)]"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1
            className="text-lg font-extrabold tracking-[0.18em]"
            title="zeitplaner-bk"
          >
            ZBK
          </h1>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/45 transition-opacity duration-200",
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18.5rem,88vw)] flex-col border-r border-[var(--border)] bg-[var(--card)] shadow-2xl transition-transform duration-200 ease-out",
          menuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!menuOpen}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <span className="text-lg font-extrabold tracking-[0.18em]">ZBK</span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="rounded-xl p-2 text-[var(--optional)] transition hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          <div>
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[var(--optional)]">
              View
            </p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => selectView("day")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  view === "day"
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--foreground)] hover:bg-[var(--card-hover)]"
                )}
              >
                <Calendar className="h-4 w-4" />
                Day
              </button>
              <button
                type="button"
                onClick={() => selectView("month")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  view === "month"
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--foreground)] hover:bg-[var(--card-hover)]"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                Month
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[var(--optional)]">
              Appearance
            </p>
            <div className="flex items-center justify-between rounded-xl px-3 py-2">
              <span className="text-sm">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </nav>

        <div className="border-t border-[var(--border)] p-4">
          <div className="mb-3 flex items-center gap-3">
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userAvatar}
                alt=""
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--background)] text-sm font-semibold">
                {userName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="text-xs text-[var(--optional)]">Signed in with Google</p>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm transition hover:bg-[var(--card-hover)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {view === "day" ? (
          <DayView dateKey={selectedDate} onDateChange={setSelectedDate} />
        ) : (
          <MonthView
            year={monthAnchor.year}
            month={monthAnchor.month}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setView("day");
            }}
            onMonthChange={setMonthAnchor}
          />
        )}
      </main>
    </div>
  );
}
