import { useCallback, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ApiError } from "@repo/api";
import { prepareImageForUpload } from "@repo/hooks";
import { apiClient } from "../../../lib/api";
import {
  createCategoryAssetFromUpload,
  EMPTY_CATEGORY_ASSET,
  type CategoryAssetValue,
} from "../model";

const SVG_MAX_BYTES = 256 * 1024;

function isSvgFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".svg") || file.type === "image/svg+xml";
}

export function useCategoryAssetUpload() {
  const iconInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isIconUploading, setIsIconUploading] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isUploading = isIconUploading || isCoverUploading;

  const openIconPicker = useCallback(() => {
    iconInputRef.current?.click();
  }, []);

  const openCoverPicker = useCallback(() => {
    coverInputRef.current?.click();
  }, []);

  const handleIconFileChange = useCallback(
    async (
      event: ChangeEvent<HTMLInputElement>,
      onUploaded: (asset: CategoryAssetValue) => void,
    ) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      if (!isSvgFile(file)) {
        setUploadError("仅支持 SVG 格式图标");
        return;
      }
      if (file.size > SVG_MAX_BYTES) {
        setUploadError("SVG 图标不能超过 256 KB");
        return;
      }

      setUploadError(null);
      setIsIconUploading(true);
      try {
        const resp = await apiClient.categories.uploadIcon(file);
        onUploaded(createCategoryAssetFromUpload(resp.key, resp.url));
      } catch (err) {
        setUploadError(err instanceof ApiError ? err.message : "图标上传失败，请重试");
      } finally {
        setIsIconUploading(false);
      }
    },
    [],
  );

  const handleCoverFileChange = useCallback(
    async (
      event: ChangeEvent<HTMLInputElement>,
      onUploaded: (asset: CategoryAssetValue) => void,
    ) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      setUploadError(null);
      setIsCoverUploading(true);
      try {
        const prepared = await prepareImageForUpload(file, "article");
        const resp = await apiClient.categories.uploadCover(prepared);
        onUploaded(createCategoryAssetFromUpload(resp.key, resp.url));
      } catch (err) {
        setUploadError(err instanceof ApiError ? err.message : "封面上传失败，请重试");
      } finally {
        setIsCoverUploading(false);
      }
    },
    [],
  );

  const clearUploadError = useCallback(() => {
    setUploadError(null);
  }, []);

  const resetUploadState = useCallback(() => {
    setUploadError(null);
    setIsIconUploading(false);
    setIsCoverUploading(false);
  }, []);

  return {
    iconInputRef,
    coverInputRef,
    isIconUploading,
    isCoverUploading,
    isUploading,
    uploadError,
    openIconPicker,
    openCoverPicker,
    handleIconFileChange,
    handleCoverFileChange,
    clearUploadError,
    resetUploadState,
    removeAsset: () => EMPTY_CATEGORY_ASSET,
  };
}
