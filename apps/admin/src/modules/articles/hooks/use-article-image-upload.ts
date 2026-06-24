import { useRef, useState, type ChangeEvent } from "react";
import { ApiError } from "@repo/api";
import { useEditorImageUpload } from "@repo/hooks";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";

export function useArticleImageUpload() {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isCoverUploading, setIsCoverUploading] = useState(false);

  const inlineImageUpload = useEditorImageUpload({
    scene: "article",
    upload: async (file) => {
      const resp = await apiClient.uploads.tempImage(file, { dir: "images", scene: "article" });
      return resp.url || resp.key;
    },
    onError: (message) => addToast(message, "error"),
  });

  const handleCoverFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    onUploaded: (url: string) => void,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsCoverUploading(true);
    try {
      const resp = await apiClient.uploads.tempImage(file, { dir: "covers", scene: "article" });
      onUploaded(resp.url || resp.key);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "封面上传失败，请重试";
      addToast(message, "error");
    } finally {
      setIsCoverUploading(false);
    }
  };

  return {
    coverInputRef,
    contentImageInputRef: inlineImageUpload.inputRef,
    isCoverUploading,
    isContentImageUploading: inlineImageUpload.isUploading,
    handleCoverFileChange,
    handleInsertImageRequest: inlineImageUpload.handleInsertImageRequest,
    handleContentImageFileChange: inlineImageUpload.handleFileChange,
  };
}
