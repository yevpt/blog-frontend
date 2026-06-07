/**
 * ================================================================
 * Mention Extension — @提及扩展
 * ================================================================
 *
 * 【当前状态：UI 完整，数据为 stub】
 * 输入 @ 后会弹出候选列表，但候选数据由外部传入（当前为空数组）。
 * 原因：后端缺少用户搜索接口（packages/api 目前只有 getMe）。
 *
 * TODO(mention-api): 后端提供 GET /users/search?q={query} 后：
 *   1. 在 apps/web/components/comments/rich-comment-input.tsx 中
 *      用防抖 fetch 填充 mentionSuggestions prop
 *   2. RichEditor 无需修改，候选列表自动展示
 *
 * 【序列化约定】
 * mention 节点 → Markdown 纯文本 "@label"
 * 通过 renderText 选项实现，保持 Markdown 可读性。
 *
 * 【Tiptap Suggestion 机制简介（教学用）】
 * @tiptap/suggestion 监听触发字符（此处为 "@"），捕获后续输入作为 query，
 * 调用 items({ query }) 获取候选列表，再通过 render() 返回的生命周期
 * 函数控制下拉 UI（onStart/onUpdate/onKeyDown/onExit）。
 * ================================================================
 */
import Mention from "@tiptap/extension-mention";
import type { SuggestionProps } from "@tiptap/suggestion";

import type { MentionItem } from "../types";

/**
 * 创建 Mention 扩展实例。
 * @param suggestions 候选用户列表（由父组件传入，默认空数组）
 */
export function createMentionExtension(suggestions: MentionItem[]) {
  return Mention.configure({
    HTMLAttributes: {
      // mention 节点在编辑器中的样式类，可通过全局 CSS 定制
      class: "rich-editor-mention",
    },

    /**
     * mention 节点在 Markdown 中的纯文本表示。
     * node.attrs.label 是选中时存储的显示名，node.attrs.id 是唯一标识。
     * Tiptap v3: renderText 接收 { options, node, suggestion }
     */
    renderText({ node }) {
      return `@${node.attrs.label ?? node.attrs.id}`;
    },

    suggestion: {
      /**
       * 根据用户输入过滤候选列表。
       * query 是用户在 @ 后继续输入的文字。
       * 最多返回 8 条，避免下拉列表过长。
       * Tiptap v3: items 接收 { query, editor }
       */
      items: ({ query }: { query: string; editor: unknown }) =>
        suggestions
          .filter((item) => item.label.toLowerCase().startsWith(query.toLowerCase()))
          .slice(0, 8),

      /**
       * 下拉 UI 生命周期。
       * 返回 { onStart, onUpdate, onKeyDown, onExit } 四个钩子。
       * 此处使用轻量 DOM 实现，不引入额外依赖。
       * 未来可替换为基于 @tiptap/react ReactRenderer 的 React 组件实现。
       */
      render: () => {
        let dropdown: HTMLElement | null = null;

        /** 根据光标位置定位下拉 div */
        function position(rect: DOMRect | null | undefined) {
          if (!dropdown || !rect) return;
          Object.assign(dropdown.style, {
            top: `${rect.bottom + window.scrollY + 4}px`,
            left: `${rect.left + window.scrollX}px`,
          });
        }

        /** 用候选列表填充下拉 div */
        function populate(items: MentionItem[], command: (item: MentionItem) => void) {
          if (!dropdown) return;
          dropdown.innerHTML = "";
          items.forEach((item) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = `@${item.label}`;
            Object.assign(btn.style, {
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "6px 12px",
              fontSize: "13px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              borderRadius: "4px",
              color: "inherit",
            });
            btn.addEventListener("mouseenter", () => {
              btn.style.background = "var(--primary, #3b82f6)";
              btn.style.color = "white";
            });
            btn.addEventListener("mouseleave", () => {
              btn.style.background = "transparent";
              btn.style.color = "inherit";
            });
            // mousedown 而非 click：在 blur 前触发，避免编辑器失焦取消选择
            btn.addEventListener("mousedown", (e) => {
              e.preventDefault();
              command(item);
            });
            dropdown!.appendChild(btn);
          });
        }

        return {
          onStart(props: SuggestionProps<MentionItem>) {
            if (props.items.length === 0) return;
            dropdown = document.createElement("div");
            Object.assign(dropdown.style, {
              position: "absolute",
              zIndex: "9999",
              background: "var(--background, #fff)",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: "8px",
              padding: "4px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              minWidth: "160px",
            });
            populate(props.items, props.command);
            position(props.clientRect?.());
            document.body.appendChild(dropdown);
          },

          onUpdate(props: SuggestionProps<MentionItem>) {
            if (!dropdown) return;
            if (props.items.length === 0) {
              dropdown.remove();
              dropdown = null;
              return;
            }
            populate(props.items, props.command);
            position(props.clientRect?.());
          },

          // 简化实现：不处理键盘导航，返回 false 让 Tiptap 继续处理
          onKeyDown: () => false,

          onExit() {
            dropdown?.remove();
            dropdown = null;
          },
        };
      },
    },
  });
}
