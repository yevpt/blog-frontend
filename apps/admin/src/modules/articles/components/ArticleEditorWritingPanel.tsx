import { useCallback, useState, type ChangeEvent, type RefObject } from "react";
import { LinkDialog, RichEditor, type ImageInsertHandlers } from "@repo/editor";
import { Card, cn } from "@repo/ui";

interface ArticleEditorWritingPanelProps {
  title: string;
  description: string;
  content: string;
  contentLength: number;
  readMinutes: number;
  autosaveStatusText: string;
  isContentImageUploading: boolean;
  contentImageInputRef: RefObject<HTMLInputElement | null>;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onInsertImage: (handlers: ImageInsertHandlers) => void;
  onContentImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

const panelShellClassName = cn(
  "grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden",
  "xl:min-h-full",
);

export function ArticleEditorWritingPanel({
  title,
  description,
  content,
  contentLength,
  readMinutes,
  autosaveStatusText,
  isContentImageUploading,
  contentImageInputRef,
  onTitleChange,
  onDescriptionChange,
  onContentChange,
  onInsertImage,
  onContentImageFileChange,
}: ArticleEditorWritingPanelProps) {
  const [linkDialog, setLinkDialog] = useState<{
    open: boolean;
    insert?: (url: string, title?: string) => void;
  }>({ open: false });

  const handleInsertLink = useCallback(
    (insert: (url: string, title?: string) => void) => setLinkDialog({ open: true, insert }),
    [],
  );

  return (
    <Card className={panelShellClassName} aria-label="写作区">
      <div className="px-5 pt-8 sm:px-10">
        <input
          aria-label="文章标题"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="无标题"
          className={cn(
            "w-full border-0 bg-transparent font-serif text-foreground outline-none",
            "text-[clamp(1.75rem,4vw,2.375rem)] font-semibold leading-[1.18] tracking-[-0.03em]",
            "placeholder:text-muted-foreground",
          )}
        />
        <textarea
          aria-label="文章描述"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="添加摘要，会显示在列表与分享卡片上"
          rows={2}
          className={cn(
            "mt-[18px] w-full resize-none border-0 bg-transparent outline-none",
            "min-h-14 max-h-30 text-[15px] leading-[1.7] text-muted-foreground",
            "placeholder:text-muted-foreground",
          )}
        />
      </div>

      <div className="mt-7 grid min-h-0 overflow-hidden grid-rows-[minmax(0,1fr)_auto] border-t border-border/60">
        <RichEditor
          value={content}
          onChange={onContentChange}
          placeholder="开始写文章正文..."
          showToolbarCharacterCount={false}
          variant="plain"
          toolbarPlacement="top"
          toolbarTrailing={
            <span className="shrink-0 text-[11px] tracking-wide text-muted-foreground">
              Markdown
            </span>
          }
          className="h-full min-h-0 overflow-hidden"
          onInsertImage={onInsertImage}
          onInsertLink={handleInsertLink}
          enableBlockquote
        />
        <LinkDialog
          open={linkDialog.open}
          onClose={() => setLinkDialog({ open: false })}
          onConfirm={(url, title) => {
            linkDialog.insert?.(url, title);
            setLinkDialog({ open: false });
          }}
        />
        <input
          ref={contentImageInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onContentImageFileChange}
        />

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-3 text-xs text-muted-foreground sm:px-10">
          <span>
            <strong className="font-semibold text-foreground/75">{contentLength}</strong> 字 · 约{" "}
            <strong className="font-semibold text-foreground/75">{readMinutes}</strong> 分钟
          </span>
          <span className="ml-auto text-right">
            {isContentImageUploading ? "图片上传中…" : autosaveStatusText}
          </span>
        </footer>
      </div>
    </Card>
  );
}
