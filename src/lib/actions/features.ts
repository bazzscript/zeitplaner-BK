"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDayItems } from "@/lib/actions/items";
import { formatDateKey, parseDateKey } from "@/lib/utils";
import type {
  ActivityTemplate,
  CarryOverRow,
  Priority,
  SearchHit,
} from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function getCarryOver(todayKey: string): Promise<CarryOverRow[]> {
  const rows: CarryOverRow[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = parseDateKey(todayKey);
    d.setDate(d.getDate() - i);
    const dateKey = formatDateKey(d);
    const items = await getDayItems(dateKey);
    for (const item of items) {
      for (const sub of item.subItems) {
        if (sub.priority !== "important") continue;
        if (sub.isCompleted) continue;
        rows.push({ dateKey, item, sub });
      }
    }
  }
  return rows;
}

export async function searchActivities(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const { supabase, user } = await requireUser();
  const like = `%${q}%`;

  const { data: items } = await supabase
    .from("items")
    .select("id, title, start_time")
    .eq("user_id", user.id)
    .ilike("title", like)
    .limit(30);

  const { data: subs } = await supabase
    .from("sub_items")
    .select("id, title, item_id, items(title, start_time)")
    .eq("user_id", user.id)
    .ilike("title", like)
    .limit(30);

  const hits: SearchHit[] = [];

  for (const item of items ?? []) {
    hits.push({
      itemId: item.id,
      dateKey: item.start_time
        ? formatDateKey(new Date(item.start_time))
        : formatDateKey(new Date()),
      title: item.title,
    });
  }

  for (const sub of subs ?? []) {
    const parent = sub.items as
      | { title: string; start_time: string | null }
      | { title: string; start_time: string | null }[]
      | null;
    const p = Array.isArray(parent) ? parent[0] : parent;
    hits.push({
      itemId: sub.item_id,
      subItemId: sub.id,
      dateKey: p?.start_time
        ? formatDateKey(new Date(p.start_time))
        : formatDateKey(new Date()),
      title: sub.title,
      parentTitle: p?.title,
    });
  }

  return hits.slice(0, 40);
}

export async function listTemplates(): Promise<ActivityTemplate[]> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("activity_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  return (data ?? []) as ActivityTemplate[];
}

export async function saveTemplate(payload: {
  name: string;
  title: string;
  description?: string | null;
  priority: Priority;
  body: ActivityTemplate["body"];
}) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("activity_templates").insert({
    user_id: user.id,
    name: payload.name.trim() || payload.title || "Template",
    title: payload.title,
    description: payload.description ?? null,
    priority: payload.priority,
    body: payload.body,
  });
  if (error) throw error;
  revalidatePath("/");
}

export async function deleteTemplate(id: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("activity_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/");
}
