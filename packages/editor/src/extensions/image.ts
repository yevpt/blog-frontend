import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { createElement } from "react";
import type { JSONContent, MarkdownRendererHelpers, RenderContext } from "@tiptap/core";
import { mergeAttributes } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { resolveCdnImageAttrs, type CdnImagePreset } from "@repo/hooks/cdn-image";
import { ImageNodeView } from "../nodes/image-node-view";

import { IMAGE_UPLOAD_PLACEHOLDER_SRC } from "../constants/image-upload";

export { IMAGE_UPLOAD_PLACEHOLDER_SRC };

export interface ImageExtensionOptions {
  imageOptimizationPreset: CdnImagePreset;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLAttributes: Record<string, any>;
}

export interface ImagePlaceholderOptions {
  uploadId: string;
  aspectRatio: number;
  alt?: string;
}

export interface ResolveImagePlaceholderOptions {
  uploadId: string;
  src: string;
  alt?: string;
}

function findImagePositionByUploadId(
  doc: ProseMirrorNode,
  uploadId: string,
): { pos: number; node: ProseMirrorNode } | null {
  let match: { pos: number; node: ProseMirrorNode } | null = null;
  doc.descendants((node, pos) => {
    if (node.type.name !== "image" || node.attrs.uploadId !== uploadId) {
      return;
    }
    match = { pos, node };
    return false;
  });
  return match;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    editorImage: {
      insertImagePlaceholder: (options: ImagePlaceholderOptions) => ReturnType;
      resolveImagePlaceholder: (options: ResolveImagePlaceholderOptions) => ReturnType;
      removeImagePlaceholder: (options: { uploadId: string }) => ReturnType;
    };
  }
}

/** image 节点 → markdown。上传中/占位图返回空串（imageGallery 序列化复用）。 */
export function renderImageMarkdown(node: JSONContent): string {
  if (node.attrs?.uploadState === "loading" || node.attrs?.uploadState === "decoding") {
    return "";
  }

  const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
  if (!src || src === IMAGE_UPLOAD_PLACEHOLDER_SRC) {
    return "";
  }

  const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
  return `![${alt}](${src})`;
}

export const ImageExtension = Image.extend<ImageExtensionOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      inline: false,
      allowBase64: false,
      imageOptimizationPreset: "off",
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-original-src") || element.getAttribute("src"),
      },
      uploadState: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-upload-state"),
        renderHTML: (attributes) =>
          attributes.uploadState ? { "data-upload-state": attributes.uploadState } : {},
      },
      uploadId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-upload-id"),
        renderHTML: (attributes) =>
          attributes.uploadId ? { "data-upload-id": attributes.uploadId } : {},
      },
      aspectRatio: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-aspect-ratio"),
        renderHTML: (attributes) =>
          attributes.aspectRatio ? { "data-aspect-ratio": attributes.aspectRatio } : {},
      },
    };
  },

  addNodeView() {
    const imageOptimizationPreset = this.options.imageOptimizationPreset;
    return ReactNodeViewRenderer((props) =>
      createElement(ImageNodeView, { ...props, imageOptimizationPreset }),
    );
  },

  renderHTML({ node, HTMLAttributes }) {
    const preset = this.options.imageOptimizationPreset;
    const src = node.attrs.src;
    const attributes = { ...HTMLAttributes };

    if (
      preset !== "off" &&
      typeof src === "string" &&
      src &&
      src !== IMAGE_UPLOAD_PLACEHOLDER_SRC
    ) {
      // 避免 ProseMirror 生成内部 DOM 时，带有原图 src 的 img 标签触发浏览器预取庞大的原图。
      const isCompactLayout = preset === "comment";
      const attrs = resolveCdnImageAttrs(src, preset, {
        mode: isCompactLayout ? "fixed" : "responsive",
        displayWidth: isCompactLayout ? 640 : undefined,
      });
      if (attrs.optimizable) {
        attributes.src = attrs.src;
        if (attrs.srcSet) attributes.srcset = attrs.srcSet;
        if (attrs.sizes) attributes.sizes = attrs.sizes;
        attributes["data-original-src"] = src;
      }
    }

    attributes.loading = "lazy";

    return ["img", mergeAttributes(this.options.HTMLAttributes, attributes)];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      insertImagePlaceholder:
        ({ uploadId, aspectRatio, alt }) =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent({
              type: "image",
              attrs: {
                src: IMAGE_UPLOAD_PLACEHOLDER_SRC,
                alt: alt ?? "",
                uploadState: "loading",
                uploadId,
                aspectRatio: String(aspectRatio),
              },
            })
            .run(),

      resolveImagePlaceholder:
        ({ uploadId, src, alt }) =>
        ({ state, dispatch }) => {
          const found = findImagePositionByUploadId(state.doc, uploadId);
          if (!found || !dispatch) {
            return false;
          }

          const { pos, node } = found;
          dispatch(
            state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              src,
              alt: alt ?? node.attrs.alt ?? "",
              uploadState: "decoding",
              uploadId: null,
            }),
          );
          return true;
        },

      removeImagePlaceholder:
        ({ uploadId }) =>
        ({ state, dispatch }) => {
          const found = findImagePositionByUploadId(state.doc, uploadId);
          if (!found || !dispatch) {
            return false;
          }

          const { pos, node } = found;
          dispatch(state.tr.delete(pos, pos + node.nodeSize));
          return true;
        },
    };
  },

  renderMarkdown(node: JSONContent, _helpers: MarkdownRendererHelpers, _ctx: RenderContext) {
    return renderImageMarkdown(node);
  },
});
