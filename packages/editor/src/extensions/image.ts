import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { JSONContent, MarkdownRendererHelpers, RenderContext } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { ImageNodeView } from "../nodes/image-node-view";

import { IMAGE_UPLOAD_PLACEHOLDER_SRC } from "../constants/image-upload";

export { IMAGE_UPLOAD_PLACEHOLDER_SRC };

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

export const ImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
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
    return ReactNodeViewRenderer(ImageNodeView);
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
    if (node.attrs?.uploadState === "loading" || node.attrs?.uploadState === "decoding") {
      return "";
    }

    const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
    if (!src || src === IMAGE_UPLOAD_PLACEHOLDER_SRC) {
      return "";
    }

    const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
    return `![${alt}](${src})`;
  },
}).configure({
  inline: false,
  allowBase64: false,
});
