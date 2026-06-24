import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { cn } from "@repo/ui";
import { IMAGE_UPLOAD_PLACEHOLDER_SRC } from "../constants/image-upload";

const REVEAL_MS = 280;

const SELECTED_OUTLINE = "rounded-md outline outline-2 outline-primary -outline-offset-2";

/** 上传完成前占位：对齐碎语 SnippetImageUploader LoadingTile。 */
export function ImageNodeView({ node, selected, updateAttributes }: NodeViewProps) {
  const { src, alt, uploadState, aspectRatio } = node.attrs as {
    src: string;
    alt?: string;
    uploadState?: string | null;
    aspectRatio?: string | null;
  };

  const isUploading = uploadState === "loading";
  const isDecoding = uploadState === "decoding";
  const isPending = isUploading || isDecoding;

  const parsedAspectRatio = aspectRatio ? Number.parseFloat(aspectRatio) : null;
  const aspectRatioStyle =
    parsedAspectRatio && Number.isFinite(parsedAspectRatio) && parsedAspectRatio > 0
      ? { aspectRatio: String(parsedAspectRatio) }
      : { aspectRatio: "16 / 9" };

  const imageRef = useRef<HTMLImageElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [layoutNatural, setLayoutNatural] = useState(!isPending);

  useEffect(() => {
    if (isUploading) {
      setRevealed(false);
      setLayoutNatural(false);
    }
  }, [isUploading, node.attrs.uploadId]);

  useEffect(() => {
    if (!isPending) {
      setLayoutNatural(true);
    }
  }, [isPending]);

  const finishDecoding = () => {
    if (revealed) return;
    setRevealed(true);
    // 解码完成后立刻切自然布局，避免选中框仍套在比例盒（object-contain 留白）上
    setLayoutNatural(true);
    window.setTimeout(() => {
      updateAttributes({
        uploadState: null,
        uploadId: null,
        aspectRatio: null,
      });
    }, REVEAL_MS);
  };

  useEffect(() => {
    if (!isDecoding) return;
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) {
      finishDecoding();
    }
    // uploadId/src 变化时需重新检测缓存命中
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDecoding, src]);

  const hasRemoteSrc = Boolean(src) && src !== IMAGE_UPLOAD_PLACEHOLDER_SRC;
  const showImage = hasRemoteSrc || !isPending;
  const showSpinner = isPending && !revealed;
  const useAspectBox = isPending && !layoutNatural;
  const showLoadingAttr = isPending && !layoutNatural;
  // 就绪后 wrapper 不参与布局，选中框直接贴合 img
  const tightToImage = layoutNatural && !showSpinner;

  return (
    <NodeViewWrapper
      as="figure"
      className={cn("my-6 block", !tightToImage && "w-full")}
      data-rich-editor-image={!showLoadingAttr ? true : undefined}
      data-rich-editor-image-loading={showLoadingAttr ? true : undefined}
    >
      <div
        className={cn(
          tightToImage ? "contents" : "relative w-full overflow-hidden rounded-md",
          useAspectBox && "bg-muted/60",
          !tightToImage && selected && SELECTED_OUTLINE,
        )}
        style={useAspectBox ? aspectRatioStyle : undefined}
        aria-label={
          isUploading ? "图片处理中" : isDecoding && showSpinner ? "图片加载中" : undefined
        }
      >
        {showImage ? (
          <img
            ref={imageRef}
            src={src}
            alt={alt ?? ""}
            draggable={false}
            onLoad={isDecoding ? finishDecoding : undefined}
            onError={isDecoding ? finishDecoding : undefined}
            className={cn(
              "block w-full transition-opacity duration-300",
              tightToImage
                ? cn("h-auto rounded-md opacity-100", selected && SELECTED_OUTLINE)
                : cn(
                    "absolute inset-0 h-full object-contain",
                    revealed ? "opacity-100" : "opacity-0",
                  ),
            )}
          />
        ) : null}

        {showSpinner ? (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-muted/60 transition-opacity duration-300",
              revealed && "pointer-events-none opacity-0",
            )}
            aria-hidden={revealed}
          >
            <span
              aria-hidden="true"
              className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
            />
          </div>
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}
