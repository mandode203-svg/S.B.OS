import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";
}

export function formatDate(dateStr: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(dateStr));
}

export function formatDateTime(dateStr: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(dateStr));
}

export function timeAgo(dateStr: string | Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

export function getToken(): string | null {
  return localStorage.getItem("smartorder_token");
}

export function setToken(token: string): void {
  localStorage.setItem("smartorder_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("smartorder_token");
  localStorage.removeItem("smartorder_business");
}

export function getStoredBusiness(): { id: string; name: string; slug: string; type: string } | null {
  try {
    const raw = localStorage.getItem("smartorder_business");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setBusiness(b: { id: string; name: string; slug: string; type: string }): void {
  localStorage.setItem("smartorder_business", JSON.stringify(b));
}
