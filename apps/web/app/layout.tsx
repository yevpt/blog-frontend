import type { Metadata } from "next";
import type { ReactNode } from "react";

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
      {/* children 是当前路由页面内容，App Router 会自动把 page.tsx 放进这里。 */}
      <body>{children}</body>
    </html>
  );
}
