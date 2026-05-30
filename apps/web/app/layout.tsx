import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SvgSprite } from "@repo/icons";

import "./globals.css";

// Next.js 会读取 metadata 生成 <title> 和 <meta name="description">。
export const metadata: Metadata = {
  title: "Monorepo Blog",
  description: "Next.js SSR blog built with shared packages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {/* SvgSprite 将雪碧图注入 DOM，必须在所有使用 SvgIcon 的组件之前渲染。 */}
        <SvgSprite />
        {children}
      </body>
    </html>
  );
}
