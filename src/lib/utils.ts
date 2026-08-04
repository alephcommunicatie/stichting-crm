import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function initials(first: string, last?: string | null) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

export function fullName(c: { first_name: string; last_name?: string | null }) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ");
}
