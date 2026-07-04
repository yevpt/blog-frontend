import type { Editor } from "@tiptap/core";
import { IMAGE_UPLOAD_PLACEHOLDER_SRC } from "../constants/image-upload";
import type { ImageInsertHandlers } from "../types";

/**
 * 构造在指定位置插入图片的 ImageInsertHandlers。
 * gallery「添加图片」与单图「添加图片」共用：前者插到 gallery 内容末尾，
 * 后者插到当前图之后（相邻图片随后由归一化插件自动并组为轮播）。
 * insertPos 每次调用现取，避免文档变更后的过期位置。
 */
export function createImageInsertHandlersAt(
  editor: Editor,
  getInsertPos: () => number | null,
): ImageInsertHandlers {
  const insertAt = (content: Record<string, unknown>) => {
    const pos = getInsertPos();
    if (pos === null) return;
    editor.chain().insertContentAt(pos, content).run();
  };

  return {
    insert: (url, alt) => insertAt({ type: "image", attrs: { src: url, alt: alt ?? "" } }),
    insertLoading: ({ uploadId, aspectRatio, alt }) =>
      insertAt({
        type: "image",
        attrs: {
          src: IMAGE_UPLOAD_PLACEHOLDER_SRC,
          alt: alt ?? "",
          uploadState: "loading",
          uploadId,
          aspectRatio: String(aspectRatio),
        },
      }),
    resolveLoading: (uploadId, url, alt) =>
      editor.chain().resolveImagePlaceholder({ uploadId, src: url, alt }).run(),
    removeLoading: (uploadId) => editor.chain().removeImagePlaceholder({ uploadId }).run(),
  };
}
