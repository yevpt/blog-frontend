import { useEffect, useRef, useState, type ComponentType } from "react";
import type { NodeViewProps } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { IMAGE_UPLOAD_PLACEHOLDER_SRC } from "../constants/image-upload";
import type { ImageGalleryStorage } from "../extensions/image-gallery";
import type { ImageInsertHandlers } from "../types";

type AnyNodeViewContent = ComponentType<{ as?: string; className?: string }>;
const TypedNodeViewContent = NodeViewContent as AnyNodeViewContent;

const NAV_BUTTON_CLASSES =
  "absolute top-1/2 z-10 size-8 -translate-y-1/2 rounded-full border-0 p-0 bg-black/45 text-white shadow-none hover:bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-0";

/** imageGallery 的 WYSIWYG NodeView：contentDOM 即横向 scroll-snap 滑道。 */
export function ImageGalleryNodeView({ node, editor, getPos, selected }: NodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = node.childCount;

  const getTrack = () =>
    wrapperRef.current?.querySelector<HTMLElement>("[data-node-view-content]") ?? null;

  useEffect(() => {
    const track = getTrack();
    if (!track) return;
    const handleScroll = () => {
      const width = track.clientWidth || 1;
      setIndex(Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / width))));
    };
    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => track.removeEventListener("scroll", handleScroll);
  }, [count]);

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

  const handleAddImage = () => {
    if (!requestImageInsert) return;
    const galleryEnd = () => {
      const pos = getPos();
      if (pos === undefined) return null;
      return pos + node.nodeSize - 1;
    };
    const insertAt = (content: Record<string, unknown>) => {
      const pos = galleryEnd();
      if (pos === null) return;
      editor.chain().insertContentAt(pos, content).run();
    };
    const handlers: ImageInsertHandlers = {
      insert: (url, alt) => insertAt({ type: "image", attrs: { src: url, alt: alt ?? "" } }),
      insertLoading: ({ uploadId, aspectRatio, alt }) =>
        insertAt({
          type: "image",
          attrs: {
            src: IMAGE_UPLOAD_PLACEHOLDER_SRC,
            alt: alt ?? "",
            uploadState: "loading",
            uploadId,
            aspectRatio: String(aspectRatio),
          },
        }),
      resolveLoading: (uploadId, url, alt) =>
        editor.chain().resolveImagePlaceholder({ uploadId, src: url, alt }).run(),
      removeLoading: (uploadId) => editor.chain().removeImagePlaceholder({ uploadId }).run(),
    };
    requestImageInsert(handlers);
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
            "flex snap-x snap-mandatory overflow-x-auto rounded-2xl",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "[&>*]:w-full [&>*]:shrink-0 [&>*]:snap-center [&>*]:snap-always",
          )}
        />
        <div contentEditable={false}>
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
                "opacity-0 transition-opacity hover:bg-black/60 group-hover:opacity-100 focus-visible:opacity-100",
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
