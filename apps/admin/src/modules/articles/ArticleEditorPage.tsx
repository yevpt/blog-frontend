import { useRef, useState, type ChangeEvent } from "react";
import { useParams } from "react-router-dom";
import { RichEditor } from "@repo/editor";
import { SvgIcon } from "@repo/icons";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  HintText,
  Input,
  Label,
  Select,
  cn,
} from "@repo/ui";
import { ArticleTagPicker } from "./components/ArticleTagPicker";
import { categoryOptions, musicOptions, tagOptions, type ArticleTag } from "./editor-options";

const defaultCoverUrl =
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80";

export function ArticleEditorPage() {
  const { articleId } = useParams();
  const isEditing = articleId !== undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [musicId, setMusicId] = useState("midnight");
  const [status, setStatus] = useState("草稿");

  const selectedMusic =
    musicOptions.find((item) => item.id === musicId) ?? musicOptions[musicOptions.length - 1];
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
  const handleMusicChange = (key: string | number | null) => {
    if (key != null) setMusicId(String(key));
  };

  return (
    <div className="grid gap-5 lg:-mt-3">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button href="/articles" variant="outline" size="sm" aria-label="返回文章列表">
            <SvgIcon name="arrow-back" size={16} />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold tracking-normal text-foreground">
              {isEditing ? "编辑文章" : "新建文章"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">编辑标题、摘要、正文和展示配置。</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button type="button" variant="outline" onPress={() => setStatus("草稿")}>
            保存草稿
          </Button>
          <Button type="button" onPress={() => setStatus("已发布")}>
            发布文章
          </Button>
        </div>
      </section>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="grid min-w-0 gap-4">
          <Card className="border-border/80 shadow-sm">
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
                <HintText>用于文章列表与分享摘要。</HintText>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-border/80 shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
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

        <aside className="grid gap-4 xl:sticky xl:top-4">
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
              <CardTitle className="text-base">背景图片</CardTitle>
              <Badge variant="secondary">16:9</Badge>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted">
                {coverUrl ? (
                  <img src={coverUrl} alt="文章背景图片预览" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <SvgIcon name="image" size={28} />
                    <span className="text-sm">尚未设置背景图</span>
                  </div>
                )}
              </div>
              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleCoverChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  onPress={() => fileInputRef.current?.click()}
                >
                  <SvgIcon name="image" size={16} />
                  替换背景图
                </Button>
                <Button type="button" variant="ghost" onPress={() => setCoverUrl("")}>
                  移除
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
              <CardTitle className="text-base">内容归档</CardTitle>
              <Badge variant="brand">
                {selectedCategory} · {selectedTags.length} 标签
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 pt-0">
              <Select
                aria-label="文章分类"
                label="文章分类"
                selectedKey={categoryId}
                onSelectionChange={handleCategoryChange}
                placeholder="选择分类"
              >
                {categoryOptions.map((item) => (
                  <Select.Item key={item.id} id={item.id} label={item.label} />
                ))}
              </Select>

              <div className="grid gap-2">
                <Label>文章标签</Label>
                <ArticleTagPicker selectedTags={selectedTags} onChange={setSelectedTags} />
                <HintText>点击已选标签可移除，点击增加标签继续追加。</HintText>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
              <CardTitle className="text-base">背景音乐</CardTitle>
              <Badge variant="secondary">可选</Badge>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 pt-0">
              <Select
                aria-label="背景音乐"
                label="背景音乐"
                selectedKey={musicId}
                onSelectionChange={handleMusicChange}
                placeholder="选择音乐"
              >
                {musicOptions.map((item) => (
                  <Select.Item key={item.id} id={item.id} label={item.label} />
                ))}
              </Select>
              <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border bg-background p-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <SvgIcon name="music" size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selectedMusic.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedMusic.artist} · {selectedMusic.duration}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
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
        </aside>
      </div>
    </div>
  );
}
