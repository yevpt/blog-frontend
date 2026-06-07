/**
 * ================================================================
 * Underline Extension — RichEditor 下划线扩展
 * ================================================================
 *
 * 【为什么单独封装，而不直接用 StarterKit 内置的 underline】
 * StarterKit v3 已内置 @tiptap/extension-underline。
 * 但本文件将其显式封装并重导出，原因：
 *   1. 可追溯：grep UnderlineExtension 即可找到所有下划线相关决策
 *   2. 统一序列化约定（见下方数据流说明）
 *   3. 扩展点：未来如需修改行为，只改此文件
 *
 * 在 use-rich-editor.ts 中使用时：
 *   StarterKit.configure({ underline: false }) + UnderlineExtension
 * 而不是直接让 StarterKit 启用内置版本，目的是让扩展列表明确可见。
 *
 * 【数据流（从用户操作到存储）】
 *   Ctrl+U 或工具栏按钮
 *     → editor.chain().focus().toggleUnderline().run()
 *     → Tiptap 在 ProseMirror doc 中标记 `underline` mark
 *     → @tiptap/markdown（html: true）序列化为 <u>text</u>
 *     → 提交到后端，存储为 Markdown 字符串中的内联 HTML
 *     → apps/web/lib/markdown.ts 的 rehype-sanitize 需允许 <u> 标签
 *       （见 Task 17 对 sanitize 配置的修改）
 *
 * 【Markdown 标准说明】
 * CommonMark / GFM 均不包含下划线语法。
 * <u>text</u> 是合法的 Markdown 内联 HTML，大多数渲染器支持。
 * 下划线在 web 排版中常与超链接混淆，请在评论 UI 中酌情引导用户。
 *
 * 【为什么覆盖 renderMarkdown】
 * @tiptap/extension-underline v3 默认将下划线序列化为 ++text++（需要 remark-ins 插件）。
 * 本项目渲染管线不包含 remark-ins，因此强制覆盖为 <u>text</u>（CommonMark 内联 HTML），
 * 与 parseHTML [{ tag: 'u' }] 保持双向一致，并确保 Task 17 rehype-sanitize 能正常放行。
 * ================================================================
 */
import { type JSONContent, type MarkdownRendererHelpers } from "@tiptap/core";
import Underline from "@tiptap/extension-underline";

/**
 * 下划线扩展。
 * 覆盖官方扩展的 renderMarkdown，强制序列化为 <u>text</u> 而非 ++text++。
 */
export const UnderlineExtension = Underline.extend({
  // 覆盖序列化行为：输出 <u>text</u>（CommonMark 内联 HTML）
  // @tiptap/markdown v3 通过 getExtensionField(extension, 'renderMarkdown') 读取此方法
  renderMarkdown(node: JSONContent, helpers: MarkdownRendererHelpers) {
    return `<u>${helpers.renderChildren(node)}</u>`;
  },
});
