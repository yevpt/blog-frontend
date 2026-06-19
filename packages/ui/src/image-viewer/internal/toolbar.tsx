"use client";

import { SvgIcon } from "@repo/icons";

export interface ImageViewerToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onClose: () => void;
  downloadUrl: string;
  downloadName?: string;
}

const BTN =
  "flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60";

export function ImageViewerToolbar({
  onZoomIn,
  onZoomOut,
  onRotate,
  onClose,
  downloadUrl,
  downloadName,
}: ImageViewerToolbarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2 py-1 backdrop-blur">
      <button type="button" aria-label="缩小" className={BTN} onClick={onZoomOut}>
        <SvgIcon name="zoom-out" size={20} />
      </button>
      <button type="button" aria-label="放大" className={BTN} onClick={onZoomIn}>
        <SvgIcon name="zoom-in" size={20} />
      </button>
      <button type="button" aria-label="旋转" className={BTN} onClick={onRotate}>
        <SvgIcon name="rotate-cw" size={20} />
      </button>
      {/* 跨域外链无法强制下载时降级为新标签打开 */}
      <a
        href={downloadUrl}
        download={downloadName ?? ""}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="下载"
        className={BTN}
      >
        <SvgIcon name="download" size={20} />
      </a>
      <button type="button" aria-label="关闭预览" className={BTN} onClick={onClose}>
        <SvgIcon name="close" size={20} />
      </button>
    </div>
  );
}
