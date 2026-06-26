import { useMemo, useState } from "react";
import type { AnalyticsRangeReq } from "@repo/api";

export type AnalyticsRangePreset = "7d" | "30d" | "custom";

export type AnalyticsDateRange = Required<Pick<AnalyticsRangeReq, "from" | "to">>;

export interface AnalyticsRangeState {
  preset: AnalyticsRangePreset;
  customFrom: string;
  customTo: string;
  query: AnalyticsDateRange;
  label: string;
  setPreset: (preset: AnalyticsRangePreset) => void;
  setCustomFrom: (from: string) => void;
  setCustomTo: (to: string) => void;
}

const PRESET_DAYS: Record<Exclude<AnalyticsRangePreset, "custom">, number> = {
  "7d": 7,
  "30d": 30,
};

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildRecentRange(days: number, baseDate: Date): AnalyticsDateRange {
  const to = new Date(baseDate);
  const from = new Date(baseDate);
  from.setDate(from.getDate() - days + 1);
  return { from: formatDate(from), to: formatDate(to) };
}

function normalizeRange(from: string, to: string): AnalyticsDateRange {
  return from <= to ? { from, to } : { from: to, to: from };
}

export function useAnalyticsRange(): AnalyticsRangeState {
  const [baseDate] = useState(() => new Date());
  const defaultRange = useMemo(() => buildRecentRange(PRESET_DAYS["7d"], baseDate), [baseDate]);
  const [preset, setPreset] = useState<AnalyticsRangePreset>("7d");
  const [customFrom, setCustomFromValue] = useState(defaultRange.from);
  const [customTo, setCustomToValue] = useState(defaultRange.to);

  const query = useMemo(() => {
    if (preset === "custom") return normalizeRange(customFrom, customTo);
    return buildRecentRange(PRESET_DAYS[preset], baseDate);
  }, [baseDate, customFrom, customTo, preset]);

  const label =
    preset === "7d" ? "近 7 天" : preset === "30d" ? "近 30 天" : `${query.from} 至 ${query.to}`;

  return {
    preset,
    customFrom,
    customTo,
    query,
    label,
    setPreset,
    setCustomFrom: (from) => {
      setPreset("custom");
      setCustomFromValue(from);
    },
    setCustomTo: (to) => {
      setPreset("custom");
      setCustomToValue(to);
    },
  };
}
