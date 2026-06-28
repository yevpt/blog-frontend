"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { UserLikedContentItemResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { UserAvatar } from "@/components/common/user-avatar";
import { RelativeTime } from "@/components/common/relative-time";
import {
  formatLikedContentParentExcerpt,
  formatLikedContentParentLabel,
  formatLikedContentRootContext,
  getKindBadgeLabel,
  getLikedContentActionLabel,
  getLikedContentAuthorName,
  getLikedContentBodyText,
  getLikedContentReplyBodyParts,
  getLikedContentRootHref,
  getLikedContentTitle,
  isLikedContentActionDisabled,
  shouldShowLikedContentActionLink,
} from "./liked-content-format";

interface LikedContentCardProps {
  item: UserLikedContentItemResp;
}

/** 高亮正文中的 @提及 */
function LikedContentMentionText({
  text,
  className: _className,
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(/(@[\w\u4e00-\u9fff]+)/g);

  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("@") ? (
          <span key={`${part}-${index}`} className="text-sky-500 dark:text-sky-400">
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

function LikedContentMention({ name, userId }: { name: string; userId?: number }) {
  const label = `@${name}`;
  const className = "text-sky-500 dark:text-sky-400";

  if (userId) {
    return (
      <Link href={`/users/${userId}`} className={className}>
        {label}
      </Link>
    );
  }

  return <span className={className}>{label}</span>;
}

function LikedContentReplyBody({
  item,
  className,
}: {
  item: UserLikedContentItemResp;
  className?: string;
}) {
  const { mention, body } = getLikedContentReplyBodyParts(item);

  return (
    <p className={className}>
      {mention && (
        <>
          <LikedContentMention name={mention.name} userId={mention.userId} />
          {body ? " " : null}
        </>
      )}
      {mention ? body : <LikedContentMentionText text={body} />}
    </p>
  );
}

function LikedContentCardHeader({
  authorName,
  kind,
  likedAt,
}: {
  authorName: string;
  kind: UserLikedContentItemResp["kind"];
  likedAt: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
      <span className="truncate text-sm font-medium text-foreground">{authorName}</span>
      <LikedContentKindTag kind={kind} />
      <RelativeTime dateTime={likedAt} className="text-xs text-muted-foreground" />
    </div>
  );
}

function LikedContentKindTag({ kind }: { kind: UserLikedContentItemResp["kind"] }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 text-xs leading-none text-rose-500 dark:text-rose-400">
      <SvgIcon name="heart-fill" size={13} aria-hidden />
      <span>{getKindBadgeLabel(kind)}</span>
    </span>
  );
}

function LikedContentActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-0.5 text-sm text-foreground transition-opacity hover:opacity-80"
    >
      <span>{label}</span>
      <SvgIcon name="arrow-up-right" size={14} aria-hidden />
    </Link>
  );
}

function LikedContentRootContext({ text, href }: { text: string; href: string | null }) {
  if (!href) {
    return <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>;
  }

  return (
    <Link
      href={href}
      className="text-xs leading-relaxed text-muted-foreground no-underline hover:text-muted-foreground"
    >
      {text}
    </Link>
  );
}

function LikedContentArticleBody({ title, bodyText }: { title: string; bodyText: string }) {
  return (
    <div className="mt-1.5">
      <p className="line-clamp-2 text-base font-semibold leading-snug text-foreground">{title}</p>
      {bodyText && (
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {bodyText}
        </p>
      )}
    </div>
  );
}

export function LikedContentCard({ item }: LikedContentCardProps) {
  const authorName = getLikedContentAuthorName(item.author);
  const rootHref = getLikedContentRootHref(item);
  const actionDisabled = isLikedContentActionDisabled(item);
  const showActionLink = shouldShowLikedContentActionLink(item) && !actionDisabled;
  const actionLabel = getLikedContentActionLabel(item);
  const rootContext = formatLikedContentRootContext(item);
  const parentLabel = formatLikedContentParentLabel(item);
  const parentExcerpt = formatLikedContentParentExcerpt(item);
  const bodyText = getLikedContentBodyText(item);
  const title = getLikedContentTitle(item);
  const isArticle = item.kind === "article";
  const isCommentLike = item.kind === "comment" || item.kind === "reply";

  let bodyNode: ReactNode;
  if (isArticle && title) {
    bodyNode = <LikedContentArticleBody title={title} bodyText={bodyText} />;
  } else if (item.kind === "reply") {
    bodyNode = (
      <LikedContentReplyBody
        item={item}
        className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground"
      />
    );
  } else if (isCommentLike) {
    bodyNode = (
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground">
        <LikedContentMentionText text={bodyText} />
      </p>
    );
  } else {
    bodyNode = (
      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-foreground">{bodyText}</p>
    );
  }

  return (
    <article data-testid="liked-content-card" data-kind={item.kind} className="py-3.5">
      <div className="flex gap-3">
        <Link
          href={item.author?.id ? `/users/${item.author.id}` : "#"}
          className="shrink-0"
          aria-label={`查看${authorName}的主页`}
        >
          <UserAvatar
            src={item.author?.avatar_url}
            userId={item.author?.id}
            name={authorName}
            size="lg"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <LikedContentCardHeader
            authorName={authorName}
            kind={item.kind}
            likedAt={item.liked_at}
          />

          {bodyNode}

          {parentLabel && parentExcerpt && (
            <div className="mt-3 border-l border-border pl-3">
              <p className="text-xs text-muted-foreground">{parentLabel}</p>
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                “{parentExcerpt}”
              </p>
            </div>
          )}

          {parentExcerpt && !parentLabel && (
            <p className="mt-2 text-xs text-muted-foreground">{parentExcerpt}</p>
          )}

          {rootContext && (
            <div className="mt-3">
              <LikedContentRootContext text={rootContext} href={rootHref} />
            </div>
          )}

          {showActionLink && (
            <div className="mt-3">
              <LikedContentActionLink href={rootHref ?? "#"} label={actionLabel} />
            </div>
          )}

          {!showActionLink && actionDisabled && !rootContext && (
            <p className="mt-3 text-xs text-muted-foreground">{actionLabel}</p>
          )}
        </div>
      </div>
    </article>
  );
}
