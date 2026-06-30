import { Badge, Button } from "@repo/ui";
import type {
  AdminModerationHistoryEventResp,
  AdminModerationHistoryRevisionResp,
} from "@repo/api";
import { useModerationHistory } from "../hooks/use-moderation-history";
import { ModerationImageGallery } from "./ModerationImageGallery";
import { reviewStatusLabel, reviewStatusVariant } from "../model";

// 事件类型 → 中文
const EVENT_TYPE_LABEL: Record<string, string> = {
  submitted: "提交",
  resubmitted: "重新提交",
  approved: "通过",
  corrected: "修正",
  rejected: "驳回",
  hidden: "隐藏",
  restored: "恢复",
};

function formatEventTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { hour12: false });
}

interface EventItemProps {
  event: AdminModerationHistoryEventResp;
}

function EventItem({ event }: EventItemProps) {
  return (
    <li className="flex flex-col gap-0.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {EVENT_TYPE_LABEL[event.event_type] ?? event.event_type}
        </span>
        <span className="text-muted-foreground">
          {event.operator_name ?? `#${event.operator_id}`}
        </span>
        <span className="text-xs text-muted-foreground">{formatEventTime(event.created_at)}</span>
      </div>
      {event.reason ? <p className="text-xs text-muted-foreground">理由：{event.reason}</p> : null}
    </li>
  );
}

interface RevisionCardProps {
  revision: AdminModerationHistoryRevisionResp;
}

function RevisionCard({ revision }: RevisionCardProps) {
  return (
    <article className="rounded-lg border border-border/80 bg-background p-4 space-y-3">
      {/* 标题行 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground">
          v{revision.revision_version}
        </span>
        <Badge variant={reviewStatusVariant(revision.review_status)}>
          {reviewStatusLabel(revision.review_status)}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatEventTime(revision.created_at)}
        </span>
      </div>

      {/* 提交内容 */}
      {revision.submitted_content ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">提交内容</p>
          <p className="whitespace-pre-wrap text-sm">{revision.submitted_content}</p>
        </div>
      ) : null}

      {/* 已发布内容（若与提交不同则展示） */}
      {revision.published_content && revision.published_content !== revision.submitted_content ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">发布内容（修正后）</p>
          <p className="whitespace-pre-wrap text-sm text-blue-700 dark:text-blue-300">
            {revision.published_content}
          </p>
        </div>
      ) : null}

      {/* 图片快照 */}
      {revision.images.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">图片快照</p>
          <ModerationImageGallery images={revision.images} />
        </div>
      ) : null}

      {/* 操作事件 */}
      {revision.events.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">操作记录</p>
          <ul className="space-y-1">
            {revision.events.map((event, idx) => (
              <EventItem key={`${event.event_type}-${idx}`} event={event} />
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

interface ModerationHistoryProps {
  itemId: number | null | undefined;
  open: boolean;
  activeTab: "current" | "history";
}

/** 审计历史页签内容：按修订版本降序展示历史内容、图片快照和操作事件。 */
export function ModerationHistory({ itemId, open, activeTab }: ModerationHistoryProps) {
  const { data, isLoading, error, page, setPage } = useModerationHistory({
    open,
    activeTab,
    itemId,
  });

  if (isLoading) {
    return <div className="flex justify-center py-12 text-sm text-muted-foreground">加载中...</div>;
  }

  if (error) {
    return <p className="py-6 text-center text-sm text-destructive">{error.message}</p>;
  }

  if (!data || data.revisions.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">暂无历史记录</p>;
  }

  const totalPages = Math.ceil(data.total / data.page_size);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* 倒序展示，最新版本在前 */}
        {[...data.revisions].reverse().map((revision) => (
          <RevisionCard key={revision.revision_id} revision={revision} />
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            isDisabled={page <= 1}
            onPress={() => setPage(page - 1)}
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            isDisabled={page >= totalPages}
            onPress={() => setPage(page + 1)}
            aria-label="下一页"
          >
            下一页
          </Button>
        </div>
      ) : null}
    </div>
  );
}
