import { useMemo } from "react";
import type { AdminModerationHistoryImageResp, ModerationContentType } from "@repo/api";
import { optimizeMarkdownImages } from "@repo/hooks/cdn-image";
import { MarkdownContent, markdownToHtmlSync } from "@repo/markdown";
import { cn } from "@repo/ui";
import {
  isMomentModerationContentType,
  isUgcModerationContentType,
  resolveModerationImageRefs,
} from "../moderation-content";
import { ModerationImageGallery } from "./ModerationImageGallery";

interface ModerationContentPreviewProps {
  contentType: ModerationContentType;
  content: string;
  images?: AdminModerationHistoryImageResp[];
  muted?: boolean;
  emptyLabel?: string;
  /** 碎语图片网格是否展示；公开/修正对比面板默认只在一侧展示。 */
  includeMomentImages?: boolean;
}

/** 审核详情正文预览：对齐 web 端同类型内容的 Markdown / 碎语图片展示。 */
export function ModerationContentPreview({
  contentType,
  content,
  images,
  muted = false,
  emptyLabel,
  includeMomentImages = true,
}: ModerationContentPreviewProps) {
  const isMoment = isMomentModerationContentType(contentType);
  const resolvedContent = useMemo(
    () => resolveModerationImageRefs(content, images),
    [content, images],
  );
  const html = useMemo(() => {
    if (!resolvedContent.trim()) return "";
    return optimizeMarkdownImages(
      markdownToHtmlSync(resolvedContent, {
        treatLinksAsUgc: isUgcModerationContentType(contentType),
      }),
      "comment",
    );
  }, [contentType, resolvedContent]);

  const showText = resolvedContent.trim().length > 0;
  const showMomentImages = includeMomentImages && isMoment && (images?.length ?? 0) > 0;

  if (!showText && !showMomentImages) {
    return <p className="text-sm text-muted-foreground">{emptyLabel ?? "（空）"}</p>;
  }

  return (
    <div className="grid min-w-0 gap-3">
      {showText ? (
        <MarkdownContent
          html={html}
          variant="comment"
          className={cn("min-w-0 break-words text-sm leading-6", muted && "text-muted-foreground")}
          deferImages
        />
      ) : null}
      {showMomentImages ? (
        <div className="grid min-w-0 gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">图片</p>
          <ModerationImageGallery images={images ?? []} />
        </div>
      ) : null}
    </div>
  );
}
