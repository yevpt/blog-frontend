"use client";

import { usePostFilter } from "@repo/hooks/react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

// 使用 useState、点击事件等浏览器交互时，Next.js 组件需要标记为 "use client"。
export function FeaturedPostPicker() {
  // 初始只显示 published，点击按钮后 setStatus 会触发组件重新渲染。
  const { posts, setStatus, status, counts } = usePostFilter("published");

  return (
    <Card className="bg-white/80">
      <CardHeader>
        <CardTitle>共享 hook 交互测试</CardTitle>
        <CardDescription>
          当前展示 {posts.length} 篇文章，筛选状态来自 <code>@repo/hooks</code>。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {/* as const 让 TypeScript 保留字面量类型，setStatus 才知道这些值是合法状态。 */}
          {(["all", "published", "draft"] as const).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={status === item ? "default" : "outline"}
              onClick={() => setStatus(item)}
            >
              {item} ({counts[item]})
            </Button>
          ))}
        </div>
        <div className="grid gap-3">
          {posts.map((post) => (
            <div key={post.id} className="rounded-lg border bg-background p-4">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant={post.status === "published" ? "default" : "secondary"}>
                  {post.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {post.readingMinutes} 分钟阅读
                </span>
              </div>
              <h3 className="font-semibold">{post.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{post.excerpt}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
