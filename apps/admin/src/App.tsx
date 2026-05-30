import { type PostStatus } from "@repo/hooks/posts";
import { usePostFilter } from "@repo/hooks/react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

// 筛选按钮的数据源。用数组驱动 UI，可以避免手写三段几乎相同的按钮 JSX。
const filters: Array<PostStatus | "all"> = ["all", "published", "draft"];

export default function App() {
  // 自定义 hook 把“当前筛选状态 + 筛选后的文章列表 + 各状态数量”封装起来，组件只负责展示。
  const { posts, status, setStatus, counts } = usePostFilter("all");

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <section className="mb-8 rounded-3xl border bg-white p-8 shadow-sm">
        <Badge variant="secondary">React CSR Admin</Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">博客后台管理台</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          这里是 Vite + React 的 CSR 应用，复用同一套 <code>@repo/ui</code> 组件和{" "}
          <code>@repo/hooks</code> 状态逻辑。
        </p>
      </section>

      <div className="mb-6 flex flex-wrap gap-2">
        {/* React 渲染列表时需要稳定的 key，这里每个筛选值本身就是唯一 key。 */}
        {filters.map((item) => (
          <Button
            key={item}
            variant={status === item ? "default" : "outline"}
            onClick={() => setStatus(item)}
          >
            {item} ({counts[item]})
          </Button>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {/* 根据筛选后的 posts 渲染卡片；状态变化时 hook 会重新计算 posts，页面自动更新。 */}
        {posts.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <Badge variant={post.status === "published" ? "default" : "secondary"}>
                  {post.status}
                </Badge>
                <span className="text-sm text-muted-foreground">{post.tag}</span>
              </div>
              <CardTitle>{post.title}</CardTitle>
              <CardDescription>{post.excerpt}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="ghost">
                编辑文章
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
