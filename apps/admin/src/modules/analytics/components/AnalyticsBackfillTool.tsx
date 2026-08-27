import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, type AnalyticsBackfillResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, DatePicker, parseDate, type DateValue } from "@repo/ui";
import { AdminPanel } from "../../../components/AdminPanel";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";
import type { AnalyticsDateRange } from "../hooks/use-analytics-range";

interface AnalyticsBackfillToolProps {
  range: AnalyticsDateRange;
}

const MAX_BACKFILL_DAYS = 92;

function formatDateValue(value: DateValue | null) {
  return value?.toString();
}

function normalizeRange(from: string, to: string): AnalyticsDateRange {
  return from <= to ? { from, to } : { from: to, to: from };
}

function countInclusiveDays(from: string, to: string) {
  const start = new Date(`${from}T00:00:00+08:00`);
  const end = new Date(`${to}T00:00:00+08:00`);
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000) + 1;
}

export function AnalyticsBackfillTool({ range }: AnalyticsBackfillToolProps) {
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyticsBackfillResp | null>(null);

  useEffect(() => {
    setFrom(range.from);
    setTo(range.to);
    setError(null);
    setResult(null);
  }, [range.from, range.to]);

  const normalizedRange = useMemo(() => normalizeRange(from, to), [from, to]);
  const inclusiveDays = useMemo(
    () => countInclusiveDays(normalizedRange.from, normalizedRange.to),
    [normalizedRange.from, normalizedRange.to],
  );

  const handleSubmit = useCallback(async () => {
    if (inclusiveDays > MAX_BACKFILL_DAYS) {
      const message = `回填跨度不能超过 ${MAX_BACKFILL_DAYS} 天`;
      setError(message);
      addToast(message, "error");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const data = await apiClient.analytics.backfill(normalizedRange);
      setResult(data);
      addToast(`已回填 ${data.days} 天日聚合`, "success");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "回填失败，请稍后重试";
      setError(message);
      addToast(message, "error");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [inclusiveDays, normalizedRange]);

  return (
    <AdminPanel
      title={
        <span className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-primary-soft text-primary">
            <SvgIcon name="refresh-cw" size={14} />
          </span>
          回填日聚合
        </span>
      }
      description={`用于统计规则调整或补漏天，单次最多 ${MAX_BACKFILL_DAYS} 天。`}
      action={
        <span className="inline-flex rounded-full bg-muted/60 px-2.5 py-1 text-xs tabular-nums text-muted-foreground">
          {normalizedRange.from} 至 {normalizedRange.to}
        </span>
      }
      className="shadow-none"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,11rem)_minmax(0,11rem)_auto_1fr] lg:items-end">
        <div className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">
          <span>起始日期</span>
          <DatePicker
            aria-label="回填起始日期"
            value={parseDate(from)}
            onChange={(value) => {
              const next = formatDateValue(value);
              if (next !== undefined) setFrom(next);
            }}
            triggerClassName="h-9 w-full rounded-lg"
          />
        </div>
        <div className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">
          <span>结束日期</span>
          <DatePicker
            aria-label="回填结束日期"
            value={parseDate(to)}
            onChange={(value) => {
              const next = formatDateValue(value);
              if (next !== undefined) setTo(next);
            }}
            triggerClassName="h-9 w-full rounded-lg"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="h-9 shrink-0 px-4"
          isLoading={isSubmitting}
          onPress={() => void handleSubmit().catch(() => undefined)}
        >
          执行回填
        </Button>
        <div className="min-h-5 text-xs leading-5 text-muted-foreground lg:text-right">
          {error ? (
            <span role="alert" className="text-destructive">
              {error}
            </span>
          ) : null}
          {!error && result ? (
            <span>
              已完成 {result.days} 天：{result.from} 至 {result.to}
            </span>
          ) : null}
        </div>
      </div>
    </AdminPanel>
  );
}
