import type { AdminModerationHistoryImageResp } from "@repo/api";

interface ModerationImageGalleryProps {
  images: AdminModerationHistoryImageResp[];
}

/** 审计历史图片网格：只使用后端返回的 access_url，不做任何遮罩推断。 */
export function ModerationImageGallery({ images }: ModerationImageGalleryProps) {
  if (images.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((img) => (
        <a
          key={img.id}
          href={img.access_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-20 w-20 overflow-hidden rounded-md border border-border"
        >
          <img src={img.access_url} alt={img.name} className="h-full w-full object-cover" />
        </a>
      ))}
    </div>
  );
}
