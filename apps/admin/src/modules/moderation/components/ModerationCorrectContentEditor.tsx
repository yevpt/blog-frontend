import { useCallback, useState } from "react";
import type { ModerationContentType } from "@repo/api";
import { LinkDialog, RichEditor, type ImageInsertHandlers } from "@repo/editor";
import { useEditorImageUpload } from "@repo/hooks";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";
import {
  isUgcModerationContentType,
  MODERATION_CHARACTER_COUNT_THRESHOLD,
  moderationContentMaxLength,
} from "../moderation-content";

interface ModerationCorrectContentEditorProps {
  contentType: ModerationContentType;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * 审核修正正文编辑器：按内容类型对齐 web 端输入体验。
 * - 碎语：RichEditor + 链接（无内联插图，图片走修订快照）
 * - 留言/评论：RichEditor + 链接 + 插图上传
 */
export function ModerationCorrectContentEditor({
  contentType,
  value,
  onChange,
  disabled = false,
}: ModerationCorrectContentEditorProps) {
  const maxLength = moderationContentMaxLength(contentType);
  const [linkDialog, setLinkDialog] = useState<{
    open: boolean;
    insert?: (url: string, title?: string) => void;
  }>({ open: false });

  const imageUpload = useEditorImageUpload({
    scene: "comment",
    upload: async (file) => {
      const resp = await apiClient.uploads.tempImage(file, {
        dir: "images",
        scene: "comment",
      });
      return resp.url || resp.key;
    },
    onError: (message) => addToast(message, "error"),
  });

  const handleInsertImage = useCallback(
    (handlers: ImageInsertHandlers) => {
      imageUpload.handleInsertImageRequest(handlers);
    },
    [imageUpload],
  );

  const handleInsertLink = useCallback((insert: (url: string, title?: string) => void) => {
    setLinkDialog({ open: true, insert });
  }, []);

  return (
    <div className="grid min-w-0 gap-1.5" data-testid="moderation-correct-content">
      <p className="text-sm font-medium text-foreground">修正正文</p>
      <RichEditor
        value={value}
        onChange={onChange}
        placeholder="覆盖后的公开正文…"
        disabled={disabled}
        maxLength={maxLength}
        characterCountThreshold={MODERATION_CHARACTER_COUNT_THRESHOLD}
        isLoggedIn
        onInsertLink={handleInsertLink}
        onInsertImage={isUgcModerationContentType(contentType) ? handleInsertImage : undefined}
        className="min-w-0"
      />

      {isUgcModerationContentType(contentType) ? (
        <input
          ref={imageUpload.inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(event) => void imageUpload.handleFileChange(event)}
        />
      ) : null}

      <LinkDialog
        open={linkDialog.open}
        onClose={() => setLinkDialog({ open: false })}
        onConfirm={(url, title) => {
          linkDialog.insert?.(url, title);
          setLinkDialog({ open: false });
        }}
      />
    </div>
  );
}
