import { forwardRef, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, Label, PopoverTrigger, Select, Card, cn } from "@repo/ui";
import { ArticleMusicPreviewRow } from "./ArticleMusicPreviewRow";
import { ArticleTagPicker } from "./ArticleTagPicker";
import type { ArticleTag } from "../editor-options";

interface MusicOption {
  id: number;
  label: string;
  artist: string;
  durationSeconds: number;
  url?: string;
}

interface CategoryOption {
  id: number;
  name: string;
}

interface ArticleEditorPublishRailProps {
  coverUrl: string;
  isCoverUploading: boolean;
  coverInputRef: RefObject<HTMLInputElement | null>;
  categories: CategoryOption[];
  categoryId: number | null;
  selectedTags: ArticleTag[];
  tagCandidates: ArticleTag[];
  selectedMusic: MusicOption | null;
  musicPickerOpen: boolean;
  commentStatus: 0 | 1;
  musicPickerTrigger: ReactNode;
  onCoverFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveCover: () => void;
  onCategoryChange: (key: string | number | null) => void;
  onTagsChange: (tags: ArticleTag[]) => void;
  onMusicPickerOpenChange: (open: boolean) => void;
  onRemoveMusic: () => void;
  onCommentStatusChange: (key: string | number | null) => void;
}

const panelShellClassName = cn("flex flex-col overflow-hidden");
const sectionPaddingClassName = "px-5";
const fieldBlockClassName = "grid gap-2.5";

const coverChipClassName = cn(
  "inline-flex min-h-[26px] items-center rounded-md border-0 px-2.5",
  "bg-black/55 text-[11px] font-semibold text-white backdrop-blur-sm",
  "hover:bg-black/65 hover:text-white",
);

export const ArticleEditorPublishRail = forwardRef<HTMLElement, ArticleEditorPublishRailProps>(
  function ArticleEditorPublishRail(
    {
      coverUrl,
      isCoverUploading,
      coverInputRef,
      categories,
      categoryId,
      selectedTags,
      tagCandidates,
      selectedMusic,
      musicPickerOpen,
      commentStatus,
      musicPickerTrigger,
      onCoverFileChange,
      onRemoveCover,
      onCategoryChange,
      onTagsChange,
      onMusicPickerOpenChange,
      onRemoveMusic,
      onCommentStatusChange,
    },
    ref,
  ) {
    return (
      <aside
        ref={ref}
        className={cn(
          "max-xl:sticky max-xl:top-4 max-xl:max-h-[calc(100dvh-5rem)] max-xl:self-start max-xl:overflow-auto",
          "xl:w-[320px] xl:self-start",
        )}
      >
        <Card className={panelShellClassName} aria-label="发布配置">
          <div className={cn(sectionPaddingClassName, "pt-5")}>
            <Label className="mb-2.5 text-xs font-medium text-muted-foreground">封面</Label>
            <div className="group relative aspect-video overflow-hidden rounded-lg bg-muted shadow-card">
              {coverUrl ? (
                <img src={coverUrl} alt="文章封面预览" className="size-full object-cover" />
              ) : (
                <button
                  type="button"
                  aria-label="添加封面"
                  disabled={isCoverUploading}
                  onClick={() => coverInputRef.current?.click()}
                  className="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground disabled:opacity-60"
                >
                  <SvgIcon name="image" size={20} />
                  <span className="text-xs font-medium">
                    {isCoverUploading ? "上传中…" : "添加封面"}
                  </span>
                </button>
              )}
              {coverUrl ? (
                <div
                  className={cn(
                    "absolute inset-x-2 bottom-2 flex justify-end gap-1",
                    "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
                  )}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    isDisabled={isCoverUploading}
                    onPress={() => coverInputRef.current?.click()}
                    className={coverChipClassName}
                  >
                    {isCoverUploading ? "上传中…" : "更换"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onPress={onRemoveCover}
                    className={coverChipClassName}
                  >
                    移除
                  </Button>
                </div>
              ) : null}
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
              用于文章列表卡片与详情页顶部展示
            </p>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onCoverFileChange}
            />
          </div>

          <div className={cn(sectionPaddingClassName, "flex flex-col gap-6 py-6")}>
            <div className={fieldBlockClassName}>
              <Label
                htmlFor="article-category"
                className="text-xs font-medium text-muted-foreground"
              >
                分类
              </Label>
              <Select
                id="article-category"
                aria-label="文章分类"
                selectedKey={categoryId !== null ? String(categoryId) : undefined}
                onSelectionChange={onCategoryChange}
                placeholder="选择分类"
              >
                {categories.map((item) => (
                  <Select.Item key={String(item.id)} id={String(item.id)} label={item.name} />
                ))}
              </Select>
            </div>

            <div className={fieldBlockClassName}>
              <span className="text-xs font-medium text-muted-foreground">标签</span>
              <ArticleTagPicker
                selectedTags={selectedTags}
                tagCandidates={tagCandidates}
                onChange={onTagsChange}
              />
            </div>

            <div className={fieldBlockClassName}>
              <span className="text-xs font-medium text-muted-foreground">
                背景音乐 <span className="font-normal text-muted-foreground/80">可选</span>
              </span>
              {selectedMusic ? (
                <ArticleMusicPreviewRow
                  trackId={selectedMusic.id}
                  title={selectedMusic.label}
                  artist={selectedMusic.artist}
                  durationSeconds={selectedMusic.durationSeconds}
                  url={selectedMusic.url}
                  className="rounded-lg border-border/80 bg-muted/60"
                  actions={
                    <>
                      <PopoverTrigger
                        isOpen={musicPickerOpen}
                        onOpenChange={onMusicPickerOpenChange}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label="更换音乐"
                          className="size-8 rounded-md p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <SvgIcon name="refresh-cw" size={18} />
                        </Button>
                        {musicPickerTrigger}
                      </PopoverTrigger>
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label="移除背景音乐"
                        className="size-8 rounded-md p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onPress={onRemoveMusic}
                      >
                        <SvgIcon name="trash" size={18} />
                      </Button>
                    </>
                  }
                />
              ) : (
                <PopoverTrigger isOpen={musicPickerOpen} onOpenChange={onMusicPickerOpenChange}>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="添加背景音乐"
                    className={cn(
                      "h-12 w-full rounded-lg p-0",
                      "flex items-center justify-center gap-2",
                      "ring-1 ring-border text-muted-foreground",
                      "hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    <SvgIcon name="music" size={18} />
                    <span className="text-xs font-medium">添加背景音乐</span>
                  </Button>
                  {musicPickerTrigger}
                </PopoverTrigger>
              )}
            </div>
          </div>

          <div
            className={cn(
              sectionPaddingClassName,
              "flex items-center justify-between gap-4 border-t border-border/60 py-4",
            )}
          >
            <Label htmlFor="article-comment" className="text-xs font-medium text-muted-foreground">
              评论
            </Label>
            <Select
              id="article-comment"
              aria-label="评论设置"
              size="sm"
              selectedKey={String(commentStatus)}
              onSelectionChange={onCommentStatusChange}
              className="w-auto min-w-[7.5rem]"
            >
              <Select.Item id="1" label="允许评论" />
              <Select.Item id="0" label="关闭评论" />
            </Select>
          </div>
        </Card>
      </aside>
    );
  },
);
