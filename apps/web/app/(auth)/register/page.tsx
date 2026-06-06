"use client";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSendCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.code !== 0) {
        setError(data.message);
        return;
      }
      setCodeSent(true);
    } catch {
      setError("发送失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, code }),
      });
      const data = await res.json();
      if (data.code !== 0) {
        setError(data.message);
        return;
      }
      router.push("/login");
    } catch {
      setError("注册失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form className="w-full max-w-sm space-y-4" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold">注册</h1>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button
            type="button"
            className="rounded bg-gray-100 px-3 py-2 text-sm disabled:opacity-50"
            onPress={handleSendCode}
            isDisabled={loading || codeSent}
          >
            {codeSent ? "已发送" : "发验证码"}
          </Button>
        </div>
        <input
          className="w-full rounded border px-3 py-2"
          type="text"
          placeholder="验证码（6 位）"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          required
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          placeholder="密码（至少 8 位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button
          className="w-full rounded bg-blue-600 py-2 text-white"
          type="submit"
          isLoading={loading}
          loadingText="注册中..."
        >
          注册
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
