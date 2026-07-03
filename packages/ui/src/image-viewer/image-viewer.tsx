"use client";

import { useEffect } from "react";
import { SvgIcon } from "@repo/icons";
import { cn } from "../lib/utils";
import { Modal } from "../modal";
import { ImageViewerToolbar } from "./internal/toolbar";
import { useViewerTransform } from "./internal/use-viewer-transform";
import type { ImageViewerProps } from "./types";

const NAV_BTN =
  "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white/90 transition-colors hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60";

export function ImageViewer({ images, index, isOpen, onClose, onIndexChange }: ImageViewerProps) {
  const { transform, isGesturing, reset, zoomIn, zoomOut, rotate, consumeDrag, handlers } =
    useViewerTransform();
  const current = images[index];
  const hasGallery = images.length > 1 && !!onIndexChange;
  // 下载文件名取自 URL 末段路径（剥离查询串），无法解析时回退空串
  const downloadName = current?.src.split(/[?#]/, 1)[0]?.split("/").pop() ?? "";

  // 切换图片或打开时重置变换；关闭时不重置，否则旋转/缩放会在退场动画播放期间
  // 瞬间跳回原状，和 Modal 的淡出/缩小动效叠在一起显得很突兀
  useEffect(() => {
    if (isOpen) reset();
  }, [index, isOpen, reset]);

  const goPrev = () => onIndexChange?.((index - 1 + images.length) % images.length);
  const goNext = () => onIndexChange?.((index + 1) % images.length);

  // 键盘左右切换
  useEffect(() => {
    if (!isOpen || !hasGallery) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // goPrev/goNext 依赖 index、images.length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasGallery, index, images.length]);

  if (!current) return null;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissable
      role="dialog"
      aria-label="图片预览"
      overlayClassName="z-[400] bg-black/80 backdrop-blur-md"
      positionerClassName="items-center justify-center p-0"
      modalClassName="!h-dvh !w-screen !max-w-none !rounded-none !border-0 !bg-transparent !shadow-none"
      dialogClassName="relative h-dvh w-screen"
    >
      {/* 手势舞台：承载滚轮/指针/双击交互，键盘关闭由 Modal 的 ESC（isDismissable）提供 */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        data-testid="image-viewer-stage"
        // 底部预留安全间距，防止竖向（非 16:9）照片被悬浮工具栏遮挡
        className="relative flex h-dvh w-screen touch-none items-center justify-center overflow-hidden pb-24"
        onWheel={handlers.onWheel}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerUp}
        onDoubleClick={handlers.onDoubleClick}
        onClick={(e) => {
          // 点击图片以外的暗区关闭；拖拽平移松手后紧跟的 click 不当作背景点击处理——
          // setPointerCapture 会让抬手后合成的 click 事件 target 落到舞台容器本身，
          // 若不加判断，放大后拖拽平移松手会被误判为点击暗区从而关闭预览
          if (e.target === e.currentTarget && !consumeDrag()) onClose();
        }}
      >
        <img
          src={current.src}
          alt={current.alt ?? ""}
          draggable={false}
          className={cn(
            "max-h-full max-w-full touch-none select-none object-contain",
            // 手势期间禁用过渡：连续 transform 更新 + CSS transition 会导致移动端捏合剧烈抖动
            !isGesturing && "transition-transform duration-150 ease-out",
          )}
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
            cursor: transform.scale > 1 ? "grab" : "default",
          }}
        />
      </div>

      {hasGallery && (
        <>
          <button
            type="button"
            aria-label="上一张"
            className={`${NAV_BTN} left-4`}
            onClick={goPrev}
          >
            <SvgIcon name="chevron-left" size={24} />
          </button>
          <button
            type="button"
            aria-label="下一张"
            className={`${NAV_BTN} right-4`}
            onClick={goNext}
          >
            <SvgIcon name="chevron-right" size={24} />
          </button>
        </>
      )}

      <ImageViewerToolbar
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onRotate={rotate}
        onClose={onClose}
        downloadUrl={current.src}
        downloadName={downloadName}
      />
    </Modal>
  );
}
