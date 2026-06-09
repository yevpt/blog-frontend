"use client";

/**
 * 碎语无限滚动加载指示器 + 到底提示
 */
export function SnippetScrollLoader() {
  return (
    <div className="snippet-scroll-loader">
      <div className="snippet-loader-dots">
        <div className="snippet-loader-dot" />
        <div className="snippet-loader-dot" />
        <div className="snippet-loader-dot" />
      </div>
      <span className="snippet-loader-text">正在加载更多...</span>
    </div>
  );
}

export function SnippetEndReached() {
  return (
    <div className="snippet-end-reached">
      <span>已经到底了</span>
    </div>
  );
}
