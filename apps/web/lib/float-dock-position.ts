/** 浮动 Dock 水平定位常量 */
export const FLOAT_DOCK_POSITION = {
  mdBreakpoint: 768,
  floatBottom: 24,
  floatMinViewportMargin: 16,
  /** 正文右侧留白低于此宽度时改贴视口边 */
  floatMinRightGutter: 96,
  /** 留白区内落点：距正文右缘的比例 */
  floatGutterRatio: 0.35,
  floatDockWidth: 40,
} as const;

export interface FloatDockSidebarLayout {
  widthXl: number;
  width2xl: number;
  gap: number;
  xlBreakpoint: number;
  xl2Breakpoint: number;
}

/** 与页面主栏网格对齐的布局参数 */
export interface FloatDockColumnLayout {
  pageMaxWidth: number;
  pagePaddingX: number;
  contentMaxWidth: number;
  sidebar?: FloatDockSidebarLayout;
}

export interface FloatDockContentBounds {
  /** 留白区起始 x（正文右缘或侧栏右缘） */
  gutterStart: number;
  gutterWidth: number;
}

function getActiveSidebarWidth(
  viewportWidth: number,
  sidebar: FloatDockSidebarLayout,
): number | null {
  if (viewportWidth >= sidebar.xl2Breakpoint) return sidebar.width2xl;
  if (viewportWidth >= sidebar.xlBreakpoint) return sidebar.widthXl;
  return null;
}

/** 计算留白区起点与宽度 */
export function computeFloatDockContentBounds(
  viewportWidth: number,
  layout: FloatDockColumnLayout,
  hasSidebar = false,
): FloatDockContentBounds | null {
  if (viewportWidth < FLOAT_DOCK_POSITION.mdBreakpoint) return null;

  const { pageMaxWidth, pagePaddingX, contentMaxWidth, sidebar } = layout;
  const { floatMinViewportMargin } = FLOAT_DOCK_POSITION;

  const pageWidth = Math.min(pageMaxWidth, viewportWidth);
  const pageLeft = (viewportWidth - pageWidth) / 2;
  const innerWidth = pageWidth - pagePaddingX * 2;

  const activeSidebarWidth =
    sidebar && hasSidebar ? getActiveSidebarWidth(viewportWidth, sidebar) : null;

  let mainColumnWidth = innerWidth;
  if (activeSidebarWidth !== null && sidebar) {
    mainColumnWidth = innerWidth - activeSidebarWidth - sidebar.gap;
  }

  const contentWidth = Math.min(contentMaxWidth, mainColumnWidth);
  const contentLeft = pageLeft + pagePaddingX + (mainColumnWidth - contentWidth) / 2;
  const contentRight = contentLeft + contentWidth;

  // 目录等同屏侧栏时，留白从侧栏右缘算起，避免压住 TOC
  const gutterStart =
    activeSidebarWidth !== null && sidebar
      ? pageLeft + pagePaddingX + mainColumnWidth + sidebar.gap + activeSidebarWidth
      : contentRight;

  const gutterRight = viewportWidth - floatMinViewportMargin;
  const gutterWidth = gutterRight - gutterStart;

  return { gutterStart, gutterWidth };
}

/** 计算浮动 Dock 的 `left`；留白不足时返回 `null`（贴视口右缘） */
export function computeFloatDockLeft(
  viewportWidth: number,
  layout: FloatDockColumnLayout,
  hasSidebar = false,
): number | null {
  const bounds = computeFloatDockContentBounds(viewportWidth, layout, hasSidebar);
  if (!bounds) return null;

  const { gutterStart, gutterWidth } = bounds;
  const { floatMinRightGutter, floatGutterRatio, floatDockWidth, floatMinViewportMargin } =
    FLOAT_DOCK_POSITION;

  if (gutterWidth < floatMinRightGutter) {
    return null;
  }

  const proportionalLeft = gutterStart + gutterWidth * floatGutterRatio - floatDockWidth / 2;
  const maxLeft = viewportWidth - floatMinViewportMargin - floatDockWidth;

  return Math.round(Math.min(Math.max(floatMinViewportMargin, proportionalLeft), maxLeft));
}
