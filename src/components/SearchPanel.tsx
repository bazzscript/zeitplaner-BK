"use client";

import { useState, useTransition } from "react";
import { searchActivities } from "@/lib/actions/features";
import type { SearchHit } from "@/lib/types";
import { Search } from "lucide-react";

export function SearchPanel({
  onPick,
}: {
  onPick: (hit: SearchHit) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pending, startTransition] = useTransition();

  function run(value: string) {
    setQuery(value);
    startTransition(async () => {
      const results = await searchActivities(value);
      setHits(results);
    });
  }

  return (
    <div className="px-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--optional)]" />
        <input
          value={query}
          onChange={(e) => run(e.target.value)}
          placeholder="Search activities…"
          className="field-input with-leading-icon"
        />
      </div>
      {query.length >= 2 && (
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
          {pending && hits.length === 0 && (
            <li className="px-2 py-2 text-xs text-[var(--optional)]">Searching…</li>
          )}
          {!pending && hits.length === 0 && (
            <li className="px-2 py-2 text-xs text-[var(--optional)]">No matches</li>
          )}
          {hits.map((hit) => (
            <li key={`${hit.itemId}-${hit.subItemId ?? "item"}`}>
              <button
                type="button"
                onClick={() => onPick(hit)}
                className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-[var(--card-hover)]"
              >
                <span className="block truncate font-medium">{hit.title}</span>
                <span className="block text-xs text-[var(--optional)]">
                  {hit.parentTitle ? `${hit.parentTitle} · ` : ""}
                  {hit.dateKey}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
