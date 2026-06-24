/** 编辑器内 blockquote 不自动补弯引号，与文章正文渲染一致 */
export const EDITOR_BLOCKQUOTE_QUOTELESS_CLASSES = [
  "[&_.tiptap_blockquote]:quotes-none",
  "[&_.tiptap_blockquote_p:first-of-type]:before:content-none",
  "[&_.tiptap_blockquote_p:last-of-type]:after:content-none",
].join(" ");
