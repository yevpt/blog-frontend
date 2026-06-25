import { decodeJwt } from "jose";
import { type NextRequest, type NextResponse } from "next/server";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface BackendTokenPayload {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
}

interface BackendTokenResponse {
  code?: unknown;
  data?: BackendTokenPayload;
}

export function isAccessTokenValid(token: string | undefined): boolean {
  if (!token) return false;

  try {
    const payload = decodeJwt(token);
    if (payload["type"] !== "access") return false;
    if (!payload.exp) return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function parseAuthTokens(json: unknown): AuthTokens | null {
  const payload = json as BackendTokenResponse;
  const data = payload.data;
  if (payload.code !== 0 || !data) return null;
  if (typeof data.access_token !== "string") return null;
  if (typeof data.refresh_token !== "string") return null;
  if (typeof data.expires_in !== "number") return null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshAuthTokens(refreshToken: string): Promise<AuthTokens | null> {
  try {
    const res = await fetch(`${process.env.API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: AbortSignal.timeout(3000),
    });
    const json = (await res.json().catch(() => null)) as unknown;
    return parseAuthTokens(json);
  } catch {
    return null;
  }
}

export function setAuthCookies(response: NextResponse, tokens: AuthTokens): void {
  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: tokens.expiresIn,
    path: "/",
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export function authCookieHeader(request: NextRequest, tokens: AuthTokens): string {
  const cookies = request.cookies
    .getAll()
    .filter((cookie) => cookie.name !== ACCESS_TOKEN_COOKIE && cookie.name !== REFRESH_TOKEN_COOKIE)
    .map((cookie) => `${cookie.name}=${cookie.value}`);

  cookies.push(`${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}`);
  cookies.push(`${REFRESH_TOKEN_COOKIE}=${tokens.refreshToken}`);
  return cookies.join("; ");
}
