import { forwardRef, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, Label, PopoverTrigger, Select, Toggle, Card, cn } from "@repo/ui";
import { ArticleCoverPreview } from "./ArticleCoverPreview";
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
  mobileCoverUrl: string;
  isCoverUploading: boolean;
  isMobileCoverUploading: boolean;
  coverInputRef: RefObject<HTMLInputElement | null>;
  mobileCoverInputRef: RefObject<HTMLInputElement | null>;
  categories: CategoryOption[];
  categoryId: number | null;
  selectedTags: ArticleTag[];
  tagCandidates: ArticleTag[];
  selectedMusic: MusicOption | null;
  musicPickerOpen: boolean;
  articleStatus: 0 | 1 | 2 | 3;
  commentStatus: 0 | 1;
  isRecommended: boolean;
  musicPickerTrigger: ReactNode;
  onCoverFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMobileCoverFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveCover: () => void;
  onRemoveMobileCover: () => void;
  onCategoryChange: (key: string | number | null) => void;
  onTagsChange: (tags: ArticleTag[]) => void;
  onMusicPickerOpenChange: (open: boolean) => void;
  onRemoveMusic: () => void;
  onArticleStatusChange: (key: string | number | null) => void;
  onCommentStatusChange: (key: string | number | null) => void;
  onIsRecommendedChange: (isRecommended: boolean) => void;
}

const panelShellClassName = cn("flex flex-col");
const sectionPaddingClassName = "px-5";
const fieldBlockClassName = "grid gap-2.5";

export const ArticleEditorPublishRail = forwardRef<HTMLElement, ArticleEditorPublishRailProps>(
  function ArticleEditorPublishRail(
    {
      coverUrl,
      mobileCoverUrl,
      isCoverUploading,
      isMobileCoverUploading,
      coverInputRef,
      mobileCoverInputRef,
      categories,
      categoryId,
      selectedTags,
      tagCandidates,
      selectedMusic,
      musicPickerOpen,
      articleStatus,
      commentStatus,
      isRecommended,
      musicPickerTrigger,
      onCoverFileChange,
      onMobileCoverFileChange,
      onRemoveCover,
      onRemoveMobileCover,
      onCategoryChange,
      onTagsChange,
      onMusicPickerOpenChange,
      onRemoveMusic,
      onArticleStatusChange,
      onCommentStatusChange,
      onIsRecommendedChange,
    },
    ref,
  ) {
    return (
      <aside
        ref={ref}
        className="xl:h-full xl:min-h-0 xl:w-[320px] xl:overflow-y-auto xl:overscroll-y-contain"
      >
        <Card className={panelShellClassName} aria-label="发布配置">
          <div className={cn(sectionPaddingClassName, "pt-5")}>
            <Label className="mb-2.5 text-xs font-medium text-muted-foreground">封面</Label>
            <ArticleCoverPreview
              coverUrl={coverUrl}
              isCoverUploading={isCoverUploading}
              onPickCover={() => coverInputRef.current?.click()}
              onRemoveCover={onRemoveCover}
            />
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

            <details className="group mt-4">
              <summary
                className={cn(
                  "flex cursor-pointer list-none items-center justify-between gap-2",
                  "text-xs font-medium text-muted-foreground",
                  "[&::-webkit-details-marker]:hidden",
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <SvgIcon
                    name="chevron-right"
                    size={14}
                    className="shrink-0 text-muted-foreground/80 transition-transform group-open:rotate-90"
                  />
                  <span>移动端封面</span>
                  <span className="font-normal text-muted-foreground/80">可选</span>
                </span>
                {mobileCoverUrl ? (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    已设置
                  </span>
                ) : null}
              </summary>
              <div className="mt-2.5">
                <ArticleCoverPreview
                  coverUrl={mobileCoverUrl}
                  isCoverUploading={isMobileCoverUploading}
                  aspectRatio="9/16"
                  imagePreset="article-mobile-cover"
                  previewAlt="移动端封面预览"
                  addLabel="添加移动端封面"
                  uploadingLabel="移动端封面上传中"
                  loadingLabel="移动端封面加载中"
                  onPickCover={() => mobileCoverInputRef.current?.click()}
                  onRemoveCover={onRemoveMobileCover}
                />
                <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  用于移动端列表与详情展示；未设置时使用上方桌面封面
                </p>
                <input
                  ref={mobileCoverInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={onMobileCoverFileChange}
                />
              </div>
            </details>
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
                selectedKey={categoryId !== null ? String(categoryId) : null}
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
              "flex flex-col gap-4 border-t border-border/60 py-4",
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="article-recommend"
                className="text-xs font-medium text-muted-foreground"
              >
                推荐到首页
              </Label>
              <Toggle
                id="article-recommend"
                aria-label="推荐到首页"
                isSelected={isRecommended}
                onChange={onIsRecommendedChange}
                slim
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="article-status"
                className="text-xs font-medium text-muted-foreground shrink-0"
              >
                状态
              </Label>
              <div className="flex items-center gap-2">
                <Select
                  id="article-status"
                  aria-label="文章状态设置"
                  size="sm"
                  selectedKey={String(articleStatus)}
                  onSelectionChange={onArticleStatusChange}
                  className="w-auto min-w-[7.5rem]"
                >
                  <Select.Item id="3" label="草稿" />
                  <Select.Item id="1" label="公开" />
                  <Select.Item id="0" label="隐藏" />
                  <Select.Item id="2" label="加密" />
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="article-comment"
                className="text-xs font-medium text-muted-foreground"
              >
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
          </div>
        </Card>
      </aside>
    );
  },
);
