import type { ReactNode } from "react";
import { Badge, cn } from "@repo/ui";
import {
  reviewStatusVariant,
  riskLevelVariant,
  publicStateVariant,
  type ModerationRow,
} from "../model";
import { useModerationRevisionImages } from "../hooks/use-moderation-revision-images";
import { ModerationContentPreview } from "./ModerationContentPreview";

interface ModerationReviewDetailsProps {
  item: ModerationRow;
  open: boolean;
}

export function ModerationReviewDetails({ item, open }: ModerationReviewDetailsProps) {
  const deleted = item.lifecycleState === "deleted";
  const {
    images,
    isLoading: imagesLoading,
    error: imagesError,
  } = useModerationRevisionImages({
    open,
    itemId: item.itemId,
    revisionId: item.revisionId,
  });

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={riskLevelVariant(item.riskLevel)}>{item.riskLabel}</Badge>
        <Badge variant={reviewStatusVariant(item.reviewStatus)}>{item.reviewLabel}</Badge>
        <Badge variant="secondary">{item.policyLabel}</Badge>
        <Badge variant={publicStateVariant(item.publicState)}>{item.publicStateLabel}</Badge>
      </div>

      <section className="grid min-w-0 gap-4 lg:grid-cols-2">
        <ContentVersionPanel title="原始提交">
          {imagesLoading ? (
            <LoadingHint />
          ) : (
            <>
              {imagesError ? <ErrorHint message={imagesError.message} /> : null}
              <ModerationContentPreview
                contentType={item.contentType}
                content={item.submittedContent}
                images={images}
                emptyLabel="（空）"
              />
            </>
          )}
        </ContentVersionPanel>
        <ContentVersionPanel title="当前公开版本" muted>
          {imagesLoading ? (
            <LoadingHint />
          ) : (
            <ModerationContentPreview
              contentType={item.contentType}
              content={item.publishedContent}
              images={images}
              includeMomentImages={false}
              muted
              emptyLabel="（尚未发布）"
            />
          )}
        </ContentVersionPanel>
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

function ContentVersionPanel({
  title,
  muted = false,
  children,
}: {
  title: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "grid min-w-0 gap-2 rounded-lg border border-border bg-muted/10 p-3 sm:p-4",
        muted && "border-border/70 bg-muted/5",
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="min-w-0">{children}</div>
    </article>
  );
}

function LoadingHint() {
  return <p className="text-sm text-muted-foreground">加载内容预览...</p>;
}

function ErrorHint({ message }: { message: string }) {
  return <p className="mb-2 text-xs text-destructive">图片快照加载失败：{message}</p>;
}

function decisionLabel(type: "approved" | "corrected" | "rejected"): string {
  if (type === "approved") return "通过";
  if (type === "corrected") return "修正后通过";
  return "驳回";
}
