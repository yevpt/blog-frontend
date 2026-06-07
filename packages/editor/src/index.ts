/**
 * @repo/editor 公开 API
 *
 * 使用方只需从这里导入，无需关心内部目录结构。
 *
 * 基础使用（评论场景）：
 * ```tsx
 * import { RichEditor } from "@repo/editor";
 * import type { RichEditorProps, MentionItem } from "@repo/editor";
 *
 * <RichEditor
 *   value={content}
 *   onChange={setContent}
 *   onInsertImage={(insert) => openImageDialog(insert)}
 *   onInsertLink={(insert) => openLinkDialog(insert)}
 *   onInsertCode={(insert) => openCodeDialog(insert)}
 *   onSubmit={handleSubmit}
 *   isSubmitting={isSubmitting}
 * />
 * ```
 */
export { RichEditor } from "./RichEditor";
export type { RichEditorProps, InsertHandlers, MentionItem } from "./types";
