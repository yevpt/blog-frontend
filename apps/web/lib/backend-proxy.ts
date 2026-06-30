// apps/web/lib/backend-proxy.ts
import { type NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  type AuthTokens,
  authCookieHeader,
  refreshAuthTokens,
  setAuthCookies,
} from "@/lib/auth-refresh";

function apiBaseUrl(): string {
  return process.env.API_BASE_URL!;
}

function token(req: NextRequest) {
  return req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
}

function authHeader(t: string | undefined): Record<string, string> {
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** 审核写请求只透传调用方生成的非空幂等键，不在代理层擅自生成。 */
function idempotencyHeader(req: NextRequest): Record<string, string> {
  const key = req.headers.get("Idempotency-Key")?.trim();
  return key ? { "Idempotency-Key": key } : {};
}

/** 将浏览器请求中的 Cookie 转发到后端，确保 visitor_id 等字段不丢失 */
function cookieHeader(req: NextRequest, tokens?: AuthTokens | null): Record<string, string> {
  if (tokens) return { Cookie: authCookieHeader(req, tokens) };

  const all = req.cookies.getAll();
  if (all.length === 0) return {};
  return { Cookie: all.map((c) => `${c.name}=${c.value}`).join("; ") };
}

/** 将后端 Set-Cookie header 转发到浏览器响应中 */
function forwardCookies(res: Response, response: NextResponse): void {
  const cookies = res.headers.getSetCookie();
  for (const cookie of cookies) {
    response.headers.append("set-cookie", cookie);
  }
}

async function parseBackendJson(res: Response): Promise<NextResponse> {
  // 401/403/404 后端仍以统一信封 { code, message } 返回具体原因，读取并透传供 throwApiClientError 使用
  if (res.status === 401 || res.status === 403 || res.status === 404) {
    const json = (await res.json().catch(() => ({ message: "" }))) as { message?: string };
    const fallback =
      res.status === 401 ? "Unauthorized" : res.status === 403 ? "Forbidden" : "Not found";
    const errRes = NextResponse.json({ error: json.message || fallback }, { status: res.status });
    forwardCookies(res, errRes);
    return errRes;
  }

  const text = await res.text();
  let json: { code?: number; message?: string; data?: unknown } = {};
  if (text) {
    try {
      json = JSON.parse(text) as { code?: number; message?: string; data?: unknown };
    } catch {
      // 后端返回非 JSON（如空体）时按空对象处理，避免抛错
    }
  }

  if (json.code !== undefined && json.code !== 0) {
    const errRes = NextResponse.json({ error: json.message }, { status: 400 });
    forwardCookies(res, errRes);
    return errRes;
  }
  // 用 ?? 保留空数组等 falsy 合法 data（|| 会把 [] 误落成 {}）
  const okRes = NextResponse.json(json.data ?? {});
  forwardCookies(res, okRes);
  return okRes;
}

async function refreshFromRequest(req: NextRequest): Promise<AuthTokens | null> {
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;
  return refreshAuthTokens(refreshToken);
}

async function proxyWithRefresh(
  req: NextRequest,
  opts: { requireAuth: boolean },
  fetchBackend: (accessToken: string | undefined, tokens: AuthTokens | null) => Promise<Response>,
): Promise<NextResponse> {
  let accessToken = token(req);
  let tokens: AuthTokens | null = null;

  if (!accessToken) {
    tokens = await refreshFromRequest(req);
    accessToken = tokens?.accessToken;
  }

  if (opts.requireAuth && !accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let res = await fetchBackend(accessToken, tokens);
  if (res.status === 401 && !tokens) {
    tokens = await refreshFromRequest(req);
    if (tokens) {
      accessToken = tokens.accessToken;
      res = await fetchBackend(accessToken, tokens);
    }
  }

  const response = await parseBackendJson(res);
  if (tokens) {
    setAuthCookies(response, tokens);
  }
  return response;
}

/** GET 代理：转发 query 参数，携带可选 access token 和 Cookie */
export async function proxyGet(req: NextRequest, path: string): Promise<NextResponse> {
  const qs = req.nextUrl.searchParams.toString();
  try {
    return await proxyWithRefresh(req, { requireAuth: false }, (accessToken, tokens) =>
      fetch(`${apiBaseUrl()}${path}${qs ? `?${qs}` : ""}`, {
        method: "GET",
        headers: { ...authHeader(accessToken), ...cookieHeader(req, tokens) },
      }),
    );
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}

/** POST 代理：转发 JSON body，携带 access token 和 Cookie（requireAuth=true 时无 token 直接 401） */
export async function proxyPost(
  req: NextRequest,
  path: string,
  opts: { requireAuth?: boolean; hasBody?: boolean } = {},
): Promise<NextResponse> {
  const { requireAuth = true, hasBody = true } = opts;
  try {
    const body = hasBody ? JSON.stringify(await req.json().catch(() => ({}))) : undefined;
    return await proxyWithRefresh(req, { requireAuth }, (accessToken, tokens) =>
      fetch(`${apiBaseUrl()}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(accessToken),
          ...cookieHeader(req, tokens),
          ...idempotencyHeader(req),
        },
        body,
      }),
    );
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}

/** PATCH 代理：转发 JSON body，携带 access token */
export async function proxyPatch(req: NextRequest, path: string): Promise<NextResponse> {
  try {
    const body = JSON.stringify(await req.json().catch(() => ({})));
    return await proxyWithRefresh(req, { requireAuth: true }, (accessToken, tokens) =>
      fetch(`${apiBaseUrl()}${path}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(accessToken),
          ...cookieHeader(req, tokens),
          ...idempotencyHeader(req),
        },
        body,
      }),
    );
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}

/** 各 multipart 代理路径允许的最大请求体（与后端硬限制对齐，含表单开销）。 */
const MULTIPART_MAX_BYTES_BY_PATH: Record<string, number> = {
  "/uploads/temp": 10 * 1024 * 1024 + 64 * 1024,
  "/users/me/avatar": 256 * 1024 + 64 * 1024,
  "/moments": 128 * 1024 + 9 * (3 * 1024 * 1024 + 4 * 1024),
};

const DEFAULT_MULTIPART_MAX_BYTES = 16 * 1024 * 1024;

function multipartMaxBytes(path: string): number {
  return MULTIPART_MAX_BYTES_BY_PATH[path] ?? DEFAULT_MULTIPART_MAX_BYTES;
}

function rejectOversizedMultipart(req: NextRequest, path: string): NextResponse | null {
  const contentLength = req.headers.get("content-length");
  if (!contentLength) return null;
  const size = Number(contentLength);
  if (!Number.isFinite(size) || size <= 0) return null;
  if (size > multipartMaxBytes(path)) {
    return NextResponse.json({ error: "上传内容过大" }, { status: 413 });
  }
  return null;
}

/** POST 代理：流式转发 multipart/form-data，携带 access token */
export async function proxyPostForm(req: NextRequest, path: string): Promise<NextResponse> {
  try {
    const rejected = rejectOversizedMultipart(req, path);
    if (rejected) return rejected;

    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("multipart/form-data")) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    const body = req.body;
    if (!body) {
      return NextResponse.json({ error: "缺少请求体" }, { status: 400 });
    }

    return await proxyWithRefresh(req, { requireAuth: true }, (accessToken, tokens) =>
      fetch(`${apiBaseUrl()}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": contentType,
          ...authHeader(accessToken),
          ...cookieHeader(req, tokens),
          ...idempotencyHeader(req),
        },
        body,
        duplex: "half",
      } as RequestInit),
    );
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}

/** DELETE 代理：需要 access token 并转发 Cookie */
export async function proxyDelete(req: NextRequest, path: string): Promise<NextResponse> {
  try {
    return await proxyWithRefresh(req, { requireAuth: true }, (accessToken, tokens) =>
      fetch(`${apiBaseUrl()}${path}`, {
        method: "DELETE",
        headers: { ...authHeader(accessToken), ...cookieHeader(req, tokens) },
      }),
    );
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}
