import type { FloatDockColumnLayout } from "./float-dock-position";

const ARTICLE_SIDEBAR = {
  widthXl: 240,
  width2xl: 280,
  gap: 32,
  xlBreakpoint: 1280,
  xl2Breakpoint: 1536,
} as const;

/** 文章详情：1100 容器 + 720 正文 + 可选目录侧栏 */
export const ARTICLE_FLOAT_DOCK_LAYOUT: FloatDockColumnLayout = {
  pageMaxWidth: 1100,
  pagePaddingX: 16,
  contentMaxWidth: 720,
  sidebar: ARTICLE_SIDEBAR,
};

/** 与 PageContainer size 对齐 */
export function pageContainerFloatDockLayout(
  size: "narrow" | "default" | "wide",
): FloatDockColumnLayout {
  const pageMaxWidth = { narrow: 680, default: 960, wide: 1120 }[size];
  return {
    pageMaxWidth,
    pagePaddingX: 20,
    contentMaxWidth: pageMaxWidth,
  };
}

/** 用户资料页：max-w-[736px] px-4 */
export const PROFILE_FLOAT_DOCK_LAYOUT: FloatDockColumnLayout = {
  pageMaxWidth: 736,
  pagePaddingX: 16,
  contentMaxWidth: 736,
};

/** 消息中心：max-w-2xl px-4 */
export const NOTIFICATIONS_FLOAT_DOCK_LAYOUT: FloatDockColumnLayout = {
  pageMaxWidth: 672,
  pagePaddingX: 16,
  contentMaxWidth: 672,
};
