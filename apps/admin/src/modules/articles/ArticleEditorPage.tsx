import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import {
  BreadcrumbItem,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Popover,
  PopoverDialog,
  SearchField,
  Tooltip,
  cn,
} from "@repo/ui";
import { apiClient } from "../../lib/api";
import { addToast } from "../../lib/toast";
import {
  buildArticleSaveReq,
  mapDetailToFormState,
  mapMusicListToEditorOptions,
  resolveEditorMusicOption,
  statusToLabel,
  type ArticleEditorStatusLabel,
} from "./article-editor-utils";
import { ArticleEditorPublishRail } from "./components/ArticleEditorPublishRail";
import { ArticleEditorTopBar } from "./components/ArticleEditorTopBar";
import { ArticleEditorWritingPanel } from "./components/ArticleEditorWritingPanel";
import type { ArticleTag } from "./editor-options";
import { useArticleEditorDetail } from "./hooks/use-article-editor-detail";
import {
  useArticleEditorAutosave,
  type ArticleEditorAutosaveFormState,
} from "./hooks/use-article-editor-autosave";
import { useArticleEditorMainLayout } from "./hooks/use-article-editor-main-layout";
import { useArticleEditorOptions } from "./hooks/use-article-editor-options";
import type { AdminListEditorLocationState } from "../../lib/admin-list-query";
import { resolveAdminListReturnSearch } from "../../lib/admin-list-query";
import { useArticleImageUpload } from "./hooks/use-article-image-upload";

