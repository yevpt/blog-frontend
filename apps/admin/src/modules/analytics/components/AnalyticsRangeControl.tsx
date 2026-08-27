import { cn, DatePicker, parseDate } from "@repo/ui";
import type { DateValue } from "@repo/ui";
import { AdminSegmentedControl } from "../../../components/AdminSegmentedControl";
import type { AnalyticsRangePreset, AnalyticsRangeState } from "../hooks/use-analytics-range";

const PRESETS: { id: AnalyticsRangePreset; label: string }[] = [
  { id: "7d", label: "近 7 天" },
  { id: "30d", label: "近 30 天" },
  { id: "custom", label: "自定义" },
];

interface AnalyticsRangeControlProps {
  range: AnalyticsRangeState;
  className?: string;
}

function formatDateValue(value: DateValue | null) {
  return value?.toString();
}

export function AnalyticsRangeControl({ range, className }: AnalyticsRangeControlProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
      <AdminSegmentedControl
        ariaLabel="统计日期范围"
        options={PRESETS}
        value={range.preset}
        onChange={range.setPreset}
      />
      {range.preset === "custom" ? (
        <div
          role="group"
          aria-label="自定义日期范围"
          className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/70 bg-card/70 p-1 shadow-sm"
        >
          <DatePicker
            aria-label="起始日期"
            value={parseDate(range.customFrom)}
            onChange={(value) => {
              const next = formatDateValue(value);
              if (next !== undefined) range.setCustomFrom(next);
            }}
            triggerClassName="h-7 min-w-[8.75rem] border-0 bg-transparent shadow-none focus-within:ring-0"
          />
          <span aria-hidden="true" className="px-0.5 text-xs text-muted-foreground">
            至
          </span>
          <DatePicker
            aria-label="结束日期"
            value={parseDate(range.customTo)}
            onChange={(value) => {
              const next = formatDateValue(value);
              if (next !== undefined) range.setCustomTo(next);
            }}
            triggerClassName="h-7 min-w-[8.75rem] border-0 bg-transparent shadow-none focus-within:ring-0"
          />
        </div>
      ) : null}
    </div>
  );
}
