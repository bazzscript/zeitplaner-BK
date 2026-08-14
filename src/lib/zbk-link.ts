const MARKER = "Open in ZBK:";

export function itemDeepLink(dateKey: string, itemId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return `${base}/?date=${dateKey}&item=${itemId}`;
}

export function withZbkLink(
  description: string | null | undefined,
  dateKey: string,
  itemId: string
): string {
  const cleaned = (description ?? "")
    .split("\n")
    .filter((line) => !line.trim().startsWith(MARKER))
    .join("\n")
    .trim();
  const linkLine = `${MARKER} ${itemDeepLink(dateKey, itemId)}`;
  return cleaned ? `${cleaned}\n\n${linkLine}` : linkLine;
}

export function stripZbkLink(description: string | null | undefined): string {
  return (description ?? "")
    .split("\n")
    .filter((line) => !line.trim().startsWith(MARKER))
    .join("\n")
    .trim();
}
