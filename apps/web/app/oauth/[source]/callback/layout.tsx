import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * OAuth 回调页 Layout。
 *
 * 此页面不面向用户直接访问，也无需 SEO 索引；
 * 用 noindex 防止搜索引擎收录。
 */
export const metadata: Metadata = {
  title: "正在登录…",
  robots: { index: false, follow: false },
};

export default function OAuthCallbackLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
