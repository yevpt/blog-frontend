/** 禁用 typography 在 blockquote 上自动插入的弯引号，正文引号由作者自行输入 */
export const PROSE_BLOCKQUOTE_QUOTELESS_CLASSES = [
  "prose-blockquote:quotes-none",
  "[&_blockquote_p:first-of-type]:before:content-none",
  "[&_blockquote_p:last-of-type]:after:content-none",
].join(" ");
