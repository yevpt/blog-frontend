import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { SvgSprite } from "@repo/icons";
import { SiteFooter } from "@/components/footer";
import { SiteNavbar } from "@/components/navbar";
import { getSession } from "@/lib/session";
import { createServerApiClient } from "@/lib/server-api";
import { THEME_CRITICAL_CSS } from "@/lib/theme-init";
import { ThemeProvider } from "./providers/theme-provider";
import { StripExtensionAttrsScript } from "./providers/strip-extension-attrs-script";
import { LocaleProvider } from "./providers/locale-provider";
import { SessionProvider } from "./providers/session-provider";
import { GlobalModals } from "./providers/global-modals";
import { BfcacheBoundary } from "./providers/bfcache-boundary";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { getCanonicalUrl } from "@/lib/seo";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_TITLE = "Yevpt's Blog";

export const metadata: Metadata = {
  metadataBase: getCanonicalUrl("/"),
  title: SITE_TITLE,
  description: "分享编程、工具、文学的个人博客",
  applicationName: SITE_TITLE,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: "分享编程、工具、文学的个人博客",
    url: "/",
    siteName: SITE_TITLE,
    locale: "zh_CN",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getSession();

  // 每次首屏 SSR，已登录则通过 /users/me 获取完整资料（Redis 支撑，~0.2ms）
  let profile = null;
  let initialUnreadCount = 0;
  if (session) {
    const api = await createServerApiClient();
    try {
      profile = await api.users.getMe();
    } catch {
      // /users/me 失败不影响页面渲染，profile 降级为 null。
    }
    try {
      initialUnreadCount = (await api.notifications.unreadCount()).count;
    } catch {
      // 首屏未读数失败不影响页面渲染，客户端通知层会继续重试。
    }
  }

  // 读取主题 Cookie，决定 <html> 的首屏 class，避免 hydration 前主题闪烁。
  // 主题策略与 ThemeProvider 保持一致：
  //   theme=dark/light → 用户 6 小时内的显式覆盖，服务端直接输出对应 class
  //   无 cookie/过期/其他值 → 没有用户覆盖，不输出 class，由 CSS 媒体查询跟随系统偏好
  const cookieStore = await cookies();
  const themePref = cookieStore.get("theme")?.value;
  const themeClass = themePref === "dark" ? "dark" : themePref === "light" ? "light" : undefined;

  return (
    <html lang="zh-CN" className={themeClass} suppressHydrationWarning>
      <head>
        {/* 关键内联样式：外部 CSS 加载前防止背景闪烁 */}
        <style dangerouslySetInnerHTML={{ __html: THEME_CRITICAL_CSS }} />
        {/* hydration 前清除扩展注入 attribute，见 lib/strip-extension-attrs.ts */}
        <StripExtensionAttrsScript />
      </head>
      <body>
        <ThemeProvider>
          <LocaleProvider>
            <SessionProvider userId={session?.userId ?? null} profile={profile}>
              <NotificationProvider>
                <div className="flex flex-col min-h-screen">
                  {/* SvgSprite 将雪碧图注入 DOM，必须在所有使用 SvgIcon 的组件之前渲染 */}
                  <SvgSprite />
                  {/* bfcache 恢复时软重挂载导航/正文/弹层，修复卡在揭示前状态的问题。
                      SvgSprite 与 SiteFooter 留在边界外：前者重注入会闪烁，后者无揭示门控。 */}
                  <BfcacheBoundary>
                    <GlobalModals />
                    <SiteNavbar initialUnreadCount={initialUnreadCount} />
                    <main className="flex-1 pt-0">{children}</main>
                  </BfcacheBoundary>
                  <SiteFooter />
                </div>
              </NotificationProvider>
            </SessionProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
