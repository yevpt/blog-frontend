import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import type { NodeViewProps } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import type { ImageGalleryStorage } from "../extensions/image-gallery";
import { createImageInsertHandlersAt } from "../utils/image-insert-handlers";

type AnyNodeViewContent = ComponentType<{ as?: string; className?: string }>;
const TypedNodeViewContent = NodeViewContent as AnyNodeViewContent;

const NAV_BUTTON_CLASSES =
  "absolute top-1/2 z-10 size-8 -translate-y-1/2 rounded-full border-0 p-0 bg-black/45 text-white shadow-none hover:bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-0";

/** imageGallery 的 WYSIWYG NodeView：contentDOM 即横向 scroll-snap 滑道。 */
export function ImageGalleryNodeView({ node, editor, getPos, selected }: NodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = node.childCount;

  // Tiptap React 对非叶子节点会在 NodeViewContent 内自建真正的 contentDOM
  // （[data-node-view-content-react]），图片子节点挂在它里面——滚动/翻页必须作用于这一层
  const getTrack = () =>
    wrapperRef.current?.querySelector<HTMLElement>("[data-node-view-content-react]") ?? null;

  // track 的高度由「最高的那张 slide」撑起（各 slide 保留自身原始宽高比、不做
  // object-contain 裁切/留白）；宽高比差异大时，当前可见的矮图远矮于 track。
  // chrome（翻页/指示点/计数/添加图片）若直接定位在 track 上就会飘到矮图外面，
  // 因此单独用一层跟随「当前可见 slide 的真实渲染框」的定位层承载它们。
  const syncChromeFrame = () => {
    const track = getTrack();
    const chrome = chromeRef.current;
    if (!track || !chrome) return;
    const slide = track.children[index] as HTMLElement | undefined;
    if (!slide) return;
    // slide 在 track 内是 self-center（居中，不拉伸），顶部相对 track 的偏移
    // 就是这段留白的一半
    const top = Math.max(0, (track.clientHeight - slide.offsetHeight) / 2);
    chrome.style.top = `${top}px`;
    chrome.style.height = `${slide.offsetHeight}px`;
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    // Tiptap 在 React 提交之后才把自建 contentDOM 挂进 NodeViewContent，
    // 此刻直接对滑道 addEventListener 会因元素尚不存在而失败；
    // scroll 不冒泡但有捕获阶段，挂在稳定存在的 wrapper 上捕获，滑道现取
    const handleScroll = (event: Event) => {
      const track = getTrack();
      if (!track || event.target !== track) return;
      const width = track.clientWidth || 1;
      setIndex(Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / width))));
    };
    wrapper.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return () => wrapper.removeEventListener("scroll", handleScroll, { capture: true });
  }, [count]);

  // 当前 slide 变化（翻页）或其自身尺寸变化（图片加载完成、窗口 resize）时
  // 重新贴合 chrome 层；同时 observe track 本身，因为其他 slide 加载完成
  // 也可能改变 track 的最大高度，从而改变当前 slide 的居中留白。
  // 用 useLayoutEffect 而非 useEffect：在浏览器绘制前完成计算，避免从
  // 兜底的 top-0/h-full 闪一下再跳到真实尺寸
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let resizeObserver: ResizeObserver | null = null;

    const trySync = () => {
      const track = getTrack();
      const slide = track?.children[index] as HTMLElement | undefined;
      if (!track || !slide) return;
      syncChromeFrame();
      resizeObserver?.disconnect();
      if (typeof ResizeObserver === "undefined") return;
      resizeObserver = new ResizeObserver(syncChromeFrame);
      resizeObserver.observe(track);
      resizeObserver.observe(slide);
    };

    trySync();

    // 各 slide 内的图片是 ProseMirror 管理的独立 NodeView（非本组件的 React
    // 子树），挂进 track 的时机不保证早于本 effect；用 MutationObserver 兜底
    // 捕捉「子节点刚挂上/替换」，重试贴合与重新订阅 ResizeObserver
    const mutationObserver = new MutationObserver(trySync);
    mutationObserver.observe(wrapper, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count]);

  useEffect(() => {
    if (index > count - 1) setIndex(Math.max(0, count - 1));
  }, [count, index]);

  const scrollToIndex = (next: number) => {
    const track = getTrack();
    if (!track) return;
    const clamped = Math.min(count - 1, Math.max(0, next));
    const left = clamped * track.clientWidth;
    if (typeof track.scrollTo === "function") {
      track.scrollTo({ left, behavior: "smooth" });
      return;
    }
    track.scrollLeft = left;
  };

  const storage = (editor.storage as { imageGallery?: ImageGalleryStorage }).imageGallery;
  const requestImageInsert = storage?.requestImageInsert ?? null;

  // 「添加图片」复用工具栏选图流程，插入位置固定在 gallery 内容末尾
  const handleAddImage = () => {
    if (!requestImageInsert) return;
    requestImageInsert(
      createImageInsertHandlersAt(editor, () => {
        const pos = getPos();
        if (pos === undefined) return null;
        return pos + node.nodeSize - 1;
      }),
    );
  };

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        "my-6",
        selected && "rounded-2xl outline outline-2 outline-primary -outline-offset-2",
      )}
    >
      <div ref={wrapperRef} className="group relative">
        <TypedNodeViewContent
          as="div"
          className={cn(
            "overflow-hidden rounded-2xl",
            // 滑道样式必须落在 Tiptap 自建的 contentDOM 上，落在本元素只会包住一个
            // 中间层 div，图片仍是纵向 block 堆叠（详见 getTrack 处注释）
            "[&>[data-node-view-content-react]]:flex",
            "[&>[data-node-view-content-react]]:snap-x",
            "[&>[data-node-view-content-react]]:snap-mandatory",
            "[&>[data-node-view-content-react]]:overflow-x-auto",
            "[&>[data-node-view-content-react]]:[scrollbar-width:none]",
            "[&>[data-node-view-content-react]::-webkit-scrollbar]:hidden",
            // 每个 slide（图片 NodeView 根元素）占满一屏、纵向居中
            "[&>[data-node-view-content-react]>*]:w-full",
            "[&>[data-node-view-content-react]>*]:shrink-0",
            "[&>[data-node-view-content-react]>*]:snap-center",
            "[&>[data-node-view-content-react]>*]:snap-always",
            "[&>[data-node-view-content-react]>*]:self-center",
            // 与前台 .md-gallery-slide img 一致：铺满宽度、限高、等比缩放
            "[&_img]:max-h-[70vh] [&_img]:w-full [&_img]:object-contain",
          )}
        />
        {/* top/height 由 syncChromeFrame 写入内联样式，跟随当前 slide 的真实渲染框；
            top-0/h-full 仅作首次绘制前的兜底，effect 会在绘制前用真实尺寸覆盖 */}
        <div
          ref={chromeRef}
          contentEditable={false}
          className="absolute inset-x-0 top-0 z-10 h-full"
        >
          <Button
            type="button"
            aria-label="上一张"
            className={cn(NAV_BUTTON_CLASSES, "left-3")}
            isDisabled={index <= 0}
            onPress={() => scrollToIndex(index - 1)}
          >
            <SvgIcon name="chevron-left" size={16} />
          </Button>
          <Button
            type="button"
            aria-label="下一张"
            className={cn(NAV_BUTTON_CLASSES, "right-3")}
            isDisabled={index >= count - 1}
            onPress={() => scrollToIndex(index + 1)}
          >
            <SvgIcon name="chevron-right" size={16} />
          </Button>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {Array.from({ length: count }, (_, dotIndex) => (
              <Button
                key={dotIndex}
                type="button"
                variant="ghost"
                aria-label={`跳转到第 ${dotIndex + 1} 张`}
                className={cn(
                  "h-1.5 min-w-0 rounded-full border-0 p-0 transition-all hover:bg-white/80",
                  dotIndex === index ? "w-4 bg-white" : "w-1.5 bg-white/55",
                )}
                onPress={() => scrollToIndex(dotIndex)}
              />
            ))}
          </div>
          <span className="absolute right-3 top-3 z-10 rounded-full bg-black/45 px-2 py-0.5 text-xs leading-tight text-white">
            {index + 1}/{count}
          </span>
          {requestImageInsert && (
            <Button
              type="button"
              variant="ghost"
              aria-label="添加图片"
              className={cn(
                "absolute bottom-3 right-3 z-10 h-auto rounded-full border-0 bg-black/45 px-2.5 py-1 text-xs text-white",
                // ghost 变体自带 hover/active:text-accent-foreground（深色），会把白字盖成不可见，需显式覆盖
                "opacity-0 transition-opacity hover:bg-black/60 hover:text-white active:text-white group-hover:opacity-100 focus-visible:opacity-100",
              )}
              onPress={handleAddImage}
            >
              <SvgIcon name="plus" size={14} />
              添加图片
            </Button>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}
