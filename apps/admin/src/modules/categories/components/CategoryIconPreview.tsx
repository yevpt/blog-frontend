import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import { useSvgPreviewUrl } from "../hooks/use-svg-preview-url";

interface CategoryIconPreviewProps {
  url: string;
  alt: string;
  className?: string;
}

function IconPreviewSpinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
    />
  );
}

/** 分类 SVG 图标预览：兼容 CDN 以 text/plain 返回 SVG 的场景 */
export function CategoryIconPreview({ url, alt, className }: CategoryIconPreviewProps) {
  const { displayUrl, isLoading, hasError } = useSvgPreviewUrl(url);

  if (isLoading) {
    return (
      <span
        aria-label={`${alt}加载中`}
        className={cn("flex size-full items-center justify-center", className)}
      >
        <IconPreviewSpinner />
      </span>
    );
  }

  if (hasError || !displayUrl) {
    return (
      <span
        aria-label={alt}
        className={cn(
          "flex size-full flex-col items-center justify-center gap-0.5 text-muted-foreground",
          className,
        )}
      >
        <SvgIcon name="image" size={16} />
      </span>
    );
  }

  return <img src={displayUrl} alt={alt} className={className} />;
}
