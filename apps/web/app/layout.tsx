import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SvgSprite } from "@repo/icons";
import { ThemeProvider } from "./providers/theme-provider";
import { LocaleProvider } from "./providers/locale-provider";
import { SessionProvider } from "./providers/session-provider";
import { SiteNavbar } from "../components/navbar";
import { getSession } from "../lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yevpt's Blog",
  description: "分享编程、工具、文学的个人博客",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Server Component 在此读取 httpOnly Cookie，解析用户信息后传入 SessionProvider，
  // 使 Client Component 能通过 useSession() 获取当前用户而不接触 token
  const session = await getSession();

  return (
    <html lang="zh-CN">
      <head>
        {/* FOUC 防闪烁：在 React 水化前根据 localStorage 预设 dark class，避免主题切换闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}})()`,
          }}
        />
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
              </div>
            </SessionProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
