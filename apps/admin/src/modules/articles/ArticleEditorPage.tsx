import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  cn,
} from "@repo/ui";
import { apiClient } from "../../lib/api";
import { addToast } from "../../lib/toast";
import {
  buildArticleSaveReq,
  formatMusicDuration,
  mapDetailToFormState,
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
import { useArticleImageUpload } from "./hooks/use-article-image-upload";

export function ArticleEditorPage() {
  const navigate = useNavigate();
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
    contentImageInputRef,
    isCoverUploading,
    isContentImageUploading,
    handleCoverFileChange,
    handleInsertImageRequest,
    handleContentImageFileChange,
  } = useArticleImageUpload();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<ArticleTag[]>([]);
  const [musicId, setMusicId] = useState<number | null>(null);
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [musicSearchQuery, setMusicSearchQuery] = useState("");
  const [statusLabel, setStatusLabel] = useState<ArticleEditorStatusLabel>("草稿");
  const [commentStatus, setCommentStatus] = useState<0 | 1>(1);
  const [isPassworded, setIsPassworded] = useState(false);
  const [savedArticleId, setSavedArticleId] = useState<number | undefined>(undefined);
  const [savingAction, setSavingAction] = useState<"draft" | "publish" | null>(null);
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
    setCategoryId(form.categoryId);
    setSelectedTags(form.selectedTags);
    setMusicId(form.musicId);
    setStatusLabel(statusToLabel(form.articleStatus));
    setCommentStatus(form.commentStatus === 0 ? 0 : 1);
    setIsPassworded(form.isPassworded);
    setSavedArticleId(form.savedArticleId);
    setDetailApplied(true);
  }, [detail, detailApplied]);

  useEffect(() => {
    if (!isNew || categoryId !== null || categories.length === 0) return;
    setCategoryId(categories[0].id);
  }, [isNew, categoryId, categories]);

  const tagCandidates = useMemo(() => tags.map((tag) => ({ id: tag.id, label: tag.name })), [tags]);

  const musicOptions = useMemo(
    () =>
      musicList.map((item) => ({
        id: item.id,
        label: item.name,
        artist: item.singer,
        duration: formatMusicDuration(item.duration),
        durationSeconds: item.duration,
        url: item.url,
      })),
    [musicList],
  );

  const selectedMusic =
    musicId !== null ? (musicOptions.find((item) => item.id === musicId) ?? null) : null;
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
  const saveDisabled =
    isPassworded || savingAction !== null || isPageLoading || categoryId === null;

  const autosaveValue = useMemo<ArticleEditorAutosaveFormState>(
    () => ({
      title,
      description,
      content,
      coverUrl,
      categoryId,
      selectedTags,
      musicId,
      commentStatus,
    }),
    [title, description, content, coverUrl, categoryId, selectedTags, musicId, commentStatus],
  );

  const handleRestoreAutosave = useCallback((form: ArticleEditorAutosaveFormState) => {
    setTitle(form.title);
    setDescription(form.description);
    setContent(form.content);
    setCoverUrl(form.coverUrl);
    setCategoryId(form.categoryId);
    setSelectedTags(form.selectedTags);
    setMusicId(form.musicId);
    setCommentStatus(form.commentStatus);
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
    navigate("/articles");
  };

  const handleSave = async (targetStatus: 0 | 1) => {
    if (saveDisabled) return;

    setSavingAction(targetStatus === 0 ? "draft" : "publish");
    try {
      const req = buildArticleSaveReq({
        title,
        description,
        content,
        coverUrl,
        categoryId,
        selectedTags,
        musicId,
        targetStatus,
        commentStatus,
        articleId: savedArticleId,
      });
      const resp = await apiClient.articles.saveAdmin(req);
      setSavedArticleId(resp.id);
      setStatusLabel(statusToLabel(resp.status));
      clearBackup();
      addToast(targetStatus === 1 ? "文章已发布" : "草稿已保存", "success");

      if (isNew) {
        navigate(`/articles/${resp.id}/edit`, { replace: true });
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "保存失败，请重试";
      addToast(message, "error");
    } finally {
      setSavingAction(null);
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
        "flex flex-col lg:-mt-6",
        // 小屏：锁在视口内，正文在编辑器内滚动
        "max-h-[calc(100dvh-6.5rem)] overflow-hidden",
        // 桌面：至少铺满视口；右栏更高时由主区域增高触发页面滚动
        "xl:min-h-[calc(100dvh-1.5rem)]",
      )}
    >
      <div className="grid shrink-0 gap-3">
        <ArticleEditorTopBar
          isEditing={isEditing}
          statusLabel={statusLabel}
          savingAction={savingAction}
          saveDisabled={saveDisabled}
          onBack={handleBack}
          onSaveDraft={() => void handleSave(0)}
          onPublish={() => void handleSave(1)}
        />

        {isPassworded ? (
          <p className="text-sm text-muted-foreground">
            当前为加密文章，暂不支持在此页修改或保存；请通过其他方式更新阅读密码后再编辑。
          </p>
        ) : null}
      </div>

      <div
        ref={mainRef}
        data-testid="article-editor-main"
        className={cn(
          "grid min-h-0 min-w-0 flex-1 gap-5 overflow-hidden",
          "xl:grid-cols-[minmax(0,1fr)_320px] xl:items-stretch xl:gap-6",
        )}
      >
        <div className="min-h-0 h-full overflow-hidden">
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
          isCoverUploading={isCoverUploading}
          coverInputRef={coverInputRef}
          categories={categories}
          categoryId={categoryId}
          selectedTags={selectedTags}
          tagCandidates={tagCandidates}
          selectedMusic={selectedMusic}
          musicPickerOpen={musicPickerOpen}
          commentStatus={commentStatus}
          musicPickerTrigger={musicPickerPopover}
          onCoverFileChange={(event) => void handleCoverFileChange(event, setCoverUrl)}
          onRemoveCover={() => setCoverUrl("")}
          onCategoryChange={handleCategoryChange}
          onTagsChange={setSelectedTags}
          onMusicPickerOpenChange={handleMusicPickerOpenChange}
          onRemoveMusic={handleRemoveMusic}
          onCommentStatusChange={handleCommentStatusChange}
        />
      </div>
    </div>
  );
}
