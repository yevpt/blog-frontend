/**
 * CodeBlockExtension — 带语法高亮的代码块扩展
 *
 * 基于 @tiptap/extension-code-block-lowlight，集成：
 * - lowlight（common 语言集）提供 hljs-* 类名装饰
 * - ReactNodeViewRenderer 渲染语言标签（CodeBlockView）
 *
 * 替代 StarterKit 内置的 CodeBlock（需在 StarterKit 中设 codeBlock: false）。
 */
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { CommandProps } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Plugin, PluginKey, Selection, TextSelection } from "@tiptap/pm/state";
import { common, createLowlight } from "lowlight";
import { CodeBlockView } from "../toolbar/CodeBlockView";

const lowlight = createLowlight(common);
const CODE_BLOCK_BOUNDARY_META = "codeBlockBoundary";

interface CodeBlockBoundaryState {
  beforeCodeBlockPos: number | null;
}

const codeBlockBoundaryPluginKey = new PluginKey<CodeBlockBoundaryState>("codeBlockBoundary");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    codeBlockBoundary: {
      /** 光标在代码块起点时，向左跳出到代码块左侧的普通文本位置 */
      moveCursorBeforeCodeBlock: () => ReturnType;
    };
  }
}

export const CodeBlockExtension = CodeBlockLowlight.extend({
  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() || []),
      new Plugin({
        key: codeBlockBoundaryPluginKey,
        state: {
          init: (): CodeBlockBoundaryState => ({ beforeCodeBlockPos: null }),
          apply(tr, value) {
            const meta = tr.getMeta(CODE_BLOCK_BOUNDARY_META) as CodeBlockBoundaryState | undefined;
            if (meta) return meta;
            if (value.beforeCodeBlockPos == null || !tr.docChanged) return value;
            return { beforeCodeBlockPos: tr.mapping.map(value.beforeCodeBlockPos) };
          },
        },
        props: {
          handleTextInput: (view, _from, _to, text) => {
            const { state } = view;
            const pluginState = codeBlockBoundaryPluginKey.getState(state);
            let insertPos =
              pluginState?.beforeCodeBlockPos == null ? null : pluginState.beforeCodeBlockPos + 1;

            if (insertPos == null) {
              const { selection } = state;
              const { $from, empty } = selection;
              if (!empty || $from.parent.type !== this.type || $from.parentOffset !== 0) {
                return false;
              }

              const codeBlockStart = $from.start($from.depth) - 1;
              const nodeBefore = state.doc.resolve(codeBlockStart).nodeBefore;
              if (
                !nodeBefore ||
                nodeBefore.type.name !== "paragraph" ||
                nodeBefore.content.size > 0
              ) {
                return false;
              }

              insertPos = codeBlockStart - nodeBefore.nodeSize + 1;
            }

            const tr = state.tr
              .insertText(text, insertPos, insertPos)
              .setMeta(CODE_BLOCK_BOUNDARY_META, { beforeCodeBlockPos: null });
            view.dispatch(tr.setSelection(TextSelection.create(tr.doc, insertPos + text.length)));
            return true;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      moveCursorBeforeCodeBlock:
        () =>
        ({ state, dispatch }: CommandProps) => {
          const { selection } = state;
          const { $from, empty } = selection;

          if (!empty || $from.parent.type !== this.type || $from.parentOffset !== 0) {
            return false;
          }

          const codeBlockStart = $from.start($from.depth) - 1;
          const beforeSelection = Selection.findFrom(state.doc.resolve(codeBlockStart), -1, true);

          if (beforeSelection) {
            if (dispatch) {
              dispatch(state.tr.setSelection(beforeSelection));
            }
            return true;
          }

          const paragraph = state.schema.nodes.paragraph.create();
          if (dispatch) {
            dispatch(
              state.tr
                .insert(codeBlockStart, paragraph)
                .setMeta(CODE_BLOCK_BOUNDARY_META, { beforeCodeBlockPos: codeBlockStart }),
            );
          }
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      ArrowLeft: () => this.editor.commands.moveCursorBeforeCodeBlock(),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({
  lowlight,
  HTMLAttributes: { class: "rich-editor-code-block" },
  // 未指定语言时回退到 plaintext（lowlight common 内置），避免 highlightAuto 自动探测着色。
  // language 为空会触发 highlightAuto，使「Plain Text」代码块仍被高亮，与需求不符。
  defaultLanguage: "plaintext",
});
