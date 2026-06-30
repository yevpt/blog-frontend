import { useRef, useState, type ChangeEvent } from "react";
import { ApiError } from "@repo/api";
import type { TempImageUploadReq } from "@repo/api";
import { prepareImageForUpload, useEditorImageUpload } from "@repo/hooks";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";

type ArticleCoverUploadDir = Extract<TempImageUploadReq["dir"], "covers" | "mobile-covers">;

async function uploadArticleCoverImage(
  file: File,
  dir: ArticleCoverUploadDir,
  onUploaded: (url: string) => void,
) {
  const prepared = await prepareImageForUpload(file, "article");
  const resp = await apiClient.uploads.tempImage(prepared, { dir, scene: "article" });
  onUploaded(resp.url || resp.key);
}

export function useArticleImageUpload() {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const mobileCoverInputRef = useRef<HTMLInputElement>(null);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [isMobileCoverUploading, setIsMobileCoverUploading] = useState(false);

  const inlineImageUpload = useEditorImageUpload({
    scene: "article",
    upload: async (file) => {
      const resp = await apiClient.uploads.tempImage(file, { dir: "images", scene: "article" });
      return resp.url || resp.key;
    },
    onError: (message) => addToast(message, "error"),
  });

  const handleCoverUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    dir: ArticleCoverUploadDir,
    onUploaded: (url: string) => void,
    setUploading: (uploading: boolean) => void,
    errorMessage: string,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      await uploadArticleCoverImage(file, dir, onUploaded);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error && err.message.trim()
            ? err.message.trim()
            : errorMessage;
      addToast(message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleCoverFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    onUploaded: (url: string) => void,
  ) => {
    await handleCoverUpload(
      event,
      "covers",
      onUploaded,
      setIsCoverUploading,
      "封面上传失败，请重试",
    );
  };

  const handleMobileCoverFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    onUploaded: (url: string) => void,
  ) => {
    await handleCoverUpload(
      event,
      "mobile-covers",
      onUploaded,
      setIsMobileCoverUploading,
      "移动端封面上传失败，请重试",
    );
  };

  return {
    coverInputRef,
    mobileCoverInputRef,
    contentImageInputRef: inlineImageUpload.inputRef,
    isCoverUploading,
    isMobileCoverUploading,
    isContentImageUploading: inlineImageUpload.isUploading,
    handleCoverFileChange,
    handleMobileCoverFileChange,
    handleInsertImageRequest: inlineImageUpload.handleInsertImageRequest,
    handleContentImageFileChange: inlineImageUpload.handleFileChange,
  };
}
