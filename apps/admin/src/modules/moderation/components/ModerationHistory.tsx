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
  submit: "提交",
  resubmit: "重新提交",
  approve: "通过",
  correct_and_approve: "修正后通过",
  reject: "驳回",
  emergency_hide: "紧急隐藏",
  restore: "恢复",
  delete: "删除",
  admin_delete: "管理员删除",
  trust_change: "调整信任等级",
  sanction_change: "调整处罚状态",
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
        <span className="font-medium">{EVENT_TYPE_LABEL[event.action] ?? event.action}</span>
        <span className="text-muted-foreground">
          {event.actor_user_id ? `#${event.actor_user_id}` : "系统"}
        </span>
        <span className="text-xs text-muted-foreground">{formatEventTime(event.created_at)}</span>
      </div>
      {event.reason ? <p className="text-xs text-muted-foreground">理由：{event.reason}</p> : null}
    </li>
  );
}

interface RevisionCardProps {
  revision: AdminModerationHistoryRevisionResp;
  events: AdminModerationHistoryEventResp[];
}

function RevisionCard({ revision, events }: RevisionCardProps) {
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
      {revision.images?.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">图片快照</p>
          <ModerationImageGallery images={revision.images} />
        </div>
      ) : null}

      {/* 操作事件 */}
      {events.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">操作记录</p>
          <ul className="space-y-1">
            {events.map((event) => (
              <EventItem key={event.id} event={event} />
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

  if (!data || !data.list || data.list.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">暂无历史记录</p>;
  }

  const totalPages = Math.ceil(data.total / data.page_size);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* 后端已按版本倒序分页，保持最新版本在前。 */}
        {data.list.map((revision) => (
          <RevisionCard
            key={revision.revision_id}
            revision={revision}
            events={(data.events ?? []).filter(
              (event) => event.revision_id === revision.revision_id,
            )}
          />
        ))}
      </div>

      {(data.events ?? []).some((event) => event.revision_id == null) ? (
        <section className="rounded-lg border border-border/80 bg-background p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">内容级操作记录</p>
          <ul className="space-y-1">
            {(data.events ?? [])
              .filter((event) => event.revision_id == null)
              .map((event) => (
                <EventItem key={event.id} event={event} />
              ))}
          </ul>
        </section>
      ) : null}

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
