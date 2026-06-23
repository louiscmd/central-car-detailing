import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | bigint | null | undefined): string {
  if (n == null) return "—";
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function formatPercent(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatMonthYear(month: number, year: number): string {
  return format(new Date(year, month - 1), "MMMM yyyy");
}

export function getMonthRange(month: number, year: number) {
  const d = new Date(year, month - 1, 1);
  return {
    start: startOfMonth(d),
    end: endOfMonth(d),
  };
}

export function getDaysInMonth(month: number, year: number): Date[] {
  const { start, end } = getMonthRange(month, year);
  return eachDayOfInterval({ start, end });
}

export function calculateEngagementRate(
  likes: number,
  comments: number,
  followers: number
): number {
  if (followers === 0) return 0;
  return ((likes + comments) / followers) * 100;
}

export function bigIntToNumber(val: bigint | null | undefined): number | null {
  if (val == null) return null;
  return Number(val);
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function randomDelay(minMs: number, maxMs: number) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return sleep(delay);
}

export function platformColor(platform: string): string {
  const colors: Record<string, string> = {
    INSTAGRAM: "#E1306C",
    TIKTOK: "#25F4EE",
    FACEBOOK: "#1877F2",
    YOUTUBE: "#FF0000",
  };
  return colors[platform] ?? "#6B7280";
}

export function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    INSTAGRAM: "Instagram",
    TIKTOK: "TikTok",
    FACEBOOK: "Facebook",
    YOUTUBE: "YouTube",
  };
  return labels[platform] ?? platform;
}

export function currentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}
