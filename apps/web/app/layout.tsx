import type { ReactNode } from "react";
import Script from "next/script";
import { cookies } from "next/headers";
import { SvgSprite } from "@repo/icons";
import { SiteFooter } from "@/components/footer";
import { SiteNavbar } from "@/components/navbar";
import { getSession } from "@/lib/session";
import { STRIP_EXTENSION_ATTRS_SCRIPT } from "@/lib/strip-extension-attrs";
import { THEME_CRITICAL_CSS } from "@/lib/theme-init";
import { ThemeProvider } from "./providers/theme-provider";
import { LocaleProvider } from "./providers/locale-provider";
import { SessionProvider } from "./providers/session-provider";
import type { Metadata } from "next";
import "./globals.css";

const SITE_TITLE = "Yevpt's Blog";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: "分享编程、工具、文学的个人博客",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getSession();

  // 读取主题 Cookie，决定 <html> 的初始 class：
  //   "dark"   → class="dark"    强制深色
  //   "light"  → class="light"   强制浅色（CSS 媒体查询不会覆盖）
  //   其他/无   → 无 class        CSS 媒体查询跟随系统偏好
  const cookieStore = await cookies();
  const themePref = cookieStore.get("theme")?.value;
  const themeClass = themePref === "dark" ? "dark" : themePref === "light" ? "light" : undefined;

  return (
    <html lang="zh-CN" className={themeClass} suppressHydrationWarning>
      <head>
        {/* 关键内联样式：外部 CSS 加载前防止背景闪烁 */}
        <style dangerouslySetInnerHTML={{ __html: THEME_CRITICAL_CSS }} />
        {/* hydration 前清除扩展注入 attribute，见 lib/strip-extension-attrs.ts */}
        <Script id="strip-extension-attrs" strategy="beforeInteractive">
          {STRIP_EXTENSION_ATTRS_SCRIPT}
        </Script>
      </head>
      <body>
        <ThemeProvider>
          <LocaleProvider>
            <SessionProvider user={session?.user ?? null}>
              <div className="flex flex-col min-h-screen">
                {/* SvgSprite 将雪碧图注入 DOM，必须在所有使用 SvgIcon 的组件之前渲染 */}
                <SvgSprite />
                <SiteNavbar />
                <main className="flex-1 pt-16">{children}</main>
                <SiteFooter />
              </div>
            </SessionProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
