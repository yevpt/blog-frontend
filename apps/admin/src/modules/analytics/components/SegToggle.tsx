import { cn } from "@repo/ui";

interface SegToggleProps<T extends string> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** 轻量分段切换：用于 metric/segment/维度等少量互斥选项。 */
export function SegToggle<T extends string>({ options, value, onChange }: SegToggleProps<T>) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "rounded-md px-3 py-1 text-sm transition-colors",
            value === opt.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
