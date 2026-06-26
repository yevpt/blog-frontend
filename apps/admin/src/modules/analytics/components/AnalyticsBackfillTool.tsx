import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, type AnalyticsBackfillResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, Card, CardContent, DatePicker, parseDate, type DateValue } from "@repo/ui";
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
    <Card>
      <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <SvgIcon name="refresh-cw" size={15} />
            <span>回填日聚合</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            适用于统计规则调整或补漏天，单次最多 {MAX_BACKFILL_DAYS} 天。
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <DatePicker
            aria-label="回填起始日期"
            value={parseDate(from)}
            onChange={(value) => {
              const next = formatDateValue(value);
              if (next !== undefined) setFrom(next);
            }}
            triggerClassName="h-8 min-w-[9.5rem] rounded-md"
          />
          <DatePicker
            aria-label="回填结束日期"
            value={parseDate(to)}
            onChange={(value) => {
              const next = formatDateValue(value);
              if (next !== undefined) setTo(next);
            }}
            triggerClassName="h-8 min-w-[9.5rem] rounded-md"
          />
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            isLoading={isSubmitting}
            onPress={() => void handleSubmit().catch(() => undefined)}
          >
            执行回填
          </Button>
        </div>

        <div className="text-sm text-muted-foreground lg:min-w-48 lg:text-right">
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
          {!error && !result ? (
            <span>
              {normalizedRange.from} 至 {normalizedRange.to}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
