import { buildCdnImageUrl } from "./blog-image-url";

export default function blogImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return buildCdnImageUrl(src, width, quality);
}