export function ArticleEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { articleId } = useParams();
  const isEditing = articleId !== undefined;

  const {
    categories,
    tags,
    musicList,
    isLoading: isOptionsLoading,
    error: optionsError,
  } = useArticleEditorOptions();
  const {
    detail,
    isLoading: isDetailLoading,
    error: detailError,
    isNew,
  } = useArticleEditorDetail(articleId);
  const {
    coverInputRef,
    mobileCoverInputRef,
    contentImageInputRef,
    isCoverUploading,
    isMobileCoverUploading,
    isContentImageUploading,
    handleCoverFileChange,
    handleMobileCoverFileChange,
    handleInsertImageRequest,
    handleContentImageFileChange,
  } = useArticleImageUpload();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [mobileCoverUrl, setMobileCoverUrl] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<ArticleTag[]>([]);
  const [musicId, setMusicId] = useState<number | null>(null);
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [musicSearchQuery, setMusicSearchQuery] = useState("");
  const [statusLabel, setStatusLabel] = useState<ArticleEditorStatusLabel>("草稿");
  const [articleStatus, setArticleStatus] = useState<0 | 1 | 2 | 3>(3);
  const [commentStatus, setCommentStatus] = useState<0 | 1>(1);
  const [isRecommended, setIsRecommended] = useState(false);
  const [savedArticleId, setSavedArticleId] = useState<number | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [detailApplied, setDetailApplied] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (optionsError) {
      addToast(optionsError.message, "error");
    }
  }, [optionsError]);

  useEffect(() => {
    if (!detail || detailApplied) return;
    const form = mapDetailToFormState(detail);
    setTitle(form.title);
    setDescription(form.description);
    setContent(form.content);
    setCoverUrl(form.coverUrl);
    setMobileCoverUrl(form.mobileCoverUrl);
    setCategoryId(form.categoryId);
    setSelectedTags(form.selectedTags);
    setMusicId(form.musicId);
    setArticleStatus(form.articleStatus as 0 | 1 | 2 | 3);
    setStatusLabel(statusToLabel(form.articleStatus));
    setCommentStatus(form.commentStatus === 0 ? 0 : 1);
    setIsRecommended(form.isRecommended);
    setSavedArticleId(form.savedArticleId);
    setDetailApplied(true);
  }, [detail, detailApplied]);

  useEffect(() => {
    if (!isNew || categoryId !== null || categories.length === 0) return;
    setCategoryId(categories[0].id);
  }, [isNew, categoryId, categories]);

  const tagCandidates = useMemo(() => tags.map((tag) => ({ id: tag.id, label: tag.name })), [tags]);

  const musicOptions = useMemo(() => mapMusicListToEditorOptions(musicList), [musicList]);

  const selectedMusic = useMemo(
    () => resolveEditorMusicOption(musicId, musicList, detail?.music),
    [musicId, musicList, detail?.music],
  );
  const filteredMusicOptions = useMemo(() => {
    const query = musicSearchQuery.trim().toLowerCase();
    if (!query) return musicOptions;

    return musicOptions.filter(
      (item) =>
        item.label.toLowerCase().includes(query) || item.artist.toLowerCase().includes(query),
    );
  }, [musicOptions, musicSearchQuery]);

  const contentLength = content.replace(/[#>*_`\-\s]/g, "").length;
  const readMinutes = Math.max(1, Math.ceil(contentLength / 400));
  const isPageLoading = isOptionsLoading || (isEditing && isDetailLoading);
  const pageError = detailError;
  let disabledReason: string | null = null;
  if (isPageLoading) disabledReason = "正在加载中...";
  else if (isSaving) disabledReason = "正在保存中...";
  else if (articleStatus === 2)
    disabledReason = "加密文章暂不支持直接编辑，需修改为其他状态后保存。";
  else if (!title.trim() || !content.trim()) disabledReason = "请至少填写标题与正文";
  else if (categoryId === null) disabledReason = "请选择文章分类";

  const autosaveValue = useMemo<ArticleEditorAutosaveFormState>(
    () => ({
      title,
      description,
      content,
      coverUrl,
      mobileCoverUrl,
      categoryId,
      selectedTags,
      musicId,
      articleStatus,
      commentStatus,
      isRecommended,
    }),
    [
      title,
      description,
      content,
      coverUrl,
      mobileCoverUrl,
      categoryId,
      selectedTags,
      musicId,
      articleStatus,
      commentStatus,
      isRecommended,
    ],
  );

  const handleRestoreAutosave = useCallback((form: ArticleEditorAutosaveFormState) => {
    setTitle(form.title);
    setDescription(form.description);
    setContent(form.content);
    setCoverUrl(form.coverUrl);
    setMobileCoverUrl(form.mobileCoverUrl);
    setCategoryId(form.categoryId);
    setSelectedTags(form.selectedTags);
    setMusicId(form.musicId);
    if (form.articleStatus !== undefined) setArticleStatus(form.articleStatus as 0 | 1 | 2 | 3);
    setCommentStatus(form.commentStatus);
    setIsRecommended(form.isRecommended);
  }, []);

  const { statusText: autosaveStatusText, clearBackup } = useArticleEditorAutosave({
    articleId: savedArticleId,
    isReady: !isPageLoading && (isNew || detailApplied),
    remoteUpdatedAt: detail?.updated_at,
    value: autosaveValue,
    onRestore: handleRestoreAutosave,
  });

  useArticleEditorMainLayout({
    enabled: !isPageLoading,
    layoutRef,
    mainRef,
    railRef,
  });

  const handleCategoryChange = (key: string | number | null) => {
    if (key == null) return;
    setCategoryId(Number(key));
  };

  const handleCommentStatusChange = (key: string | number | null) => {
    if (key == null) return;
    setCommentStatus(Number(key) === 0 ? 0 : 1);
  };

  const handleArticleStatusChange = (key: string | number | null) => {
    if (key == null) return;
    setArticleStatus(Number(key) as 0 | 1 | 2 | 3);
  };

  const handleRemoveMusic = () => {
    setMusicId(null);
  };

  const handleSelectMusic = (id: string | number) => {
    setMusicId(Number(id));
    setMusicPickerOpen(false);
    setMusicSearchQuery("");
  };

  const handleMusicPickerOpenChange = (open: boolean) => {
    setMusicPickerOpen(open);
    if (!open) setMusicSearchQuery("");
  };

  const handleBack = () => {
    clearBackup();
    navigate({
      pathname: "/articles",
      search: resolveAdminListReturnSearch(location.state as AdminListEditorLocationState | null),
    });
  };

  const handleSave = async () => {
    if (disabledReason) return;

    setIsSaving(true);
    try {
      const req = buildArticleSaveReq({
        title,
        description,
        content,
        coverUrl,
        mobileCoverUrl,
        categoryId,
        selectedTags,
        musicId,
        targetStatus: articleStatus,
        commentStatus,
        isRecommended,
        articleId: savedArticleId,
      });
      const resp = await apiClient.articles.saveAdmin(req);
      setSavedArticleId(resp.id);
      setArticleStatus(resp.status as 0 | 1 | 2 | 3);
      setStatusLabel(statusToLabel(resp.status));
      clearBackup();
      addToast(articleStatus === 1 ? "文章已发布" : "已保存", "success");

      if (isNew) {
        navigate(`/articles/${resp.id}/edit`, { replace: true });
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "保存失败，请重试";
      addToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const musicPickerPopover = (
    <Popover placement="bottom end" offset={6} className="w-72">
      <PopoverDialog aria-label="选择背景音乐" className="outline-none">
        <div className="grid gap-2 p-2">
          <SearchField
            aria-label="搜索音乐"
            placeholder="搜索音乐"
            size="sm"
            value={musicSearchQuery}
            onChange={setMusicSearchQuery}
            groupClassName="bg-card"
          />
          <ul className="grid max-h-56 gap-1 overflow-y-auto">
            {filteredMusicOptions.length > 0 ? (
              filteredMusicOptions.map((item) => (
                <li key={item.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5"
                    onPress={() => handleSelectMusic(item.id)}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <SvgIcon name="music" size={16} />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.artist} · {item.duration}
                      </span>
                    </span>
                  </Button>
                </li>
              ))
            ) : (
              <li className="px-3 py-5 text-center text-xs text-muted-foreground">
                没有匹配的音乐
              </li>
            )}
          </ul>
        </div>
      </PopoverDialog>
    </Popover>
  );

  if (pageError) {
    return (
      <div className="grid gap-4">
        <Breadcrumbs aria-label="文章编辑导航">
          <BreadcrumbItem href="/articles">文章管理</BreadcrumbItem>
          <BreadcrumbItem>编辑文章</BreadcrumbItem>
        </Breadcrumbs>
        <Card>
          <CardContent className="p-6 text-sm text-destructive">{pageError}</CardContent>
        </Card>
      </div>
    );
  }

  if (isPageLoading) {
    return (
      <div className="grid gap-4">
        <Breadcrumbs aria-label="文章编辑导航">
          <BreadcrumbItem href="/articles">文章管理</BreadcrumbItem>
          <BreadcrumbItem>{isEditing ? "编辑文章" : "新建文章"}</BreadcrumbItem>
        </Breadcrumbs>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">加载中…</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      ref={layoutRef}
      data-testid="article-editor-layout"
      className={cn(
        "flex flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200",
        // 小屏：整页滚动，写作区与发布栏纵向堆叠均可触达
        // 桌面：锁在视口内，正文在编辑器内滚动
        "xl:h-[calc(100dvh-3.5rem)] xl:overflow-hidden xl:min-h-[calc(100dvh-3.5rem)]",
      )}
    >
      <div className="grid shrink-0 gap-3">
        <ArticleEditorTopBar
          isEditing={isEditing}
          statusLabel={statusLabel}
          isSaving={isSaving}
          disabledReason={disabledReason}
          onBack={handleBack}
          onSave={handleSave}
        />
      </div>

      <div
        ref={mainRef}
        data-testid="article-editor-main"
        className={cn(
          "grid min-h-0 min-w-0 gap-5",
          "xl:flex-1 xl:overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px] xl:items-stretch xl:gap-6",
        )}
      >
        <div className="max-xl:overflow-visible xl:min-h-0 xl:h-full xl:overflow-hidden">
          <ArticleEditorWritingPanel
            title={title}
            description={description}
            content={content}
            contentLength={contentLength}
            readMinutes={readMinutes}
            autosaveStatusText={autosaveStatusText}
            isContentImageUploading={isContentImageUploading}
            contentImageInputRef={contentImageInputRef}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onContentChange={setContent}
            onInsertImage={handleInsertImageRequest}
            onContentImageFileChange={(event) => void handleContentImageFileChange(event)}
          />
        </div>

        <ArticleEditorPublishRail
          ref={railRef}
          coverUrl={coverUrl}
          mobileCoverUrl={mobileCoverUrl}
          isCoverUploading={isCoverUploading}
          isMobileCoverUploading={isMobileCoverUploading}
          coverInputRef={coverInputRef}
          mobileCoverInputRef={mobileCoverInputRef}
          categories={categories}
          categoryId={categoryId}
          selectedTags={selectedTags}
          tagCandidates={tagCandidates}
          selectedMusic={selectedMusic}
          musicPickerOpen={musicPickerOpen}
          articleStatus={articleStatus}
          commentStatus={commentStatus}
          isRecommended={isRecommended}
          musicPickerTrigger={musicPickerPopover}
          onCoverFileChange={(event) => void handleCoverFileChange(event, setCoverUrl)}
          onMobileCoverFileChange={(event) =>
            void handleMobileCoverFileChange(event, setMobileCoverUrl)
          }
          onRemoveCover={() => setCoverUrl("")}
          onRemoveMobileCover={() => setMobileCoverUrl("")}
          onCategoryChange={handleCategoryChange}
          onTagsChange={setSelectedTags}
          onMusicPickerOpenChange={handleMusicPickerOpenChange}
          onRemoveMusic={handleRemoveMusic}
          onArticleStatusChange={handleArticleStatusChange}
          onCommentStatusChange={handleCommentStatusChange}
          onIsRecommendedChange={setIsRecommended}
        />

        {/* 移动端底部保存按钮 */}
        <div className="lg:hidden pb-10">
          <Tooltip title={disabledReason ?? ""} isDisabled={!disabledReason} delay={0}>
            <Button
              type="button"
              variant="ghost"
              isDisabled={false}
              isLoading={isSaving}
              aria-disabled={!!disabledReason}
              onPress={disabledReason ? undefined : handleSave}
              className={cn(
                "bg-foreground text-background shadow-none",
                "hover:!bg-foreground hover:!text-background hover:opacity-90",
                "h-11 w-full font-semibold",
                !!disabledReason && "opacity-50 cursor-not-allowed",
              )}
              data-disabled={!!disabledReason || undefined}
            >
              保存
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
