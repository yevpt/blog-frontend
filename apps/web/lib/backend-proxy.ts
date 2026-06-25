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
  const okRes = NextResponse.json(json.data || {});
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

/** SSE GET 代理：保持流式响应，携带 access token 和 Cookie */
export async function proxySseGet(req: NextRequest, path: string): Promise<Response> {
  let t = token(req);
  let tokens: AuthTokens | null = null;
  if (!t) {
    tokens = await refreshFromRequest(req);
    t = tokens?.accessToken;
  }
  if (!t) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const qs = req.nextUrl.searchParams.toString();
  try {
    const res = await fetch(`${apiBaseUrl()}${path}${qs ? `?${qs}` : ""}`, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...authHeader(t),
        ...cookieHeader(req, tokens),
      },
    });
    if (!res.ok) return await parseBackendJson(res);

    const response = new NextResponse(res.body, {
      status: res.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
    if (tokens) setAuthCookies(response, tokens);
    return response;
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
        },
        body,
      }),
    );
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}

/** POST 代理：转发 multipart/form-data，携带 access token */
export async function proxyPostForm(req: NextRequest, path: string): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    return await proxyWithRefresh(req, { requireAuth: true }, (accessToken, tokens) =>
      fetch(`${apiBaseUrl()}${path}`, {
        method: "POST",
        headers: { ...authHeader(accessToken), ...cookieHeader(req, tokens) },
        body: formData,
      }),
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
