import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

interface PlaceholderOptions {
  placeholder: string;
}

export const PlaceholderExtension = Extension.create<PlaceholderOptions>({
  name: "richEditorPlaceholder",

  addOptions() {
    return {
      placeholder: "",
    };
  },

  addProseMirrorPlugins() {
    const { editor } = this;
    const { placeholder } = this.options;

    return [
      new Plugin({
        props: {
          decorations(state) {
            if (!editor.isEditable || state.doc.childCount !== 1) {
              return DecorationSet.empty;
            }

            const node = state.doc.firstChild;
            if (!node || node.textContent.length > 0) {
              return DecorationSet.empty;
            }

            return DecorationSet.create(state.doc, [
              Decoration.node(0, node.nodeSize, {
                class: "is-editor-empty is-empty",
                "data-placeholder": placeholder,
              }),
            ]);
          },
        },
      }),
    ];
  },
});
