import { mergeAttributes, Node } from "@tiptap/core";
import type { JSONContent, MarkdownRendererHelpers, RenderContext } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { ImageInsertHandlers } from "../types";
import { renderImageMarkdown } from "./image";

const GALLERY_TYPE = "imageGallery";
const IMAGE_TYPE = "image";

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

  onCreate() {
    const tr = buildNormalizeStep(this.editor.state);
    if (tr) this.editor.view.dispatch(tr);
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
