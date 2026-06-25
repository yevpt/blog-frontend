const DEFAULT_SITE_URL = "https://www.yevpt.com";

export function getSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const siteUrl = configuredUrl || DEFAULT_SITE_URL;
  return siteUrl.replace(/\/+$/, "");
}

export function getCanonicalUrl(path = "/"): URL {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${getSiteUrl()}/`);
}
