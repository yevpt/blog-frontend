"use client";

import { useState } from "react";
import Link from "next/link";
import type { MomentItemResp } from "@repo/api";
import type { IconName } from "@repo/icons";
import { SvgIcon } from "@repo/icons";
import { Avatar, Badge, Button, Card, CardContent, Dropdown, Modal } from "@repo/ui";
import { useSession } from "@/app/providers/session-provider";
import { useImageViewer } from "@/store/use-image-viewer";
import { formatRelativeTime } from "../../lib/format-time";
import { SnippetContent } from "./snippet-content";
import { SnippetImageGrid } from "./snippet-image-grid";

export type SnippetCardLayout = "standalone" | "embedded";

interface SnippetCardProps {
  snippet: MomentItemResp;
  /** standalone：碎语页独立卡片；embedded：首页区块内嵌条目（无 Card 包裹） */
  layout?: SnippetCardLayout;
  /** 首屏可见时设为 true，使首图 eager 加载，避免 LCP 警告 */
  priority?: boolean;
  onLike?: (snippet: MomentItemResp) => void;
  likeDisabled?: boolean;
  onComment?: (snippet: MomentItemResp) => void;
  onEdit?: (snippet: MomentItemResp) => void;
  onToggleTop?: (snippet: MomentItemResp) => void;
  onDelete?: (snippet: MomentItemResp) => Promise<void> | void;
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
export function SnippetCard({
  snippet,
  layout = "standalone",
  priority = false,
  onLike,
  likeDisabled = false,
  onComment,
  onEdit,
  onToggleTop,
  onDelete,
  actionDisabled = false,
}: SnippetCardProps) {
  const { userId } = useSession();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const relativeTime = formatRelativeTime(new Date(snippet.created_at));
  const authorName = snippet.user?.nickname ?? snippet.user?.username ?? "匿名";
  const authorAvatar = snippet.user?.avatar_url ?? "";
  const authorBadge = snippet.user?.mark ?? "";
  const authorInitial = authorName[0]?.toUpperCase() ?? "?";

  const openViewer = useImageViewer((s) => s.open);

  const images = snippet.images ?? [];
  // 预览画廊包含该碎语全部图片（含九宫格中被折叠的），点击任意图从对应索引打开
  const viewerImages = images.map((img) => ({ src: img.access_url, alt: img.name }));
  const isOwner = userId !== null && userId === (snippet.user?.id ?? snippet.user_id);
  const topLabel = snippet.is_top ? "取消置顶" : "置顶";

  const body = (
    <>
      <div className="mb-2.5 flex items-start gap-2.5">
        <Link
          href={snippet.user?.id ? `/users/${snippet.user.id}` : "#"}
          className="shrink-0"
          onClick={(e) => {
            if (!snippet.user?.id) e.preventDefault();
          }}
        >
          <Avatar
            src={authorAvatar || undefined}
            alt={authorName}
            initials={authorInitial}
            size="sm"
            className="size-9 shadow-[0_2px_8px_rgba(124,58,237,0.2)]"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={snippet.user?.id ? `/users/${snippet.user.id}` : "#"}
              className="truncate text-[13px] font-semibold text-foreground"
              onClick={(e) => {
                if (!snippet.user?.id) e.preventDefault();
              }}
            >
              {authorName}
            </Link>
            <time className="ml-auto shrink-0 text-[11px] text-(--fg3)">{relativeTime}</time>
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

      <SnippetContent content={snippet.content} collapsible={layout === "embedded"} />

      <SnippetImageGrid
        images={images}
        priority={priority}
        onOpen={(idx) => openViewer(viewerImages, idx)}
      />

      <div className="mt-3 flex items-end justify-between gap-2 text-xs text-(--fg3)">
        {isOwner ? (
          <div data-testid="snippet-owner-actions" className="flex items-center">
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
                        onEdit?.(snippet);
                        break;
                      case "toggle-top":
                        onToggleTop?.(snippet);
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
                    icon={snippet.is_top ? pinOffIcon : pinIcon}
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
                      void Promise.resolve(onDelete?.(snippet))
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
            aria-pressed={snippet.is_liked}
            isDisabled={likeDisabled}
            onPress={() => {
              onLike?.(snippet);
            }}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 ${
              snippet.is_liked
                ? "text-red-500 hover:text-red-500"
                : "text-black/54 dark:text-(--fg3)"
            }`}
          >
            <span className="inline-flex transform-gpu animate-[heartbeat_3s_ease-in-out_infinite] will-change-transform">
              <SvgIcon name={snippet.is_liked ? "heart-fill" : "heart"} size={18} />
            </span>
            <span>{formatCount(snippet.like_count)}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="评论"
            onPress={() => {
              onComment?.(snippet);
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium text-black/54 transition-colors hover:bg-primary/10 hover:text-primary dark:text-(--fg3)"
          >
            <SvgIcon name="message-circle" size={18} />
            <span>{formatCount(snippet.comment_count)}</span>
          </Button>
        </div>
      </div>
    </>
  );

  if (layout === "embedded") {
    return (
      <article
        data-testid="snippet-card"
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
      data-testid="snippet-card"
      data-layout="standalone"
      // 菜单打开时浮层 underlay 会盖住卡片致其失去 :hover，用无条件位移把卡片钉在浮起态，避免回落抖动
      className={`min-w-0 overflow-hidden${isMenuOpen ? " -translate-y-0.5 shadow-card-hover" : ""}`}
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 200px" }}
    >
      <CardContent className="p-4">{body}</CardContent>
    </Card>
  );
}
