import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Fragment, Slice } from "@tiptap/pm/model";
import type { Node as ProseMirrorNode, Schema } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";

interface CharacterLimitOptions {
  maxLength?: number;
}

function clampTextByMarkdownLength(
  text: string,
  maxLength: number,
  makeMarkdown: (text: string) => string,
) {
  let low = 0;
  let high = text.length;
  let best = "";

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.slice(0, mid);

    if (makeMarkdown(candidate).length <= maxLength) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

function insertPlainText(
  transaction: Transaction,
  schema: Schema,
  text: string,
  from?: number,
  to?: number,
) {
  const normalizedText = text.replace(/\r\n?/g, "\n");
  if (!normalizedText.includes("\n")) {
    return transaction.insertText(normalizedText, from, to);
  }

  const hardBreak = schema.nodes.hardBreak;
  if (!hardBreak) {
    return transaction.insertText(normalizedText, from, to);
  }

  const nodes: ProseMirrorNode[] = [];
  normalizedText.split("\n").forEach((line, index, lines) => {
    if (line) {
      nodes.push(schema.text(line));
    }
    if (index < lines.length - 1) {
      nodes.push(hardBreak.create());
    }
  });

  const slice = new Slice(Fragment.fromArray(nodes), 0, 0);
  if (from == null || to == null) {
    return transaction.replaceSelection(slice);
  }
  return transaction.replaceRange(from, to, slice);
}

/**
 * 在 ProseMirror transaction 层限制可输入文本长度。
 * 达到上限后继续键入或粘贴会被拦截；删除、缩短内容和格式切换仍然允许。
 */
export const CharacterLimitExtension = Extension.create<CharacterLimitOptions>({
  name: "characterLimit",

  addOptions() {
    return {
      maxLength: undefined,
    };
  },

  addProseMirrorPlugins() {
    const maxLength = this.options.maxLength;
    const markdownManager = this.editor.markdown;

    const markdownLength = (
      doc: Parameters<NonNullable<typeof markdownManager>["serialize"]>[0],
    ) => (markdownManager ? markdownManager.serialize(doc).length : 0);
    const docMarkdownLength = (doc: {
      toJSON: () => Parameters<NonNullable<typeof markdownManager>["serialize"]>[0];
      textContent: string;
    }) => (markdownManager ? markdownLength(doc.toJSON()) : doc.textContent.length);

    return [
      new Plugin({
        props: {
          handleTextInput(view, from, to, text) {
            if (maxLength == null) return false;

            const { state } = view;
            const fullInputTransaction = insertPlainText(state.tr, state.schema, text, from, to);
            if (docMarkdownLength(fullInputTransaction.doc) <= maxLength) return false;

            const clippedText = clampTextByMarkdownLength(text, maxLength, (candidate) =>
              markdownManager
                ? markdownManager.serialize(
                    insertPlainText(state.tr, state.schema, candidate, from, to).doc.toJSON(),
                  )
                : insertPlainText(state.tr, state.schema, candidate, from, to).doc.textContent,
            );
            if (clippedText) {
              view.dispatch(
                insertPlainText(state.tr, state.schema, clippedText, from, to).scrollIntoView(),
              );
            }
            return true;
          },

          handlePaste(view, event) {
            if (maxLength == null) return false;

            const pastedText = event.clipboardData?.getData("text/plain") ?? "";
            if (!pastedText) return false;

            const { state } = view;
            const fullPasteTransaction = insertPlainText(state.tr, state.schema, pastedText);
            if (docMarkdownLength(fullPasteTransaction.doc) <= maxLength) return false;

            event.preventDefault();
            const clippedText = clampTextByMarkdownLength(pastedText, maxLength, (text) =>
              markdownManager
                ? markdownManager.serialize(
                    insertPlainText(state.tr, state.schema, text).doc.toJSON(),
                  )
                : insertPlainText(state.tr, state.schema, text).doc.textContent,
            );
            if (clippedText) {
              view.dispatch(insertPlainText(state.tr, state.schema, clippedText).scrollIntoView());
            }
            return true;
          },
        },
      }),
    ];
  },
});
