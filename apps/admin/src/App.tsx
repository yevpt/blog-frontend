import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { type PostStatus } from "@repo/hooks/posts";
import { usePostFilter } from "@repo/hooks/react";
import { SvgSprite } from "@repo/icons";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import { AuthGuard } from "./components/AuthGuard";
import { LoginPage } from "./pages/LoginPage";
import { useAuthStore } from "./store/auth";
import { apiClient } from "./lib/api";

const filters: Array<PostStatus | "all"> = ["all", "published", "draft"];

// 文章管理页（原 App 的主体内容）
function DashboardPage() {
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

/**
 * App 挂载时的静默续期逻辑：检查 localStorage 的 refresh_token，
 * 若存在则尝试换发新 access_token，避免用户每次刷新页面都要重新登录。
 */
function AuthInit({ children }: { children: ReactNode }) {
  const { setAccessToken, logout } = useAuthStore();

  useEffect(() => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return;

    apiClient.auth
      .refresh({ refresh_token: refreshToken })
      .then((tokens) => {
        setAccessToken(tokens.access_token);
        localStorage.setItem("refresh_token", tokens.refresh_token);
      })
      .catch(() => {
        // refresh token 已过期，清除存储，用户需重新登录
        localStorage.removeItem("refresh_token");
        logout();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 仅在 App 首次挂载时执行一次

  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <SvgSprite />
      <BrowserRouter>
        <AuthInit>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AuthGuard />}>
              <Route path="/" element={<DashboardPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthInit>
      </BrowserRouter>
    </>
  );
}
