import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SvgSprite } from "@repo/icons";
import { SessionProvider } from "./providers/session-provider";
import { getSession } from "../lib/session";

import "./globals.css";

export const metadata: Metadata = {
  title: "Monorepo Blog",
  description: "Next.js SSR blog built with shared packages",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Server Component 在此读取 httpOnly Cookie，解析用户信息后传入 SessionProvider，
  // 使 Client Component 能通过 useSession() 获取当前用户而不接触 token
  const session = await getSession();

  return (
    <html lang="zh-CN">
      <body>
        {/* SvgSprite 将雪碧图注入 DOM，必须在所有使用 SvgIcon 的组件之前渲染 */}
        <SvgSprite />
        <SessionProvider user={session?.user ?? null}>{children}</SessionProvider>
      </body>
    </html>
  );
}
