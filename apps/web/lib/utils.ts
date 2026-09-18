import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTND(amount: number | string | null | undefined) {
  const n = Number(amount ?? 0);
  const formatted = n.toFixed(3).replace(".", ",");
  return `${formatted}\u00a0DT`;
}

export function formatDateTN(iso?: string | Date | null) {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-TN", { day: "2-digit", month: "short", year: "numeric" });
}

export function daysLeft(iso?: string | Date | null) {
  if (!iso) return 0;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
}
