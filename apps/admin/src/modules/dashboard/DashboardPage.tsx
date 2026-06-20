import { Link } from "react-router-dom";
import { SvgIcon, type IconName } from "@repo/icons";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@repo/ui";
import { adminNavItems } from "../../config/modules";
import { useAuthStore } from "../../store/auth";

// TODO(api): 待后端提供后台概览统计接口。
const stats: Array<{
  label: string;
  value: string;
  helper: string;
  icon: IconName;
}> = [
  { label: "文章总数", value: "128", helper: "本月新增 8 篇", icon: "pen" },
  { label: "分类数", value: "12", helper: "内容结构稳定", icon: "folder" },
  { label: "标签数", value: "46", helper: "覆盖技术与生活", icon: "tag" },
  { label: "音乐数", value: "32", helper: "最近更新 3 首", icon: "music" },
];

// TODO(api): 待后端提供最近文章列表接口。
const recentArticles = [
  { title: "Vite 管理后台的主题方案", status: "已发布", category: "前端", updatedAt: "2026-06-15" },
  {
    title: "React Query 与后台表格状态",
    status: "草稿",
    category: "工程",
    updatedAt: "2026-06-12",
  },
  {
    title: "把博客编辑器体验打磨到顺手",
    status: "审核中",
    category: "随笔",
    updatedAt: "2026-06-08",
  },
];

function StatusBadge({ status }: { status: string }) {
  const variant = status === "已发布" ? "success" : status === "草稿" ? "secondary" : "warning";
  return <Badge variant={variant}>{status}</Badge>;
}

export function DashboardPage() {
  const displayName =
    useAuthStore((state) => state.user?.nickname || state.user?.username) ?? "管理员";
  const quickEntries = adminNavItems.filter((item) => item.path !== "/");

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            你好，{displayName}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            今天也可以从这里快速进入内容、站点与发布管理。
          </p>
        </div>
        <Button href="/articles" className="w-full sm:w-auto">
          <SvgIcon name="plus" size={18} />
          写文章
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="后台统计">
        {stats.map((item) => (
          <Card key={item.label} className="border-border/80 shadow-sm">
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-3">
              <div>
                <CardDescription>{item.label}</CardDescription>
                <CardTitle className="mt-2 text-3xl">{item.value}</CardTitle>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <SvgIcon name={item.icon} size={20} />
              </span>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">{item.helper}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <Card className="min-w-0 border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>最近文章</CardTitle>
            <CardDescription>静态占位数据，后续接入文章管理接口。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">标题</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 font-medium">分类</th>
                    <th className="px-4 py-3 font-medium">更新时间</th>
                    <th className="py-3 pl-4 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentArticles.map((article) => (
                    <tr key={article.title}>
                      <td className="py-4 pr-4 font-medium text-foreground">{article.title}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={article.status} />
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{article.category}</td>
                      <td className="px-4 py-4 text-muted-foreground">{article.updatedAt}</td>
                      <td className="py-4 pl-4 text-right">
                        <Button href="/articles" variant="ghost" size="sm">
                          编辑
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>快捷入口</CardTitle>
            <CardDescription>进入常用管理模块。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {quickEntries.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm transition-colors",
                  "hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <SvgIcon name={item.icon} size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
