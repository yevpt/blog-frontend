import type { ReactNode } from "react";
import { Badge, cn } from "@repo/ui";
import type { AdminModerationRuleStatusResp } from "@repo/api";
import { formatBytes, formatDateTime } from "../model";

interface RuleStatusSummaryProps {
  status: AdminModerationRuleStatusResp | null;
  isLoading: boolean;
}

const CANDIDATE_LABELS: Record<string, string> = {
  building: "构建中",
  ready: "待发布",
  publishing: "发布中",
  failed: "失败",
};

function StatBlock({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium text-foreground">{value}</div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function RuleStatusSummary({ status, isLoading }: RuleStatusSummaryProps) {
  if (isLoading && !status) {
    return (
      <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
        加载规则集状态…
      </p>
    );
  }
  if (!status) return null;

  const candidate = status.candidate;

  return (
    <section
      aria-label="规则集状态"
      className="shrink-0 rounded-lg border border-border/80 bg-card px-4 py-3"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatBlock
          label="当前版本"
          value={`#${status.current_ruleset_id}`}
          hint={`更新于 ${formatDateTime(status.updated_at)}`}
        />
        <StatBlock
          label="规则数量"
          value={`${status.rule_count.toLocaleString()} 条`}
          hint={`关键词 ${status.keyword_count} · 正则 ${status.regexp_count} · 组合 ${status.composite_count}`}
        />
        <StatBlock
          label="索引内存"
          value={formatBytes(status.index_bytes)}
          hint={`构建峰值 ${formatBytes(status.build_peak_bytes)}`}
        />
        <StatBlock
          label="候选任务"
          value={
            candidate ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">#{candidate.ruleset_id}</Badge>
                <span>{CANDIDATE_LABELS[candidate.status] ?? candidate.status}</span>
              </div>
            ) : (
              "无"
            )
          }
        />
      </div>
    </section>
  );
}
