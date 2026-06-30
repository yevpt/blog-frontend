"use client";

import { useState } from "react";
import Link from "next/link";
import type { MomentItemResp } from "@repo/api";
import type { IconName } from "@repo/icons";
import { SvgIcon } from "@repo/icons";
import { Badge, Button, Card, CardContent, Dropdown, Modal } from "@repo/ui";
import { useSession } from "@/app/providers/session-provider";
import { UserAvatar } from "@/components/common/user-avatar";
import { useImageViewer } from "@/store/use-image-viewer";
import {
  ModerationContentPlaceholder,
  ModerationStatusBadge,
  getAuthorMomentDisplayContent,
  getAuthorMomentDisplayImages,
  getVisitorMomentDisplayImages,
  normalizeModerationView,
  shouldShowModerationContentPlaceholder,
  shouldUseVisitorMomentPreviewSizing,
} from "@/components/moderation";
import { MomentContent } from "./moment-content";
import { RelativeTime } from "@/components/common/relative-time";
import { MomentImageGrid } from "./moment-image-grid";
import { shouldShowMomentEditedAt } from "./should-show-moment-edited-at";

export type MomentCardLayout = "standalone" | "embedded";

interface MomentCardProps {
  moment: MomentItemResp;
  /** standalone：碎语页独立卡片；embedded：首页区块内嵌条目（无 Card 包裹） */
  layout?: MomentCardLayout;
  onLike?: (moment: MomentItemResp) => void;
  likeDisabled?: boolean;
  onComment?: (moment: MomentItemResp) => void;
  onEdit?: (moment: MomentItemResp) => void;
  onToggleTop?: (moment: MomentItemResp) => void;
  onDelete?: (moment: MomentItemResp) => Promise<void> | void;
  actionDisabled?: boolean;
}

/**
 * 格式化数字：>= 1000 时显示带 k 后缀的简写，否则直接显示。
 * 与 ArticleCardStats 保持一致。
 */
