import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useParams } from "react-router-dom";
import { RichEditor } from "@repo/editor";
import { SvgIcon } from "@repo/icons";
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
import { ArticleTagPicker } from "./components/ArticleTagPicker";
import { categoryOptions, musicOptions, tagOptions, type ArticleTag } from "./editor-options";
import { useSyncedElementHeight } from "./hooks/use-synced-element-height";

const defaultCoverUrl =
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80";

export function ArticleEditorPage() {
  const { articleId } = useParams();
  const isEditing = articleId !== undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const metaCard = useSyncedElementHeight(true);
  const [title, setTitle] = useState("把博客编辑器体验打磨到顺手");
  const [description, setDescription] = useState(
    "从后台写作流出发，重新整理文章的封面、分类、标签与正文编辑，让内容发布更像一个稳定的工作台。",
  );
  const [content, setContent] = useState(
    "## 为什么文章页需要单独定制编辑器\n\n评论和碎语更强调快速输入，文章编辑则需要更稳定的空间感。正文区域应该更高、更安静，并且让工具栏服务于长文本写作。\n\n> 正式实现复用公用 inline 类型编辑器，并通过样式和插入行为做文章页定制。\n",
  );
  const [coverUrl, setCoverUrl] = useState(defaultCoverUrl);
  const [categoryId, setCategoryId] = useState("frontend");
  const [selectedTags, setSelectedTags] = useState<ArticleTag[]>(tagOptions.slice(0, 3));
  const [musicId, setMusicId] = useState<string | null>("midnight");
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [musicSearchQuery, setMusicSearchQuery] = useState("");
  const [status, setStatus] = useState("草稿");

  const selectedMusic = musicId ? (musicOptions.find((item) => item.id === musicId) ?? null) : null;
  const filteredMusicOptions = useMemo(() => {
    const query = musicSearchQuery.trim().toLowerCase();
    if (!query) return musicOptions;

    return musicOptions.filter(
      (item) =>
        (item.label?.toLowerCase().includes(query) ?? false) ||
        item.artist.toLowerCase().includes(query),
    );
  }, [musicSearchQuery]);
  const contentLength = content.replace(/[#>*_`\-\s]/g, "").length;
  const selectedCategory =
    categoryOptions.find((item) => item.id === categoryId)?.label ?? categoryOptions[0].label;
  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverUrl(URL.createObjectURL(file));
  };
  const handleCategoryChange = (key: string | number | null) => {
    if (key != null) setCategoryId(String(key));
  };
  const handleRemoveMusic = () => {
    setMusicId(null);
  };
  const handleSelectMusic = (id: string | number) => {
    setMusicId(String(id));
    setMusicPickerOpen(false);
    setMusicSearchQuery("");
  };
  const handleMusicPickerOpenChange = (open: boolean) => {
    setMusicPickerOpen(open);
    if (!open) setMusicSearchQuery("");
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
          <Button type="button" variant="outline" size="sm" onPress={() => setStatus("草稿")}>
            保存草稿
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-foreground text-background shadow-none hover:bg-foreground/90"
            onPress={() => setStatus("已发布")}
          >
            发布文章
          </Button>
        </div>
      </section>

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
              <Badge variant="secondary">Markdown 兼容</Badge>
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
                onInsertImage={(insert) => insert(coverUrl, title)}
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
                <Badge variant="secondary">16:9</Badge>
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
                  onPress={() => fileInputRef.current?.click()}
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
                    {coverUrl ? "更换图片" : "添加背景图"}
                  </span>
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleCoverChange}
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
                    selectedKey={categoryId}
                    onSelectionChange={handleCategoryChange}
                    placeholder="选择分类"
                  >
                    {categoryOptions.map((item) => (
                      <Select.Item key={item.id} id={item.id} label={item.label} />
                    ))}
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label>文章标签</Label>
                  <ArticleTagPicker selectedTags={selectedTags} onChange={setSelectedTags} />
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
                <Badge variant={status === "已发布" ? "success" : "secondary"}>{status}</Badge>
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
