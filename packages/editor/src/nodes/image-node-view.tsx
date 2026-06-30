import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { useCdnOptimizedImage } from "@repo/hooks/use-cdn-optimized-image";
import { useImageLoadPlaceholder } from "@repo/hooks";
import { cn } from "@repo/ui";
import { IMAGE_UPLOAD_PLACEHOLDER_SRC } from "../constants/image-upload";
import type { ImageExtensionOptions } from "../extensions/image";

const REVEAL_MS = 280;
const DEFAULT_ASPECT_RATIO = 16 / 9;

const SELECTED_OUTLINE = "rounded-md outline outline-2 outline-primary -outline-offset-2";

/** 上传完成前占位：对齐碎语 SnippetImageUploader LoadingTile。 */
export function ImageNodeView({
  node,
  selected,
  updateAttributes,
  extension,
  imageOptimizationPreset: imageOptimizationPresetProp,
}: NodeViewProps & { imageOptimizationPreset?: ImageExtensionOptions["imageOptimizationPreset"] }) {
  const { src, alt, uploadState, aspectRatio } = node.attrs as {
    src: string;
    alt?: string;
    uploadState?: string | null;
    aspectRatio?: string | null;
  };

  const optimizationPreset =
    imageOptimizationPresetProp ??
    (extension.options as ImageExtensionOptions).imageOptimizationPreset ??
    "off";

  const isUploading = uploadState === "loading";
  const isDecoding = uploadState === "decoding";
  const isPending = isUploading || isDecoding;

  const parsedAspectRatio = aspectRatio ? Number.parseFloat(aspectRatio) : null;
  const storedAspectRatio =
    parsedAspectRatio && Number.isFinite(parsedAspectRatio) && parsedAspectRatio > 0
      ? parsedAspectRatio
      : null;

  const imageRef = useRef<HTMLImageElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [layoutNatural, setLayoutNatural] = useState(!isPending);
  const [probedAspectRatio, setProbedAspectRatio] = useState<number | null>(null);

  const hasRemoteSrc = Boolean(src) && src !== IMAGE_UPLOAD_PLACEHOLDER_SRC;
  const cdnImage = useCdnOptimizedImage(src, optimizationPreset, {
    enabled: hasRemoteSrc && optimizationPreset !== "off",
  });
  const isCdnLoading = hasRemoteSrc && !isUploading && cdnImage.isLoading && !cdnImage.isError;
  const cdnPlaceholder = useImageLoadPlaceholder(isCdnLoading);

  useEffect(() => {
    setProbedAspectRatio(null);
  }, [src]);

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
    setLayoutNatural(true);
    window.setTimeout(() => {
      updateAttributes({
        uploadState: null,
        uploadId: null,
        aspectRatio: null,
      });
    }, REVEAL_MS);
  };

  const handleImageReady = () => {
    const image = imageRef.current;
    if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
      setProbedAspectRatio(image.naturalWidth / image.naturalHeight);
    }
    cdnImage.onLoad();
    if (isDecoding) {
      finishDecoding();
    }
  };

  useEffect(() => {
    if (!isDecoding) return;
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) {
      handleImageReady();
    }
    // uploadId/src 变化时需重新检测缓存命中
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDecoding, cdnImage.displaySrc, cdnImage.imgKey]);

  const showImage = hasRemoteSrc || !isPending;
  const showSpinner = isPending && !revealed;
  const useFramedLayout = (isPending && !layoutNatural) || isCdnLoading;
  const tightToImage = layoutNatural && !showSpinner && !isCdnLoading;
  const showLoadingAttr = isPending && !layoutNatural;
  const frameAspectRatio = storedAspectRatio ?? probedAspectRatio ?? DEFAULT_ASPECT_RATIO;
  const frameStyle = useFramedLayout ? { aspectRatio: String(frameAspectRatio) } : undefined;

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
          useFramedLayout && "bg-muted/60",
          !tightToImage && selected && SELECTED_OUTLINE,
        )}
        style={frameStyle}
        aria-label={
          isUploading ? "图片处理中" : isDecoding && showSpinner ? "图片加载中" : undefined
        }
      >
        {showImage ? (
          <>
            {cdnPlaceholder.renderPlaceholder ? (
              <span
                data-testid="editor-image-cdn-skeleton"
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 z-10 overflow-hidden loading-image-skeleton transition-opacity duration-200",
                  cdnPlaceholder.placeholderOpaque ? "opacity-100" : "opacity-0",
                )}
              />
            ) : null}
            <img
              key={cdnImage.imgKey}
              ref={imageRef}
              src={cdnImage.displaySrc}
              srcSet={cdnImage.srcSet}
              sizes={cdnImage.sizes}
              alt={alt ?? ""}
              draggable={false}
              loading="lazy"
              decoding="async"
              onLoad={handleImageReady}
              onError={() => {
                cdnImage.onError();
                if (isDecoding) finishDecoding();
              }}
              className={cn(
                "transition-opacity duration-300",
                tightToImage
                  ? cn(
                      "block w-full h-auto rounded-md",
                      cdnPlaceholder.hideImage ? "opacity-0" : "opacity-100",
                      selected && SELECTED_OUTLINE,
                    )
                  : cn(
                      "absolute inset-0 h-full w-full object-contain",
                      (revealed || !isPending) && !cdnPlaceholder.hideImage
                        ? "opacity-100"
                        : "opacity-0",
                    ),
              )}
            />
          </>
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
