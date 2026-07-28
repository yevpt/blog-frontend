import { Button, cn, DatePicker, parseDate } from "@repo/ui";
import type { DateValue } from "@repo/ui";
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
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
        {PRESETS.map((preset) => (
          <Button
            key={preset.id}
            variant={range.preset === preset.id ? "outline" : "ghost"}
            size="sm"
            aria-pressed={range.preset === preset.id}
            className={cn(
              "h-7 border-0 px-2.5 shadow-none",
              range.preset === preset.id
                ? "bg-card text-foreground shadow-sm"
                : "text-foreground/70",
            )}
            onPress={() => range.setPreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      {range.preset === "custom" ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>起始日期</span>
          <DatePicker
            aria-label="起始日期"
            value={parseDate(range.customFrom)}
            onChange={(value) => {
              const next = formatDateValue(value);
              if (next !== undefined) range.setCustomFrom(next);
            }}
            triggerClassName="h-8 min-w-[9.5rem] rounded-md"
          />
          <span>结束日期</span>
          <DatePicker
            aria-label="结束日期"
            value={parseDate(range.customTo)}
            onChange={(value) => {
              const next = formatDateValue(value);
              if (next !== undefined) range.setCustomTo(next);
            }}
            triggerClassName="h-8 min-w-[9.5rem] rounded-md"
          />
        </div>
      ) : null}
    </div>
  );
}
