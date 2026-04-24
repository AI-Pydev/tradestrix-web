"use client";

export type HistoryView = "today" | "history";
export type HistoryPreset = "yesterday" | "last7" | "last30" | "custom";

export function parseIsoDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function localDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftLocalDate(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

export function withinInclusiveDateRange(valueKey: string, startKey?: string, endKey?: string) {
  if (!valueKey) {
    return false;
  }
  if (startKey && valueKey < startKey) {
    return false;
  }
  if (endKey && valueKey > endKey) {
    return false;
  }
  return true;
}

export function matchesHistoryWindow(valueKey: string, preset: HistoryPreset, customFrom: string, customTo: string) {
  const now = new Date();
  const yesterdayKey = localDateKey(shiftLocalDate(now, -1));
  const last7StartKey = localDateKey(shiftLocalDate(now, -7));
  const last30StartKey = localDateKey(shiftLocalDate(now, -30));

  if (preset === "yesterday") {
    return withinInclusiveDateRange(valueKey, yesterdayKey, yesterdayKey);
  }
  if (preset === "last7") {
    return withinInclusiveDateRange(valueKey, last7StartKey, yesterdayKey);
  }
  if (preset === "last30") {
    return withinInclusiveDateRange(valueKey, last30StartKey, yesterdayKey);
  }
  return withinInclusiveDateRange(valueKey, customFrom || undefined, customTo || undefined);
}

