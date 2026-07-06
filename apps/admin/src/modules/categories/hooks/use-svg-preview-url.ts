import { useEffect, useState } from "react";
import { toSvgPreviewDataUrl } from "../utils/sanitize-svg-for-preview";

/** 判断素材引用是否为 SVG（用于选择预览策略） */
export function isSvgAssetUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    return new URL(trimmed).pathname.toLowerCase().endsWith(".svg");
  } catch {
    return trimmed.toLowerCase().includes(".svg");
  }
}

function toSvgDataUrl(svgText: string): string {
  return toSvgPreviewDataUrl(svgText);
}

/**
 * CDN 上的 SVG 常以 text/plain 返回，<img src="https://..."> 会拒绝渲染。
 * 拉取正文后转为 data URL 仅供预览，不参与表单提交。
 */
export function useSvgPreviewUrl(sourceUrl: string): {
  displayUrl: string;
  isLoading: boolean;
  hasError: boolean;
} {
  const isSvg = isSvgAssetUrl(sourceUrl);
  const [displayUrl, setDisplayUrl] = useState(() => (isSvg ? "" : sourceUrl));
  const [isLoading, setIsLoading] = useState(isSvg && Boolean(sourceUrl));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!sourceUrl) {
      setDisplayUrl("");
      setIsLoading(false);
      setHasError(false);
      return;
    }

    if (!isSvgAssetUrl(sourceUrl)) {
      setDisplayUrl(sourceUrl);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    let cancelled = false;
    setDisplayUrl("");
    setHasError(false);
    setIsLoading(true);

    void fetch(sourceUrl, { mode: "cors", credentials: "omit" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("svg fetch failed");
        }
        return response.text();
      })
      .then((svgText) => {
        if (cancelled) return;
        const trimmed = svgText.trim();
        if (!trimmed.startsWith("<")) {
          throw new Error("invalid svg payload");
        }
        setDisplayUrl(toSvgDataUrl(trimmed));
        setHasError(false);
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayUrl("");
          setHasError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sourceUrl]);

  return { displayUrl, isLoading, hasError };
}
