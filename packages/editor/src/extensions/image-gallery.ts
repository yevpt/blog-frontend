import { mergeAttributes, Node } from "@tiptap/core";
import type { JSONContent, MarkdownRendererHelpers, RenderContext } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection, Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { ImageInsertHandlers } from "../types";
import { ImageGalleryNodeView } from "../nodes/image-gallery-node-view";
import { renderImageMarkdown } from "./image";

const GALLERY_TYPE = "imageGallery";
const IMAGE_TYPE = "image";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageGallery: {
      /** gallery 内图片处于 NodeSelection 时，以该图为界拆分并插入 nbsp 分隔段落。 */
      splitImageGallery: () => ReturnType;
    };
  }
}

/** RichEditor 通过 storage 注入「添加图片」的选图流程（复用工具栏的 onInsertImage）。 */
export interface ImageGalleryStorage {
  requestImageInsert: ((handlers: ImageInsertHandlers) => void) | null;
}

interface Rewrite {
  from: number;
  to: number;
  nodes: PMNode[];
}

/** 展平 run 内所有图片（gallery 摊开为子图，保持顺序）。 */
function flattenRunImages(run: PMNode[]): PMNode[] {
  const images: PMNode[] = [];
  for (const node of run) {
    if (node.type.name === IMAGE_TYPE) {
      images.push(node);
      continue;
    }
    node.forEach((child) => images.push(child));
  }
  return images;
}

/** 在 parent 的 children 中找第一处需要归一化的相邻 image/imageGallery run。 */
function findRewriteInParent(
  parent: PMNode,
  contentStart: number,
  state: EditorState,
): Rewrite | null {
  const galleryType = state.schema.nodes[GALLERY_TYPE];
  let run: Array<{ node: PMNode; from: number; to: number }> = [];

  const evaluate = (): Rewrite | null => {
    if (run.length === 0) return null;
    const totalImages = run.reduce(
      (sum, item) => sum + (item.node.type.name === IMAGE_TYPE ? 1 : item.node.childCount),
      0,
    );
    const firstNode = run[0];
    if (!firstNode) return null;
    const lastNode = run[run.length - 1];
    if (!lastNode) return null;

    const needsRewrite =
      run.length > 1 ||
      (firstNode.node.type.name === GALLERY_TYPE && firstNode.node.childCount < 2);
    if (!needsRewrite) return null;

    const images = flattenRunImages(run.map((item) => item.node));
    const nodes = totalImages >= 2 ? [galleryType.create(null, images)] : images.slice(0, 1);
    return { from: firstNode.from, to: lastNode.to, nodes };
  };

  let offset = contentStart;
  for (let index = 0; index < parent.childCount; index++) {
    const child = parent.child(index);
    const from = offset;
    const to = offset + child.nodeSize;
    offset = to;

    if (child.type.name === IMAGE_TYPE || child.type.name === GALLERY_TYPE) {
      run.push({ node: child, from, to });
      continue;
    }
    const rewrite = evaluate();
    if (rewrite) return rewrite;
    run = [];
  }
  return evaluate();
}

/** 全文档找第一处违规并生成修复事务；无违规返回 null。 */
function buildNormalizeStep(state: EditorState): Transaction | null {
  let rewrite = findRewriteInParent(state.doc, 0, state);
  if (!rewrite) {
    state.doc.descendants((node, pos) => {
      if (rewrite) return false;
      if (node.type.name === IMAGE_TYPE || node.type.name === GALLERY_TYPE) return false;
      if (!node.isBlock || node.childCount === 0) return true;
      rewrite = findRewriteInParent(node, pos + 1, state);
      return !rewrite;
    });
  }
  if (!rewrite) return null;
  return state.tr.replaceWith(rewrite.from, rewrite.to, rewrite.nodes);
}

export const ImageGalleryExtension = Node.create({
  name: GALLERY_TYPE,

  group: "block",
  content: "image+",
  isolating: true,
  selectable: true,
  draggable: false,

  addStorage(): ImageGalleryStorage {
    return { requestImageInsert: null };
  },

  parseHTML() {
    return [{ tag: "div[data-image-gallery]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-image-gallery": "" }, HTMLAttributes), 0];
  },

  renderMarkdown(node: JSONContent, _helpers: MarkdownRendererHelpers, _ctx: RenderContext) {
    const parts = (node.content ?? []).map((child) => renderImageMarkdown(child)).filter(Boolean);
    return parts.join("\n\n");
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageGalleryNodeView);
  },

  onCreate() {
    const tr = buildNormalizeStep(this.editor.state);
    if (tr) this.editor.view.dispatch(tr);
  },

  addCommands() {
    return {
      splitImageGallery:
        () =>
        ({ state, dispatch }) => {
          const { selection } = state;
          if (!(selection instanceof NodeSelection)) return false;
          if (selection.node.type.name !== IMAGE_TYPE) return false;

          const $from = selection.$from;
          const depth = $from.depth;
          if (depth === 0 || $from.node(depth).type.name !== GALLERY_TYPE) return false;
          if (!dispatch) return true;

          const gallery = $from.node(depth);
          const galleryFrom = $from.before(depth);
          const galleryTo = galleryFrom + gallery.nodeSize;
          const splitIndex = $from.index(depth);
          const before: PMNode[] = [];
          const after: PMNode[] = [];
          gallery.forEach((child, _offset, index) => {
            (index <= splitIndex ? before : after).push(child);
          });

          const galleryType = state.schema.nodes[GALLERY_TYPE];
          const wrap = (images: PMNode[]): PMNode[] => {
            if (images.length === 0) return [];
            if (images.length === 1) return [images[0]];
            return [galleryType.create(null, images)];
          };

          // 纯空段落会被 remark 折叠；nbsp 才能稳定阻断前台再次成组。
          const separator = state.schema.nodes.paragraph.create(null, state.schema.text("\u00a0"));
          const wrappedBefore = wrap(before);
          const nodes = [...wrappedBefore, separator, ...wrap(after)];
          const tr = state.tr.replaceWith(galleryFrom, galleryTo, nodes);
          const beforeSize = wrappedBefore.reduce((sum, node) => sum + node.nodeSize, 0);
          tr.setSelection(
            TextSelection.create(tr.doc, galleryFrom + beforeSize + separator.nodeSize - 1),
          );
          dispatch(tr);
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitImageGallery(),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("imageGalleryNormalize"),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          // 每次只修复第一处违规；返回事务后由 appendTransaction 链继续收敛。
          return buildNormalizeStep(newState);
        },
      }),
    ];
  },
});
