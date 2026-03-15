export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = iso.split("T")[0].split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}-${m}-${y.slice(2)}`;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
