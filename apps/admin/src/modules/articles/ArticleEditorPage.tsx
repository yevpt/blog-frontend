import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RichEditor } from "@repo/editor";
import { SvgIcon } from "@repo/icons";
import { ApiError } from "@repo/api";
import {
  Badge,
  BreadcrumbItem,
  Breadcrumbs,
  Button,
  ButtonUtility,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Popover,
  PopoverDialog,
  PopoverTrigger,
  SearchField,
  Select,
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
import { ArticleTagPicker } from "./components/ArticleTagPicker";
import type { ArticleTag } from "./editor-options";
import { useArticleEditorDetail } from "./hooks/use-article-editor-detail";
import { useArticleEditorOptions } from "./hooks/use-article-editor-options";
import { useArticleImageUpload } from "./hooks/use-article-image-upload";
import { useSyncedElementHeight } from "./hooks/use-synced-element-height";

export function ArticleEditorPage() {
  const navigate = useNavigate();
  const { articleId } = useParams();
  const isEditing = articleId !== undefined;
  const metaCard = useSyncedElementHeight(true);

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
  const [commentStatus] = useState<0 | 1>(1);
  const [isPassworded, setIsPassworded] = useState(false);
  const [savedArticleId, setSavedArticleId] = useState<number | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [detailApplied, setDetailApplied] = useState(false);

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
  const selectedCategory = categories.find((item) => item.id === categoryId)?.name ?? "未选择";
  const isPageLoading = isOptionsLoading || (isEditing && isDetailLoading);
  const pageError = detailError;
  const saveDisabled = isPassworded || isSaving || isPageLoading || categoryId === null;

  const handleCategoryChange = (key: string | number | null) => {
    if (key == null) return;
    setCategoryId(Number(key));
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

  const handleSave = async (targetStatus: 0 | 1) => {
    if (saveDisabled) return;

    setIsSaving(true);
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
      addToast(targetStatus === 1 ? "文章已发布" : "草稿已保存", "success");

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
        <Card className="border-border/80 shadow-sm">
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
        <Card className="border-border/80 shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">加载中…</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:-mt-3">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Breadcrumbs aria-label="文章编辑导航">
            <BreadcrumbItem href="/articles">文章管理</BreadcrumbItem>
            <BreadcrumbItem>{isEditing ? "编辑文章" : "新建文章"}</BreadcrumbItem>
          </Breadcrumbs>
        </div>
        <div className="flex shrink-0 items-center gap-2 max-sm:grid max-sm:w-full max-sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            isDisabled={saveDisabled}
            onPress={() => void handleSave(0)}
          >
            {isSaving ? "保存中…" : "保存草稿"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-foreground text-background shadow-none hover:bg-foreground/90"
            isDisabled={saveDisabled}
            onPress={() => void handleSave(1)}
          >
            {isSaving ? "发布中…" : "发布文章"}
          </Button>
        </div>
      </section>

      {isPassworded ? (
        <p className="text-sm text-muted-foreground">
          当前为加密文章，暂不支持在此页修改或保存；请通过其他方式更新阅读密码后再编辑。
        </p>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-5">
        <main className="grid min-w-0 gap-4 xl:contents">
          <Card
            ref={metaCard.ref}
            className="border-border/80 shadow-sm xl:col-start-1 xl:row-start-1 xl:self-start"
          >
            <CardContent className="grid gap-4 p-5">
              <Input
                value={title}
                onChange={setTitle}
                label="文章标题"
                placeholder="输入文章标题"
                inputClassName="font-semibold"
              />
              <div className="grid gap-1.5">
                <Label>文章描述</Label>
                <textarea
                  aria-label="文章描述"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={cn(
                    "min-h-24 resize-y rounded-xl border border-input bg-card/75 px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition-shadow",
                    "placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-ring",
                  )}
                  placeholder="写一段文章摘要"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-border/80 shadow-sm xl:col-start-1 xl:row-start-2">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 p-5 pb-3">
              <CardTitle className="text-base">文章内容</CardTitle>
              <Badge variant="secondary">
                {isContentImageUploading ? "图片上传中…" : "Markdown 兼容"}
              </Badge>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <RichEditor
                value={content}
                onChange={setContent}
                placeholder="开始写文章正文..."
                showToolbarCharacterCount={false}
                className={cn(
                  "rounded-xl",
                  "[&_[data-rich-editor-area]]:min-h-[420px]",
                  "[&_.tiptap]:min-h-[420px] [&_.tiptap]:max-h-[60dvh]",
                )}
                onInsertImage={handleInsertImageRequest}
              />
              <input
                ref={contentImageInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => void handleContentImageFileChange(event)}
              />
            </CardContent>
          </Card>
        </main>

        <aside className="grid gap-4 xl:contents">
          <Card
            className="flex flex-col overflow-hidden border-border/80 shadow-sm xl:col-start-2 xl:row-start-1"
            style={metaCard.height !== undefined ? { height: metaCard.height } : undefined}
          >
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-5">
              <div className="flex shrink-0 items-center justify-between gap-3">
                <CardTitle className="text-base">背景图片</CardTitle>
                <Badge variant="secondary">{isCoverUploading ? "上传中…" : "16:9"}</Badge>
              </div>
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-muted">
                {coverUrl ? (
                  <img src={coverUrl} alt="文章背景图片预览" className="size-full object-cover" />
                ) : (
                  <div className="size-full bg-muted" aria-hidden />
                )}
                {coverUrl ? (
                  <ButtonUtility
                    type="button"
                    size="xs"
                    aria-label="移除背景图"
                    icon={<SvgIcon name="close" size={14} />}
                    className="absolute top-2 right-2 z-10 size-7 rounded-full border-0 bg-black/40 p-0 text-white shadow-none backdrop-blur-sm hover:bg-black/60 hover:text-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      setCoverUrl("");
                    }}
                  />
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  aria-label="替换背景图"
                  isDisabled={isCoverUploading}
                  onPress={() => coverInputRef.current?.click()}
                  className={cn(
                    "absolute inset-0 z-0 h-auto w-auto rounded-xl p-0",
                    "flex flex-col items-center justify-center gap-1.5",
                    coverUrl
                      ? "bg-black/45 text-white hover:bg-black/55"
                      : "border border-dashed border-border/80 bg-transparent text-muted-foreground hover:border-foreground/25 hover:bg-muted/70",
                  )}
                >
                  <SvgIcon name={coverUrl ? "camera" : "image"} size={coverUrl ? 20 : 22} />
                  <span className="text-xs font-medium">
                    {isCoverUploading ? "上传中…" : coverUrl ? "更换图片" : "添加背景图"}
                  </span>
                </Button>
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => void handleCoverFileChange(event, setCoverUrl)}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:col-start-2 xl:row-start-2 xl:sticky xl:top-4 xl:self-start">
            <Card className="border-border/80 shadow-sm">
              <CardContent className="grid gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm">内容归档</CardTitle>
                  <Badge variant="brand">
                    {selectedCategory} · {selectedTags.length} 标签
                  </Badge>
                </div>

                <div className="grid gap-1.5">
                  <Label>文章分类</Label>
                  <Select
                    aria-label="文章分类"
                    size="sm"
                    selectedKey={categoryId !== null ? String(categoryId) : undefined}
                    onSelectionChange={handleCategoryChange}
                    placeholder="选择分类"
                  >
                    {categories.map((item) => (
                      <Select.Item key={String(item.id)} id={String(item.id)} label={item.name} />
                    ))}
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label>文章标签</Label>
                  <ArticleTagPicker
                    selectedTags={selectedTags}
                    tagCandidates={tagCandidates}
                    onChange={setSelectedTags}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 p-5 pb-3">
                <CardTitle className="text-base">背景音乐</CardTitle>
                <Badge variant="secondary">可选</Badge>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {selectedMusic ? (
                  <div className="flex h-16 items-center gap-3 rounded-xl border border-border bg-background p-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <SvgIcon name="music" size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {selectedMusic.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {selectedMusic.artist} · {selectedMusic.duration}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <PopoverTrigger
                        isOpen={musicPickerOpen}
                        onOpenChange={handleMusicPickerOpenChange}
                      >
                        <ButtonUtility
                          type="button"
                          size="sm"
                          color="tertiary"
                          tooltip="更换音乐"
                          icon={<SvgIcon name="refresh-cw" size={18} />}
                        />
                        {musicPickerPopover}
                      </PopoverTrigger>
                      <ButtonUtility
                        type="button"
                        size="sm"
                        color="tertiary"
                        tooltip="移除背景音乐"
                        icon={
                          <span className="text-destructive">
                            <SvgIcon name="trash" size={18} />
                          </span>
                        }
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleRemoveMusic}
                      />
                    </div>
                  </div>
                ) : (
                  <PopoverTrigger
                    isOpen={musicPickerOpen}
                    onOpenChange={handleMusicPickerOpenChange}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label="添加背景音乐"
                      className={cn(
                        "h-16 w-full rounded-xl p-0",
                        "flex flex-col items-center justify-center gap-1.5",
                        "border border-dashed border-border/80 bg-transparent text-muted-foreground",
                        "hover:border-foreground/25 hover:bg-muted/70",
                      )}
                    >
                      <SvgIcon name="music" size={22} />
                      <span className="text-xs font-medium">添加背景音乐</span>
                    </Button>
                    {musicPickerPopover}
                  </PopoverTrigger>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 p-5 pb-3">
                <CardTitle className="text-base">发布状态</CardTitle>
                <Badge
                  variant={
                    statusLabel === "已发布"
                      ? "success"
                      : statusLabel === "加密"
                        ? "warning"
                        : "secondary"
                  }
                >
                  {statusLabel}
                </Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 p-5 pt-0 text-sm">
                <div className="rounded-xl bg-background p-3">
                  <p className="text-xs text-muted-foreground">正文长度</p>
                  <p className="mt-1 font-semibold">{contentLength} 字</p>
                </div>
                <div className="rounded-xl bg-background p-3">
                  <p className="text-xs text-muted-foreground">阅读时间</p>
                  <p className="mt-1 font-semibold">
                    {Math.max(1, Math.ceil(contentLength / 400))} 分钟
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
