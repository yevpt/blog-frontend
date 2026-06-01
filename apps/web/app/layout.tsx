import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SvgSprite } from "@repo/icons";
import { SiteFooter } from "@/components/footer";
import { SiteNavbar } from "@/components/navbar";
import { getSession } from "@/lib/session";
import { THEME_INIT_SCRIPT } from "@/lib/theme-init";
import { ThemeProvider } from "./providers/theme-provider";
import { LocaleProvider } from "./providers/locale-provider";
import { SessionProvider } from "./providers/session-provider";
import "./globals.css";

const SITE_TITLE = "Yevpt's Blog";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: "分享编程、工具、文学的个人博客",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Server Component 在此读取 httpOnly Cookie，解析用户信息后传入 SessionProvider，
  // 使 Client Component 能通过 useSession() 获取当前用户而不接触 token
  const session = await getSession();

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        {/* 主题初始化脚本：必须在 body 首行同步执行，防止 FOUC */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
