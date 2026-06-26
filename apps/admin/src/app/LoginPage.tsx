import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@repo/api";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@repo/ui";
import { BrandMark } from "../components/layout/BrandMark";
import { ThemeToggle } from "../components/layout/ThemeToggle";
import { apiClient } from "../lib/api";
import { addToast } from "../lib/toast";
import { syncCurrentUser } from "../lib/session-init";
import { useAuthStore } from "../store/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { setAccessToken, setUser } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await apiClient.adminAuth.login({ username, password });
      setAccessToken(resp.access_token);
      localStorage.setItem("refresh_token", resp.refresh_token);
      // 登录响应不含 avatar_url，需拉取 /users/me 与刷新续期路径一致
      try {
        await syncCurrentUser();
      } catch {
        setUser(resp.user);
      }
      navigate("/");
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : "网络错误，请稍后重试", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div
        aria-label="YEVPT"
        className="fixed left-[18px] top-[18px] z-10 flex items-center gap-2.5"
      >
        <span className="flex h-9 w-9 items-center justify-center">
          <BrandMark />
        </span>
        <span className="hidden h-9 items-center text-[14px] font-[760] leading-9 tracking-[0.06em] sm:flex">
          YEVPT
        </span>
      </div>
      <ThemeToggle className="fixed right-[18px] top-[18px] z-10 h-9 w-9 rounded-full p-0 text-foreground hover:bg-foreground/[0.06] hover:text-primary sm:right-6 sm:top-6" />

      <section
        className="flex min-h-dvh w-full items-stretch justify-center p-0 sm:items-center sm:p-6"
        aria-label="博客后台登录"
      >
        <Card className="flex min-h-dvh w-full flex-col justify-center rounded-none border-0 bg-background shadow-none sm:min-h-0 sm:max-w-[408px] sm:rounded-[22px] sm:border sm:border-border/80 sm:bg-card/95 sm:shadow-[0_18px_54px_rgba(24,24,27,0.08)] sm:dark:shadow-[0_18px_54px_rgba(0,0,0,0.28)]">
          <CardHeader className="space-y-2 px-7 pb-7 pt-0 text-center sm:px-9 sm:pb-6 sm:pt-10">
            <CardTitle className="text-2xl font-semibold leading-tight">登录后台</CardTitle>
            <CardDescription className="text-sm leading-6">使用管理员账号继续。</CardDescription>
          </CardHeader>

          <CardContent className="px-7 pb-9 pt-0 sm:px-9 sm:pb-10">
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <Input
                label="用户名"
                type="text"
                placeholder="输入用户名"
                value={username}
                onChange={setUsername}
                className="gap-2"
              />
              <Input
                label="密码"
                type="password"
                placeholder="输入密码"
                value={password}
                onChange={setPassword}
                className="gap-2"
              />
              <Button
                className="mt-1 h-[46px] w-full rounded-[14px] font-semibold"
                type="submit"
                isLoading={loading}
                loadingText="登录中..."
              >
                登录
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
