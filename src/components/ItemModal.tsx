"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  deleteItem,
  registerImage,
  saveItemBundle,
  toggleSubItemComplete,
} from "@/lib/actions/items";
import { compressImage } from "@/lib/images";
import { recurrenceLabel } from "@/lib/recurrence";
import type { DayItem, Priority, RecurrenceConfig } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { RecurrenceEditor } from "./RecurrenceEditor";
import {
  Check,
  ChevronDown,
  ExternalLink,
  ImagePlus,
  Link2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type DraftLink = {
  key: string;
  id?: string;
  url: string;
  label: string;
};

type DraftSubItem = {
  key: string;
  id?: string;
  title: string;
  description: string;
  priority: Priority;
  isCompleted: boolean;
  links: DraftLink[];
  open: boolean;
};

type DraftImage = {
  key: string;
  id?: string;
  url?: string;
  storagePath?: string;
  fileName?: string;
  file?: File;
  previewUrl?: string;
};

type Mode = "view" | "edit";

interface ItemModalProps {
  item: DayItem | null;
  dateKey: string;
  isNew?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onRefresh?: () => void;
}

let draftKey = 0;
function nextKey(prefix: string) {
  draftKey += 1;
  return `${prefix}-${draftKey}`;
}

function defaultTimes(dateKey: string) {
  return { start: `${dateKey}T09:00`, end: `${dateKey}T10:00` };
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm text-[var(--optional)]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs capitalize",
        priority === "important"
          ? "border-[var(--important)]/40 bg-[var(--important)]/10 text-[var(--important)]"
          : "border-[var(--border)] text-[var(--optional)]"
      )}
    >
      {priority}
    </span>
  );
}

