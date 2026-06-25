"use client";

/**
 * 碎语无限滚动加载指示器 + 到底提示
 */
export function MomentScrollLoader() {
  return (
    <div className="moment-scroll-loader">
      <div className="moment-loader-dots">
        <div className="moment-loader-dot" />
        <div className="moment-loader-dot" />
        <div className="moment-loader-dot" />
      </div>
      <span className="moment-loader-text">正在加载更多...</span>
    </div>
  );
}

export function MomentEndReached() {
  return (
    <div className="moment-end-reached">
      <span>已经到底了</span>
    </div>
  );
}
