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
  "absolute top-1/2 z-10 size-8 -translate-y-1/2 rounded-full border-0 p-0 bg-black/45 text-white shadow-none hover:bg-black/60 opacity-100 can-hover:opacity-0 transition-opacity can-hover:group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-0";

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

  // syncChromeFrame 可能被一个「只在 mount/count 变化时创建」的 ResizeObserver
  // 长期持有（避免频繁 disconnect/recreate 错过图片解码完成那一次关键的尺寸变化），
  // 因此不能靠闭包捕获 index——用 ref 让它始终读到最新页码
  const indexRef = useRef(index);
  indexRef.current = index;

  // track 的高度由「最高的那张 slide」撑起；宽高比差异大时，当前可见的矮图
  // 远矮于 track。chrome（翻页/指示点/计数/添加图片）若直接定位在 track 上
  // 就会飘到矮图外面，因此单独用一层跟随「当前可见 slide 的真实渲染框」的
  // 定位层承载它们。
  //
  // 注意：高度必须以 <img> 自身的 getBoundingClientRect 为准，不能用 slide
  // wrapper（ProseMirror 生成的 react-renderer 外层 div）的 offsetHeight——
  // 图片有 max-h-[70vh] 限制时，wrapper 在 flex 布局里参与 sizing 计算用的
  // 是被裁剪前的理论高度，比图片实际裁剪后的视觉高度大一截（已用真实浏览器
  // 实测确认，二者可以相差几十像素），拿 wrapper 高度算出来的位置会飘出
  // 图片视觉边界。
  const syncChromeFrame = () => {
    const track = getTrack();
    const chrome = chromeRef.current;
    if (!track || !chrome) return;
    const slide = track.children[indexRef.current] as HTMLElement | undefined;
    if (!slide) return;
    const content = slide.querySelector("img") ?? slide;
    const trackHeight = track.getBoundingClientRect().height;
    const contentHeight = content.getBoundingClientRect().height;
    // slide 在 track 内是 self-center（居中，不拉伸），顶部相对 track 的偏移
    // 就是这段留白的一半
    const top = Math.max(0, (trackHeight - contentHeight) / 2);
    chrome.style.top = `${top}px`;
    chrome.style.height = `${contentHeight}px`;
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

  // 建立一个「长期持有」的 ResizeObserver，只在 mount / count（图片数量真的
  // 变化）时重建——而不是每次同步都 disconnect 重建。图片是 loading="lazy"
  // decoding="async"，解码完成撑开高度这个关键的尺寸变化只会通知一次；如果
  // 恰好落在「断开旧实例、建立新实例」的窄窗口里，这次通知会被吞掉，chrome
  // 层就会停在解码完成前的错误尺寸上不再更新（早期版本的 bug）。
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    syncChromeFrame();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncChromeFrame) : null;
    const observed = new Set<Element>();

    const ensureObserved = () => {
      const track = getTrack();
      if (!track || !resizeObserver) return;
      if (!observed.has(track)) {
        resizeObserver.observe(track);
        observed.add(track);
      }
      for (const child of Array.from(track.children)) {
        // img 才是视觉尺寸的真实来源（见 syncChromeFrame 顶部注释）；
        // wrapper 自身也一并 observe，覆盖「wrapper 尺寸变化但 img 尺寸不变」
        // 之类的边界情况（如样式加载完成引起的布局抖动）
        if (!observed.has(child)) {
          resizeObserver.observe(child);
          observed.add(child);
        }
        const img = child.querySelector("img");
        if (img && !observed.has(img)) {
          resizeObserver.observe(img);
          observed.add(img);
        }
      }
    };
    ensureObserved();

    // 各 slide 内的图片是 ProseMirror 管理的独立 NodeView（非本组件的 React
    // 子树），挂进 track 的时机不保证早于本 effect；用 MutationObserver 兜底
    // 捕捉「子节点刚挂上/替换」，补齐待观察的节点并立即重新贴合一次
    const mutationObserver = new MutationObserver(() => {
      ensureObserved();
      syncChromeFrame();
    });
    mutationObserver.observe(wrapper, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // 翻页导致 index 变化时立即重算一次，不必等下一次尺寸变化事件
  useLayoutEffect(() => {
    syncChromeFrame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

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

  // 删除轮播里当前正在查看的这一张;node 是 gallery 节点,child 的绝对
  // pos = gallery 起点(getPos())+ 1(跳过 gallery 自身的开始标记)+ forEach 给出的相对 offset
  const handleDeleteImage = () => {
    const pos = getPos();
    if (pos === undefined) return;
    let childFrom: number | null = null;
    let childSize = 0;
    node.forEach((child, offset, childIndex) => {
      if (childIndex !== index) return;
      childFrom = pos + 1 + offset;
      childSize = child.nodeSize;
    });
    if (childFrom === null) return;
    editor.commands.deleteRange({ from: childFrom, to: childFrom + childSize });
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
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              aria-label="删除图片"
              className={cn(
                "h-auto rounded-full border-0 bg-black/45 p-1.5 text-white",
                // ghost 变体自带 hover/active:text-accent-foreground（深色），会把白字盖成不可见，需显式覆盖
                "opacity-100 can-hover:opacity-0 transition-opacity hover:bg-black/60 hover:text-white active:text-white can-hover:group-hover:opacity-100 focus-visible:opacity-100",
              )}
              onPress={handleDeleteImage}
            >
              <SvgIcon name="trash" size={14} />
            </Button>
            <span className="rounded-full bg-black/45 px-2 py-0.5 text-xs leading-tight text-white">
              {index + 1}/{count}
            </span>
          </div>
          {requestImageInsert && (
            <Button
              type="button"
              variant="ghost"
              aria-label="添加图片"
              className={cn(
                "absolute bottom-3 right-3 z-10 h-auto rounded-full border-0 bg-black/45 px-2.5 py-1 text-xs text-white",
                // ghost 变体自带 hover/active:text-accent-foreground（深色），会把白字盖成不可见，需显式覆盖
                "opacity-100 can-hover:opacity-0 transition-opacity hover:bg-black/60 hover:text-white active:text-white can-hover:group-hover:opacity-100 focus-visible:opacity-100",
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