export function ItemModal({
  item,
  dateKey,
  isNew = false,
  onClose,
  onSaved,
  onRefresh,
}: ItemModalProps) {
  const defaults = defaultTimes(dateKey);
  const [mode, setMode] = useState<Mode>(isNew ? "edit" : "view");
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [priority, setPriority] = useState<Priority>(item?.priority ?? "optional");
  const [startTime, setStartTime] = useState(
    item?.startTime ? toLocalInput(item.startTime) : defaults.start
  );
  const [endTime, setEndTime] = useState(
    item?.endTime ? toLocalInput(item.endTime) : defaults.end
  );
  const [recurrence, setRecurrence] = useState<RecurrenceConfig | null>(
    item?.isRecurring && item.recurrenceRule
      ? { frequency: "weekly", interval: 1 }
      : null
  );
  const [editScope, setEditScope] = useState<"this" | "all">(
    item?.isRecurring ? "this" : "all"
  );
  const [links, setLinks] = useState<DraftLink[]>(
    () =>
      item?.links.map((l) => ({
        key: l.id,
        id: l.id,
        url: l.url,
        label: l.label ?? "",
      })) ?? []
  );
  const [subItems, setSubItems] = useState<DraftSubItem[]>(
    () =>
      item?.subItems.map((s) => ({
        key: s.subItemId,
        id: s.subItemId,
        title: s.title,
        description: s.description ?? "",
        priority: s.priority,
        isCompleted: s.isCompleted,
        links:
          s.links?.map((l) => ({
            key: l.id,
            id: l.id,
            url: l.url,
            label: l.label ?? "",
          })) ?? [],
        open: false,
      })) ?? []
  );
  const [images, setImages] = useState<DraftImage[]>(
    () =>
      item?.images.map((img) => ({
        key: img.id,
        id: img.id,
        url: img.url,
        storagePath: img.storage_path,
        fileName: img.file_name ?? undefined,
      })) ?? []
  );
  const [deletedLinkIds, setDeletedLinkIds] = useState<string[]>([]);
  const [deletedSubItemIds, setDeletedSubItemIds] = useState<string[]>([]);
  const [deletedSubLinkIds, setDeletedSubLinkIds] = useState<
    Record<string, string[]>
  >({});
  const [deletedImages, setDeletedImages] = useState<
    { id: string; storagePath: string }[]
  >([]);
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [visible, setVisible] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) {
        if (mode === "edit" && !isNew) setMode("view");
        else requestClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function requestClose() {
    setVisible(false);
    setTimeout(onClose, 160);
  }

  function resetDraftFromItem() {
    if (!item) return;
    setTitle(item.title);
    setDescription(item.description ?? "");
    setPriority(item.priority);
    setStartTime(item.startTime ? toLocalInput(item.startTime) : defaults.start);
    setEndTime(item.endTime ? toLocalInput(item.endTime) : defaults.end);
    setRecurrence(
      item.isRecurring && item.recurrenceRule
        ? { frequency: "weekly", interval: 1 }
        : null
    );
    setLinks(
      item.links.map((l) => ({
        key: l.id,
        id: l.id,
        url: l.url,
        label: l.label ?? "",
      }))
    );
    setSubItems(
      item.subItems.map((s) => ({
        key: s.subItemId,
        id: s.subItemId,
        title: s.title,
        description: s.description ?? "",
        priority: s.priority,
        isCompleted: s.isCompleted,
        links:
          s.links?.map((l) => ({
            key: l.id,
            id: l.id,
            url: l.url,
            label: l.label ?? "",
          })) ?? [],
        open: false,
      }))
    );
    setImages(
      item.images.map((img) => ({
        key: img.id,
        id: img.id,
        url: img.url,
        storagePath: img.storage_path,
        fileName: img.file_name ?? undefined,
      }))
    );
    setDeletedLinkIds([]);
    setDeletedSubItemIds([]);
    setDeletedSubLinkIds({});
    setDeletedImages([]);
    setError(null);
  }

  function enterEdit() {
    setMode("edit");
  }

  function cancelEdit() {
    if (isNew) {
      requestClose();
      return;
    }
    resetDraftFromItem();
    setMode("view");
  }

  function addLink() {
    setLinks((prev) => [...prev, { key: nextKey("link"), url: "", label: "" }]);
  }

  function updateLink(key: string, patch: Partial<DraftLink>) {
    setLinks((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l))
    );
  }

  function removeLink(draft: DraftLink) {
    setLinks((prev) => prev.filter((l) => l.key !== draft.key));
    if (draft.id) setDeletedLinkIds((prev) => [...prev, draft.id!]);
  }

  function addSubItem() {
    setSubItems((prev) => [
      ...prev,
      {
        key: nextKey("sub"),
        title: "",
        description: "",
        priority: "optional",
        isCompleted: false,
        links: [],
        open: true,
      },
    ]);
  }

  function updateSub(key: string, patch: Partial<DraftSubItem>) {
    setSubItems((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s))
    );
  }

  function removeSub(draft: DraftSubItem) {
    setSubItems((prev) => prev.filter((s) => s.key !== draft.key));
    if (draft.id) setDeletedSubItemIds((prev) => [...prev, draft.id!]);
  }

  function addSubLink(subKey: string) {
    setSubItems((prev) =>
      prev.map((s) =>
        s.key === subKey
          ? {
              ...s,
              links: [...s.links, { key: nextKey("slink"), url: "", label: "" }],
            }
          : s
      )
    );
  }

  function updateSubLink(
    subKey: string,
    linkKey: string,
    patch: Partial<DraftLink>
  ) {
    setSubItems((prev) =>
      prev.map((s) =>
        s.key === subKey
          ? {
              ...s,
              links: s.links.map((l) =>
                l.key === linkKey ? { ...l, ...patch } : l
              ),
            }
          : s
      )
    );
  }

  function removeSubLinkTracked(subKey: string, draft: DraftLink) {
    setSubItems((prev) =>
      prev.map((s) =>
        s.key === subKey
          ? { ...s, links: s.links.filter((l) => l.key !== draft.key) }
          : s
      )
    );
    if (draft.id) {
      setDeletedSubLinkIds((prev) => ({
        ...prev,
        [subKey]: [...(prev[subKey] ?? []), draft.id!],
      }));
    }
  }

  async function handleImagePick(files: FileList | null) {
    if (!files?.length) return;
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressed);
        setImages((prev) => [
          ...prev,
          {
            key: nextKey("img"),
            file: compressed,
            previewUrl,
            fileName: compressed.name,
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    }
  }

  function removeImage(draft: DraftImage) {
    if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    setImages((prev) => prev.filter((i) => i.key !== draft.key));
    if (draft.id && draft.storagePath) {
      setDeletedImages((prev) => [
        ...prev,
        { id: draft.id!, storagePath: draft.storagePath! },
      ]);
    }
  }

  function save() {
    if (!title.trim()) {
      setError("Give this activity a title.");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const result = await saveItemBundle({
          isNew,
          dateKey,
          itemId: item?.masterItemId,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          startTime: startTime ? new Date(startTime).toISOString() : null,
          endTime: endTime ? new Date(endTime).toISOString() : null,
          recurrence,
          scope: editScope,
          instanceDate: item?.instanceDate ?? dateKey,
          links: links
            .filter((l) => l.url.trim())
            .map((l) => ({
              id: l.id,
              url: l.url.trim(),
              label: l.label.trim() || null,
            })),
          deletedLinkIds,
          subItems: subItems
            .filter((s) => s.title.trim())
            .map((s) => ({
              id: s.id,
              title: s.title.trim(),
              description: s.description.trim() || null,
              priority: s.priority,
              isCompleted: s.isCompleted,
              links: s.links
                .filter((l) => l.url.trim())
                .map((l) => ({
                  id: l.id,
                  url: l.url.trim(),
                  label: l.label.trim() || null,
                })),
              deletedLinkIds: deletedSubLinkIds[s.key] ?? [],
            })),
          deletedSubItemIds,
          deletedImageIds: deletedImages,
        });

        const pendingFiles = images.filter((i) => i.file);
        if (pendingFiles.length) {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            for (const img of pendingFiles) {
              const path = `${user.id}/${result.itemId}/${Date.now()}-${img.fileName}`;
              const { error: uploadError } = await supabase.storage
                .from("item-images")
                .upload(path, img.file!);
              if (uploadError) throw uploadError;
              await registerImage({
                storagePath: path,
                fileName: img.fileName ?? "image.webp",
                fileSize: img.file!.size,
                itemId: result.itemId,
              });
            }
          }
        }

        setVisible(false);
        setTimeout(onSaved, 160);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  function handleDelete() {
    if (isNew || !item) {
      requestClose();
      return;
    }
    if (!confirm("Delete this activity?")) return;
    startTransition(async () => {
      await deleteItem(item.masterItemId, editScope, item.instanceDate);
      setVisible(false);
      setTimeout(onSaved, 160);
    });
  }

  function handleToggleComplete(subItemId: string, completed: boolean) {
    if (!item) return;
    setSubItems((prev) =>
      prev.map((s) =>
        s.id === subItemId ? { ...s, isCompleted: completed } : s
      )
    );
    startTransition(async () => {
      await toggleSubItemComplete(
        item.masterItemId,
        subItemId,
        completed,
        item.isRecurring ? item.instanceDate : undefined
      );
      onRefresh?.();
    });
  }

  const displayTitle = item?.title ?? title;
  const displayPriority = item?.priority ?? priority;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4",
        "transition-colors duration-200",
        visible ? "bg-black/55" : "bg-black/0"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) requestClose();
      }}
    >
      <div
        className={cn(
          "flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl sm:rounded-2xl",
          "transition-all duration-200 ease-out",
          visible
            ? "translate-y-0 opacity-100 sm:scale-100"
            : "translate-y-4 opacity-0 sm:scale-[0.98]"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-semibold">
            {isNew
              ? "New activity"
              : mode === "edit"
                ? "Edit activity"
                : "Activity"}
          </h2>
          <div className="flex items-center gap-1">
            {mode === "view" && !isNew && (
              <button
                type="button"
                onClick={enterEdit}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-[var(--accent)] transition hover:bg-[var(--accent)]/10"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={requestClose}
              disabled={pending}
              className="rounded-lg p-1.5 text-[var(--optional)] transition hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {mode === "view" && item ? (
            <>
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-2xl font-semibold leading-tight">
                    {displayTitle}
                  </h3>
                  <PriorityBadge priority={displayPriority} />
                </div>
                {(item.startTime || item.endTime) && (
                  <p className="text-[var(--optional)]">
                    {formatTime(item.startTime)}
                    {item.endTime ? ` – ${formatTime(item.endTime)}` : ""}
                  </p>
                )}
                {item.isRecurring && (
                  <p className="text-sm text-[var(--accent)]">
                    {recurrenceLabel(item.recurrenceRule)}
                  </p>
                )}
                {item.description ? (
                  <p className="whitespace-pre-wrap text-[var(--foreground)]/90">
                    {item.description}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--optional)]">No description.</p>
                )}
              </div>

              <section className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium text-[var(--optional)]">
                  <Link2 className="h-4 w-4" />
                  Links
                </h4>
                {item.links.length > 0 ? (
                  <ul className="space-y-2">
                    {item.links.map((link) => (
                      <li key={link.id}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--accent)] transition hover:bg-[var(--card-hover)]"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {link.label || link.url}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--optional)]">No links.</p>
                )}
              </section>

              <section className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium text-[var(--optional)]">
                  <ImagePlus className="h-4 w-4" />
                  Images
                </h4>
                {item.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {item.images.map((img) => (
                      <div
                        key={img.id}
                        className="aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]"
                      >
                        {img.url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img.url}
                            alt={img.file_name ?? ""}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--optional)]">No images.</p>
                )}
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-medium text-[var(--optional)]">
                  Sub-items
                </h4>
                {subItems.length > 0 ? (
                  <div className="space-y-2">
                    {subItems.map((sub) => {
                      const open = expandedSubs[sub.key] ?? false;
                      return (
                        <div
                          key={sub.key}
                          className="rounded-xl border border-[var(--border)] bg-[var(--background)]/60"
                        >
                          <div className="flex items-start gap-3 p-3">
                            <button
                              type="button"
                              disabled={!sub.id || pending}
                              onClick={() =>
                                sub.id &&
                                handleToggleComplete(sub.id, !sub.isCompleted)
                              }
                              className={cn(
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                                sub.isCompleted
                                  ? "border-green-500 bg-green-500/20 text-green-500"
                                  : "border-[var(--border)] hover:border-white/30"
                              )}
                              title="Toggle complete"
                            >
                              {sub.isCompleted && <Check className="h-3 w-3" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p
                                  className={cn(
                                    "font-medium",
                                    sub.isCompleted &&
                                      "text-[var(--optional)] line-through"
                                  )}
                                >
                                  {sub.title}
                                </p>
                                <PriorityBadge priority={sub.priority} />
                              </div>
                              {(sub.description || sub.links.length > 0) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedSubs((prev) => ({
                                      ...prev,
                                      [sub.key]: !open,
                                    }))
                                  }
                                  className="mt-1 flex items-center gap-1 text-xs text-[var(--optional)] transition hover:text-[var(--foreground)]"
                                >
                                  <ChevronDown
                                    className={cn(
                                      "h-3.5 w-3.5 transition",
                                      open && "rotate-180"
                                    )}
                                  />
                                  Details
                                </button>
                              )}
                            </div>
                          </div>
                          {open && (
                            <div className="space-y-2 border-t border-[var(--border)] px-3 py-3">
                              {sub.description ? (
                                <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]/85">
                                  {sub.description}
                                </p>
                              ) : (
                                <p className="text-sm text-[var(--optional)]">
                                  No description.
                                </p>
                              )}
                              {sub.links.length > 0 && (
                                <ul className="space-y-1.5">
                                  {sub.links.map((link) => (
                                    <li key={link.key}>
                                      <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        {link.label || link.url}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--optional)]">No sub-items.</p>
                )}
              </section>
            </>
          ) : (
            <>
              {item?.isRecurring && !isNew && (
                <div className="flex gap-1 rounded-xl bg-[var(--background)] p-1">
                  {(["this", "all"] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setEditScope(scope)}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-2 text-sm transition",
                        editScope === scope
                          ? "bg-[var(--accent)] text-white shadow-sm"
                          : "text-[var(--optional)] hover:text-[var(--foreground)]"
                      )}
                    >
                      {scope === "this" ? "This event" : "All events"}
                    </button>
                  ))}
                </div>
              )}

              <Field label="Title" htmlFor={titleId}>
                <input
                  id={titleId}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What are you working on?"
                  autoFocus
                  className="field-input"
                />
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Start">
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="field-input"
                  />
                </Field>
                <Field label="End">
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="field-input"
                  />
                </Field>
              </div>

              <Field label="Priority">
                <div className="flex gap-2">
                  {(["important", "optional"] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        "flex-1 rounded-xl border px-3 py-2.5 text-sm capitalize transition",
                        priority === p
                          ? p === "important"
                            ? "border-[var(--important)] bg-[var(--important)]/10 text-[var(--important)]"
                            : "border-[var(--optional)] bg-white/5 text-white"
                          : "border-[var(--border)] text-[var(--optional)] hover:border-white/20"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </Field>

              {(editScope === "all" || !item?.isRecurring || isNew) && (
                <RecurrenceEditor value={recurrence} onChange={setRecurrence} />
              )}

              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Notes for this activity…"
                  className="field-input resize-y"
                />
              </Field>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <Link2 className="h-4 w-4 text-[var(--optional)]" />
                    Links
                  </h3>
                  <button
                    type="button"
                    onClick={addLink}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-[var(--accent)] transition hover:bg-[var(--accent)]/10"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {links.map((link) => (
                    <div key={link.key} className="flex gap-2">
                      <input
                        value={link.url}
                        onChange={(e) =>
                          updateLink(link.key, { url: e.target.value })
                        }
                        placeholder="https://…"
                        className="field-input flex-1"
                      />
                      <input
                        value={link.label}
                        onChange={(e) =>
                          updateLink(link.key, { label: e.target.value })
                        }
                        placeholder="Label"
                        className="field-input w-28"
                      />
                      <button
                        type="button"
                        onClick={() => removeLink(link)}
                        className="rounded-lg px-2 text-[var(--optional)] transition hover:text-[var(--important)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {links.length === 0 && (
                    <p className="text-sm text-[var(--optional)]">No links yet.</p>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <ImagePlus className="h-4 w-4 text-[var(--optional)]" />
                    Images
                  </h3>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-[var(--accent)] transition hover:bg-[var(--accent)]/10"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void handleImagePick(e.target.files);
                    e.target.value = "";
                  }}
                />
                {images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img) => (
                      <div
                        key={img.key}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]"
                      >
                        {(img.previewUrl || img.url) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img.previewUrl || img.url}
                            alt={img.fileName ?? ""}
                            className="h-full w-full object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(img)}
                          className="absolute right-1.5 top-1.5 rounded-md bg-black/70 p-1 opacity-0 transition group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-sm text-[var(--optional)] transition hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Add images (max 5MB, compressed)
                  </button>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Sub-items</h3>
                  <button
                    type="button"
                    onClick={addSubItem}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-[var(--accent)] transition hover:bg-[var(--accent)]/10"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>

                <div className="space-y-2">
                  {subItems.map((sub) => (
                    <div
                      key={sub.key}
                      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]/60 transition"
                    >
                      <div className="flex items-start gap-2 p-3">
                        <button
                          type="button"
                          onClick={() =>
                            updateSub(sub.key, {
                              isCompleted: !sub.isCompleted,
                            })
                          }
                          className={cn(
                            "mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                            sub.isCompleted
                              ? "border-green-500 bg-green-500/20 text-green-500"
                              : "border-[var(--border)] hover:border-white/30"
                          )}
                        >
                          {sub.isCompleted && <Check className="h-3 w-3" />}
                        </button>
                        <div className="min-w-0 flex-1 space-y-2">
                          <input
                            value={sub.title}
                            onChange={(e) =>
                              updateSub(sub.key, { title: e.target.value })
                            }
                            placeholder="Sub-item title"
                            className={cn(
                              "field-input",
                              sub.isCompleted &&
                                "text-[var(--optional)] line-through"
                            )}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateSub(sub.key, { open: !sub.open })
                            }
                            className="flex items-center gap-1 text-xs text-[var(--optional)] transition hover:text-[var(--foreground)]"
                          >
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 transition",
                                sub.open && "rotate-180"
                              )}
                            />
                            {sub.open ? "Hide details" : "Description & links"}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSub(sub)}
                          className="mt-2 rounded-lg p-1 text-[var(--optional)] transition hover:text-[var(--important)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {sub.open && (
                        <div className="space-y-3 border-t border-[var(--border)] px-3 py-3">
                          <textarea
                            value={sub.description}
                            onChange={(e) =>
                              updateSub(sub.key, {
                                description: e.target.value,
                              })
                            }
                            rows={2}
                            placeholder="Sub-item description…"
                            className="field-input resize-y"
                          />
                          <div className="flex gap-2">
                            {(["important", "optional"] as Priority[]).map(
                              (p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() =>
                                    updateSub(sub.key, { priority: p })
                                  }
                                  className={cn(
                                    "rounded-lg border px-2.5 py-1 text-xs capitalize transition",
                                    sub.priority === p
                                      ? p === "important"
                                        ? "border-[var(--important)] text-[var(--important)]"
                                        : "border-[var(--optional)] text-white"
                                      : "border-[var(--border)] text-[var(--optional)]"
                                  )}
                                >
                                  {p}
                                </button>
                              )
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[var(--optional)]">
                                Links
                              </span>
                              <button
                                type="button"
                                onClick={() => addSubLink(sub.key)}
                                className="text-xs text-[var(--accent)] hover:underline"
                              >
                                + Add link
                              </button>
                            </div>
                            {sub.links.map((link) => (
                              <div key={link.key} className="flex gap-2">
                                <input
                                  value={link.url}
                                  onChange={(e) =>
                                    updateSubLink(sub.key, link.key, {
                                      url: e.target.value,
                                    })
                                  }
                                  placeholder="https://…"
                                  className="field-input flex-1 text-sm"
                                />
                                <input
                                  value={link.label}
                                  onChange={(e) =>
                                    updateSubLink(sub.key, link.key, {
                                      label: e.target.value,
                                    })
                                  }
                                  placeholder="Label"
                                  className="field-input w-24 text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeSubLinkTracked(sub.key, link)
                                  }
                                  className="text-[var(--optional)] hover:text-[var(--important)]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {subItems.length === 0 && (
                    <button
                      type="button"
                      onClick={addSubItem}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--optional)] transition hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
                    >
                      <Plus className="h-4 w-4" />
                      Add sub-items (saved with the activity)
                    </button>
                  )}
                </div>
              </section>

              {error && (
                <p className="rounded-xl border border-[var(--important)]/40 bg-[var(--important)]/10 px-3 py-2 text-sm text-[var(--important)]">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4">
          {mode === "view" ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--important)] transition hover:bg-[var(--important)]/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={requestClose}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm transition hover:bg-[var(--card-hover)]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={enterEdit}
                  className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--important)] transition hover:bg-[var(--important)]/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {isNew ? "Discard" : "Delete"}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={pending}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm transition hover:bg-[var(--card-hover)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={pending}
                  className="rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {pending ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