function formatCount(count: number): string {
  if (count >= 1000) {
    const k = count / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(count);
}

/** 将 SvgIcon name 包装为 Dropdown.Item 所需的 icon 组件 */
function DropdownIcon({ name }: { name: IconName }) {
  return function Icon({ className }: { className?: string }) {
    return <SvgIcon name={name} size={16} className={className} />;
  };
}

const editIcon = DropdownIcon({ name: "edit" });
const pinIcon = DropdownIcon({ name: "pin" });
const pinOffIcon = DropdownIcon({ name: "pin-off" });
const trashIcon = DropdownIcon({ name: "trash" });

// 单条碎语：双行 header + 图片网格 + ArticleCardStats 风格操作区
export function MomentCard({
  moment,
  layout = "standalone",
  onLike,
  likeDisabled = false,
  onComment,
  onEdit,
  onToggleTop,
  onDelete,
  actionDisabled = false,
}: MomentCardProps) {
  const { userId } = useSession();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const authorName = moment.user?.nickname ?? moment.user?.username ?? "匿名";
  const authorAvatar = moment.user?.avatar_url ?? "";
  const authorBadge = moment.user?.mark ?? "";

  const openViewer = useImageViewer((s) => s.open);

  const isOwner = userId !== null && userId === (moment.user?.id ?? moment.user_id);
  const images = isOwner
    ? getAuthorMomentDisplayImages(moment)
    : getVisitorMomentDisplayImages(moment);
  // 预览画廊只包含可查看原图的图片；blurred/gif_placeholder 不进入查看器
  const viewerImages = images
    .filter((img) => img.display_mode === "original")
    .map((img) => ({ src: img.access_url, alt: img.name }));
  const topLabel = moment.is_top ? "取消置顶" : "置顶";
  const edited = shouldShowMomentEditedAt(moment.created_at, moment.updated_at);
  // 审核状态：缺失或零值回退为可见且可交互，避免生产审核关闭期间禁用全部互动
  const moderationView = normalizeModerationView(moment.moderation);
  const canInteract = moderationView.can_interact;
  const displayContent = isOwner ? getAuthorMomentDisplayContent(moment) : moment.content;
  // 中风险首次发布：仅对非作者渲染审核占位
  const showModerationPlaceholder = shouldShowModerationContentPlaceholder(
    moment.moderation,
    isOwner,
  );
  const visitorPreviewSizing = shouldUseVisitorMomentPreviewSizing(isOwner, images);

  const body = (
    <>
      <div className="mb-2.5 flex items-start gap-2.5">
        <Link
          href={moment.user?.id ? `/users/${moment.user.id}` : "#"}
          className="shrink-0"
          onClick={(e) => {
            if (!moment.user?.id) e.preventDefault();
          }}
        >
          <UserAvatar
            src={authorAvatar || undefined}
            userId={moment.user?.id}
            name={authorName}
            size="lg"
            className="shadow-[0_2px_8px_rgba(124,58,237,0.2)]"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={moment.user?.id ? `/users/${moment.user.id}` : "#"}
              className="truncate text-[13px] font-semibold text-foreground"
              onClick={(e) => {
                if (!moment.user?.id) e.preventDefault();
              }}
            >
              {authorName}
            </Link>
            <RelativeTime
              dateTime={moment.created_at}
              className="ml-auto shrink-0 text-[11px] text-(--fg3)"
            />
          </div>
          {authorBadge && (
            <Badge
              variant="outline"
              className="mt-0.5 rounded-none border-0 bg-transparent px-0 py-0.5 text-[11px] font-normal text-muted-foreground"
            >
              {authorBadge}
            </Badge>
          )}
        </div>
      </div>

      {showModerationPlaceholder ? (
        <ModerationContentPlaceholder moderation={moment.moderation} className="mt-0.5" />
      ) : (
        <>
          <ModerationStatusBadge moderation={moment.moderation} className="mb-1.5" />
          <MomentContent content={displayContent} collapsible={false} />
        </>
      )}

      <MomentImageGrid
        images={images}
        visitorPreviewSizing={visitorPreviewSizing}
        onOpen={(idx) => openViewer(viewerImages, idx)}
      />

      {edited && (
        <p className="mt-3 text-[11px] text-(--fg3)">
          编辑于 <RelativeTime dateTime={moment.updated_at} />
        </p>
      )}

      <div
        className={`flex items-end justify-between gap-2 text-xs text-(--fg3) ${edited ? "mt-1" : "mt-3"}`}
      >
        {isOwner ? (
          <div data-testid="moment-owner-actions" className="flex items-center">
            <Dropdown.Root onOpenChange={setIsMenuOpen}>
              <Dropdown.DotsButton
                variant="ghost"
                icon="dots-horizontal"
                aria-label="更多操作"
                isDisabled={actionDisabled}
                className="size-8 p-0"
              />
              <Dropdown.Popover placement="bottom start" className="min-w-32 w-auto">
                <Dropdown.Menu
                  aria-label="碎语操作"
                  onAction={(key) => {
                    switch (key) {
                      case "edit":
                        onEdit?.(moment);
                        break;
                      case "toggle-top":
                        onToggleTop?.(moment);
                        break;
                      case "delete":
                        setIsDeleteOpen(true);
                        break;
                    }
                  }}
                >
                  <Dropdown.Item id="edit" label="编辑" icon={editIcon} />
                  <Dropdown.Item
                    id="toggle-top"
                    label={topLabel}
                    icon={moment.is_top ? pinOffIcon : pinIcon}
                  />
                  <Dropdown.Item id="delete" label="删除" icon={trashIcon} danger />
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.Root>

            <Modal
              isOpen={isDeleteOpen}
              onOpenChange={setIsDeleteOpen}
              isDismissable
              size="sm"
              aria-label="确认删除碎语"
            >
              <div className="p-5">
                <p className="text-sm leading-6 text-foreground">
                  确定删除这条碎语吗？删除后不可在列表中恢复。
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" slot="close" isDisabled={actionDisabled}>
                    取消
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    aria-label="确认删除"
                    isDisabled={actionDisabled}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onPress={() => {
                      void Promise.resolve(onDelete?.(moment))
                        .then(() => setIsDeleteOpen(false))
                        .catch(() => undefined);
                    }}
                  >
                    删除
                  </Button>
                </div>
              </div>
            </Modal>
          </div>
        ) : (
          <div />
        )}

        <div className="flex shrink-0 items-center justify-end gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="喜欢"
            aria-pressed={moment.is_liked}
            isDisabled={likeDisabled || !canInteract}
            onPress={() => {
              onLike?.(moment);
            }}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 ${
              moment.is_liked
                ? "text-red-500 hover:text-red-500"
                : "text-black/54 dark:text-(--fg3)"
            }`}
          >
            <span className="inline-flex transform-gpu animate-[heartbeat_3s_ease-in-out_infinite] will-change-transform">
              <SvgIcon name={moment.is_liked ? "heart-fill" : "heart"} size={18} />
            </span>
            <span>{formatCount(moment.like_count)}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="评论"
            isDisabled={!canInteract}
            onPress={() => {
              onComment?.(moment);
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium text-black/54 transition-colors hover:bg-primary/10 hover:text-primary dark:text-(--fg3)"
          >
            <SvgIcon name="message-circle" size={18} />
            <span>{formatCount(moment.comment_count)}</span>
          </Button>
        </div>
      </div>
    </>
  );

  if (layout === "embedded") {
    return (
      <article
        data-testid="moment-card"
        data-layout="embedded"
        className="min-w-0 border-b border-border/40 px-1 py-3 last:border-b-0"
        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 160px" }}
      >
        {body}
      </article>
    );
  }

  return (
    <Card
      interactive
      data-testid="moment-card"
      data-layout="standalone"
      // 菜单打开时浮层 underlay 会盖住卡片致其失去 :hover，用无条件位移把卡片钉在浮起态，避免回落抖动
      className={`min-w-0 overflow-hidden${isMenuOpen ? " -translate-y-0.5 shadow-card-hover" : ""}`}
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 200px" }}
    >
      <CardContent className="p-4">{body}</CardContent>
    </Card>
  );
}
