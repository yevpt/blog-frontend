import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@repo/api";
import { Button } from "@repo/ui";
import { apiClient } from "../lib/api";
import { useAuthStore } from "../store/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { setAccessToken, setUser } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.auth.login({ identifier, password });
      setAccessToken(resp.access_token);
      setUser(resp.user);
      localStorage.setItem("refresh_token", resp.refresh_token);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "网络错误，请稍后重试");
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
