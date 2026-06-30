import { Badge, cn } from "@repo/ui";
import {
  reviewStatusVariant,
  riskLevelVariant,
  publicStateVariant,
  type ModerationRow,
} from "../model";

export function ModerationReviewDetails({ item }: { item: ModerationRow }) {
  const deleted = item.lifecycleState === "deleted";
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={riskLevelVariant(item.riskLevel)}>{item.riskLabel}</Badge>
        <Badge variant={reviewStatusVariant(item.reviewStatus)}>{item.reviewLabel}</Badge>
        <Badge variant="secondary">{item.policyLabel}</Badge>
        <Badge variant={publicStateVariant(item.publicState)}>{item.publicStateLabel}</Badge>
      </div>
      <section className="grid min-w-0 gap-4 md:grid-cols-2">
        <ContentVersion title="原始提交" content={item.submittedContent || "（空）"} />
        <ContentVersion
          title="当前公开版本"
          content={item.publishedContent || "（尚未发布）"}
          muted
        />
      </section>
      {item.momentOptions ? (
        <p className="text-sm text-muted-foreground">
          碎语选项：状态 {item.momentOptions.status === 1 ? "公开" : "隐藏"} · 评论{" "}
          {item.momentOptions.comment_status === 1 ? "允许" : "关闭"}
        </p>
      ) : null}
      {item.decisionType ? (
        <p className="text-sm text-muted-foreground">
          上次决定：{decisionLabel(item.decisionType)}
          {item.decisionReason ? ` · ${item.decisionReason}` : ""}
          {item.reviewedAt ? ` · ${item.reviewedAt}` : ""}
        </p>
      ) : null}
      {item.emergencyHideReason ? (
        <section className="grid min-w-0 gap-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive">紧急隐藏</p>
          <p className="text-sm leading-6 text-foreground">{item.emergencyHideReason}</p>
          {item.emergencyHiddenAt ? (
            <p className="text-xs text-muted-foreground">隐藏时间：{item.emergencyHiddenAt}</p>
          ) : null}
        </section>
      ) : null}
      {deleted ? (
        <p className="text-sm text-destructive">该内容已被删除，无法审核或恢复。</p>
      ) : null}
    </div>
  );
}

function ContentVersion({
  title,
  content,
  muted = false,
}: {
  title: string;
  content: string;
  muted?: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <pre
        className={cn(
          "min-h-32 whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/20 p-3 text-sm leading-6",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {content}
      </pre>
    </div>
  );
}

function decisionLabel(type: "approved" | "corrected" | "rejected"): string {
  if (type === "approved") return "通过";
  if (type === "corrected") return "修正后通过";
  return "驳回";
}
