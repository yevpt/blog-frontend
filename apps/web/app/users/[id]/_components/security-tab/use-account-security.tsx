"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserDetailResp, OAuthBindingResp } from "@repo/api";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { displayToMailShow, type EmailDisplayValue } from "../../_lib/display-email";
import { isMainEmailVerified, isSubEmailVerified } from "../../_lib/email-verification";

/** 单个第三方平台的绑定态 */
export interface SecurityProvider {
  source: string;
  bound: boolean;
}

/** 账号安全 Tab 的视图数据（由后端三处响应聚合而成） */
export interface SecurityData {
  username: string;
  passwordSet: boolean;
  mainEmail: string | null;
  subEmail: string | null;
  mainEmailVerified: boolean;
  subEmailVerified: boolean;
  /** 对外展示邮箱设置，对应 setting.mail_show */
  mailShow: number;
  providers: SecurityProvider[];
}

/** 拉取已启用的第三方平台列表。
 * /api/oauth/providers 不解包信封，故直接用 fetch 读取原始 { code, data }，
 * 与 components/auth/oauth-grid.tsx 保持一致；失败回退空数组。 */
async function fetchProviders(): Promise<string[]> {
  const r = await fetch("/api/oauth/providers");
  const json = (await r.json()) as { code?: number; data?: unknown };
  return json.code === 0 && Array.isArray(json.data) ? (json.data as string[]) : [];
}

/** 规范化 oauth-bindings 响应：兼容非数组信封、provider 字段与大小写差异 */
export function normalizeOAuthBindings(raw: unknown): OAuthBindingResp[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const record = item as Record<string, unknown>;
    const source = record.source ?? record.provider;
    if (typeof source !== "string" || !source) return [];
    const socialUserId = record.social_user_id;
    return [
      {
        source: source.toLowerCase(),
        social_user_id: typeof socialUserId === "number" ? socialUserId : 0,
      },
    ];
  });
}

function isProviderBound(bindings: OAuthBindingResp[], source: string): boolean {
  const key = source.toLowerCase();
  return bindings.some((b) => b.source.toLowerCase() === key);
}

/** 将三处响应聚合为视图数据 */
export function toSecurityData(
  me: UserDetailResp,
  sources: string[],
  bindingsRaw: unknown,
): SecurityData {
  const bindings = normalizeOAuthBindings(bindingsRaw);
  return {
    username: me.username,
    passwordSet: me.password_set ?? false,
    mainEmail: me.email ?? null,
    subEmail: me.meta?.sub_email ?? null,
    mainEmailVerified: isMainEmailVerified(me),
    subEmailVerified: isSubEmailVerified(me),
    mailShow: me.setting?.mail_show ?? 0,
    providers: sources.map((source) => ({
      source,
      bound: isProviderBound(bindings, source),
    })),
  };
}

interface UseAccountSecurityResult {
  data: SecurityData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** 对外展示邮箱变更后局部更新 mailShow，避免全量 reload */
  patchMailShow: (display: EmailDisplayValue) => void;
}

/** 账号安全数据容器：并行拉取当前用户详情 / 第三方平台 / 已绑定关系并聚合 */
export function useAccountSecurity(): UseAccountSecurityResult {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, sources, bindings] = await Promise.all([
        apiJson<UserDetailResp>("/api/users/me", { method: "GET" }),
        fetchProviders(),
        apiJson<unknown>("/api/users/me/oauth-bindings", { method: "GET" }),
      ]);
      setData(toSecurityData(me, sources, bindings));
    } catch (err) {
      setError(getApiErrorMessage(err, "加载账号信息失败"));
    } finally {
      setLoading(false);
    }
  }, []);

  const patchMailShow = useCallback((display: EmailDisplayValue) => {
    setData((prev) => (prev ? { ...prev, mailShow: displayToMailShow(display) } : prev));
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload, patchMailShow };
}
