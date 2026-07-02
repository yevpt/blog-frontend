import { useEffect, useMemo, useState } from "react";
import type { AdminModerationHistoryImageResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { findRevisionImages } from "../moderation-content";

interface UseModerationRevisionImagesOptions {
  open: boolean;
  itemId: number | null | undefined;
  revisionId: number | null | undefined;
}

interface UseModerationRevisionImagesResult {
  images: AdminModerationHistoryImageResp[];
  isLoading: boolean;
  error: Error | null;
}

/** 审核详情「当前内容」页签：拉取当前修订的图片快照（列表接口不含 images）。 */
export function useModerationRevisionImages({
  open,
  itemId,
  revisionId,
}: UseModerationRevisionImagesOptions): UseModerationRevisionImagesResult {
  const [images, setImages] = useState<AdminModerationHistoryImageResp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!open || !itemId || !revisionId) {
      setImages([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void apiClient.moderation
      .getHistory(itemId, { page: 1, page_size: 20 })
      .then((resp) => {
        if (cancelled) return;
        setImages(findRevisionImages(resp.list ?? [], revisionId));
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载图片快照失败"));
        setImages([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, itemId, revisionId]);

  return useMemo(
    () => ({
      images,
      isLoading,
      error,
    }),
    [error, images, isLoading],
  );
}
