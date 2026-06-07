// apps/web/lib/backend-proxy.ts
import { type NextRequest, NextResponse } from "next/server";

const BASE = process.env.API_BASE_URL!;

function token(req: NextRequest) {
  return req.cookies.get("access_token")?.value;
}

function authHeader(t: string | undefined): Record<string, string> {
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** 将浏览器请求中的 Cookie 转发到后端，确保 visitor_id 等字段不丢失 */
function cookieHeader(req: NextRequest): Record<string, string> {
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
  if (res.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (res.status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (res.status === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const json = await res.json();
  if (json.code !== 0) {
    const errRes = NextResponse.json({ error: json.message }, { status: 400 });
    forwardCookies(res, errRes);
    return errRes;
  }
  const okRes = NextResponse.json(json.data);
  forwardCookies(res, okRes);
  return okRes;
}

/** GET 代理：转发 query 参数，携带可选 access token 和 Cookie */
export async function proxyGet(req: NextRequest, path: string): Promise<NextResponse> {
  const qs = req.nextUrl.searchParams.toString();
  try {
    const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`, {
      method: "GET",
      headers: { ...authHeader(token(req)), ...cookieHeader(req) },
    });
    return parseBackendJson(res);
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
  const t = token(req);
  if (requireAuth && !t) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = hasBody ? JSON.stringify(await req.json().catch(() => ({}))) : undefined;
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader(t), ...cookieHeader(req) },
      body,
    });
    return parseBackendJson(res);
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}

/** DELETE 代理：需要 access token 并转发 Cookie */
export async function proxyDelete(req: NextRequest, path: string): Promise<NextResponse> {
  const t = token(req);
  if (!t) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "DELETE",
      headers: { ...authHeader(t), ...cookieHeader(req) },
    });
    return parseBackendJson(res);
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}
