import { getPublishedPosts } from "@repo/hooks/posts";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

import { FeaturedPostPicker } from "./featured-post-picker";

export default function Home() {
  // 这个组件默认是服务端组件，可以直接在渲染时准备静态数据，不会把这段逻辑发到浏览器执行。
  const publishedPosts = getPublishedPosts();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12">
      <section className="rounded-3xl border bg-white p-8 shadow-sm">
        <Badge>Next.js SSR</Badge>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          一个可复用 packages 的 monorepo 博客前台
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          这个页面由 Next.js App Router 渲染，文章数据和 shadcn 风格组件来自共享 package。
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {/* 用 map 把文章数组转换成一组 Card，是 React 中最常见的列表渲染方式。 */}
        {publishedPosts.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <Badge variant="outline">{post.tag}</Badge>
                <span className="text-sm text-muted-foreground">{post.readingMinutes} min</span>
              </div>
              <CardTitle>{post.title}</CardTitle>
              <CardDescription>{post.excerpt}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">作者：{post.author}</CardContent>
          </Card>
        ))}
      </section>

      <FeaturedPostPicker />
    </main>
  );
}
