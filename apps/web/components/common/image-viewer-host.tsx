"use client";

import { ImageViewer } from "@repo/ui";
import { useImageViewer } from "@/store/use-image-viewer";

export function ImageViewerHost() {
  const isOpen = useImageViewer((s) => s.isOpen);
  const images = useImageViewer((s) => s.images);
  const index = useImageViewer((s) => s.index);
  const close = useImageViewer((s) => s.close);
  const setIndex = useImageViewer((s) => s.setIndex);

  return (
    <ImageViewer
      images={images}
      index={index}
      isOpen={isOpen}
      onClose={close}
      onIndexChange={setIndex}
    />
  );
}
