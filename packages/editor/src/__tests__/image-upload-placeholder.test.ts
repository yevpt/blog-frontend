// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { ImageExtension, IMAGE_UPLOAD_PLACEHOLDER_SRC } from "../extensions/image";

function findImageNode(editor: Editor): ProseMirrorNode | null {
  let imageNode: ProseMirrorNode | null = null;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "image") {
      imageNode = node;
      return false;
    }
  });
  return imageNode;
}

describe("ImageExtension upload placeholder", () => {
  function makeEditor() {
    return new Editor({
      element: document.createElement("div"),
      extensions: [
        StarterKit.configure({ blockquote: false, horizontalRule: false }),
        ImageExtension,
        Markdown,
      ],
      content: "<p></p>",
    });
  }

  it("insertImagePlaceholder 写入上传中节点属性", () => {
    const editor = makeEditor();
    editor.commands.insertImagePlaceholder({
      uploadId: "upload-1",
      aspectRatio: 16 / 9,
      alt: "demo.png",
    });

    const imageNode = findImageNode(editor);
    expect(imageNode?.attrs.uploadState).toBe("loading");
    expect(imageNode?.attrs.uploadId).toBe("upload-1");
    expect(imageNode?.attrs.aspectRatio).toBe(String(16 / 9));
    expect(imageNode?.attrs.alt).toBe("demo.png");
    editor.destroy();
  });

  it("resolveImagePlaceholder 写入 decoding 态，保留比例直至解码完成", () => {
    const editor = makeEditor();
    editor.commands.insertImagePlaceholder({
      uploadId: "upload-2",
      aspectRatio: 4 / 3,
      alt: "photo.jpg",
    });

    const resolved = editor.commands.resolveImagePlaceholder({
      uploadId: "upload-2",
      src: "https://cdn.example.com/photo.jpg",
      alt: "photo.jpg",
    });
    expect(resolved).toBe(true);

    const imageNode = findImageNode(editor);
    expect(imageNode?.attrs.src).toBe("https://cdn.example.com/photo.jpg");
    expect(imageNode?.attrs.uploadState).toBe("decoding");
    expect(imageNode?.attrs.aspectRatio).toBe(String(4 / 3));
    expect(imageNode?.attrs.uploadId).toBeNull();
    editor.destroy();
  });

  it("removeImagePlaceholder 删除占位节点", () => {
    const editor = makeEditor();
    editor.commands.insertImagePlaceholder({
      uploadId: "upload-3",
      aspectRatio: 1,
    });

    const removed = editor.commands.removeImagePlaceholder({ uploadId: "upload-3" });
    expect(removed).toBe(true);
    expect(editor.getHTML()).not.toContain(IMAGE_UPLOAD_PLACEHOLDER_SRC);
    editor.destroy();
  });

  it("上传中占位不写入 Markdown", () => {
    const editor = makeEditor();
    editor.commands.insertImagePlaceholder({
      uploadId: "upload-4",
      aspectRatio: 16 / 9,
      alt: "pending.png",
    });

    expect(editor.getMarkdown().trim()).toBe("");
    editor.destroy();
  });

  it("decoding 态不写入 Markdown", () => {
    const editor = makeEditor();
    editor.commands.insertImagePlaceholder({
      uploadId: "upload-5",
      aspectRatio: 16 / 9,
    });
    editor.commands.resolveImagePlaceholder({
      uploadId: "upload-5",
      src: "https://cdn.example.com/pending.jpg",
    });

    expect(editor.getMarkdown().trim()).toBe("");
    editor.destroy();
  });

  it("就绪图片正常序列化为 Markdown", () => {
    const editor = makeEditor();
    editor.commands.setImage({
      src: "https://cdn.example.com/ready.png",
      alt: "ready",
    });

    expect(editor.getMarkdown()).toContain("![ready](https://cdn.example.com/ready.png)");
    editor.destroy();
  });
});
