"use client";
import { type FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@repo/ui";
import { getApiErrorMessage } from "@/lib/client-fetch";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (data.code !== 0) {
        setError(data.message);
        return;
      }
      // refresh() 触发 Server Component（layout.tsx）重新执行，读取新设置的 cookie
      router.refresh();
      router.push(searchParams.get("from") ?? "/");
    } catch (err) {
      setError(getApiErrorMessage(err, "网络错误，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form className="w-full max-w-sm space-y-4" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold">登录</h1>
        <input
          className="w-full rounded border px-3 py-2"
          type="text"
          placeholder="用户名 / 邮箱"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button
          className="w-full rounded bg-blue-600 py-2 text-white"
          type="submit"
          isLoading={loading}
          loadingText="登录中..."
        >
          登录
        </Button>
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
