"use client";

import { useEffect, useState } from "react";

const MIN_BUFFER_PX = 360;
const MAX_BUFFER_PX = 640;
/** 略减小预渲染带，降低 Virtuoso padding 重算带来的整页位移 */
const BUFFER_VIEWPORT_RATIO = 0.45;

export function resolveCircleVirtualBuffer(viewportHeight: number): number {
  const scaled = Math.round(viewportHeight * BUFFER_VIEWPORT_RATIO);
  return Math.min(MAX_BUFFER_PX, Math.max(MIN_BUFFER_PX, scaled));
}

/** Virtuoso 上下对称预渲染缓冲（px），避免滚到视口边缘才挂载卡片/头像 */
export function useCircleVirtualBuffer(): number {
  const [buffer, setBuffer] = useState(MIN_BUFFER_PX);

  useEffect(() => {
    const update = () => setBuffer(resolveCircleVirtualBuffer(window.innerHeight));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return buffer;
}
