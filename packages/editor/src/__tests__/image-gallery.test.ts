// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import type { Node as PMNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { ImageExtension, IMAGE_UPLOAD_PLACEHOLDER_SRC } from "../extensions/image";
import { ImageGalleryExtension } from "../extensions/image-gallery";

let editors: Editor[] = [];

function createEditor(initialMarkdown = ""): Editor {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: [
      StarterKit.configure({
        underline: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Markdown.configure({}),
      ImageExtension.configure({ imageOptimizationPreset: "off" }),
      ImageGalleryExtension,
    ],
    content: initialMarkdown,
    contentType: "markdown",
  });
  editors.push(editor);
  return editor;
}

function waitForCreate(editor: Editor): Promise<void> {
  if (editor.isInitialized) return Promise.resolve();
  return new Promise((resolve) => editor.on("create", () => resolve()));
}

afterEach(() => {
  editors.forEach((editor) => editor.destroy());
  editors = [];
});

/** 收集 doc 顶层节点类型名列表，断言结构用 */
function topLevelTypes(editor: Editor): string[] {
  const types: string[] = [];
  editor.state.doc.forEach((node) => types.push(node.type.name));
  return types;
}

function findGallery(editor: Editor): { node: PMNode; pos: number } | null {
  let found: { node: PMNode; pos: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "imageGallery" && !found) {
      found = { node, pos };
      return false;
    }
    return true;
  });
  return found;
}

describe("imageGallery 归一化", () => {
  it("加载相邻两图 markdown 后合并为一个 gallery", async () => {
    const editor = createEditor("![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)");
    await waitForCreate(editor);
    const gallery = findGallery(editor);
    expect(gallery?.node.childCount).toBe(2);
    expect(topLevelTypes(editor)).toEqual(["imageGallery", "paragraph"]);
  });

  it("三张相邻图合并为一个 gallery", async () => {
    const editor = createEditor(
      "![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)\n\n![三](https://e.com/3.png)",
    );
    await waitForCreate(editor);
    expect(findGallery(editor)?.node.childCount).toBe(3);
  });

  it("单张图不成组", () => {
    const editor = createEditor("![一](https://e.com/1.png)");
    expect(findGallery(editor)).toBeNull();
  });

  it("图片间有文字段落时不合并", () => {
    const editor = createEditor(
      "![一](https://e.com/1.png)\n\n中间文字\n\n![二](https://e.com/2.png)",
    );
    expect(findGallery(editor)).toBeNull();
  });

  it("图片间的 nbsp 段落阻断合并（拆组契约）", () => {
    const editor = createEditor(
      "![一](https://e.com/1.png)\n\n\u00a0\n\n![二](https://e.com/2.png)",
    );
    expect(findGallery(editor)).toBeNull();
  });

  it("gallery 序列化为相邻图片段落（round-trip）", async () => {
    const editor = createEditor("![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)");
    await waitForCreate(editor);
    expect(editor.getMarkdown().trim()).toBe(
      "![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)",
    );
  });

  it("删到仅剩一张图时 gallery 解散为普通 image", async () => {
    const editor = createEditor("![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)");
    await waitForCreate(editor);
    const gallery = findGallery(editor);
    if (!gallery) throw new Error("gallery 不存在");
    const firstChild = gallery.node.child(0);
    editor.view.dispatch(
      editor.state.tr.delete(gallery.pos + 1, gallery.pos + 1 + firstChild.nodeSize),
    );
    expect(findGallery(editor)).toBeNull();
    expect(topLevelTypes(editor)).toEqual(["image", "paragraph"]);
  });

  it("在 gallery 后紧邻插入图片会被并入", async () => {
    const editor = createEditor("![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)");
    await waitForCreate(editor);
    const gallery = findGallery(editor);
    if (!gallery) throw new Error("gallery 不存在");
    editor.commands.insertContentAt(gallery.pos + gallery.node.nodeSize, {
      type: "image",
      attrs: { src: "https://e.com/3.png", alt: "三" },
    });
    expect(findGallery(editor)?.node.childCount).toBe(3);
    expect(topLevelTypes(editor)).toEqual(["imageGallery", "paragraph"]);
  });

  it("上传占位图在 gallery 内可被 resolveImagePlaceholder 替换", async () => {
    const editor = createEditor("![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)");
    await waitForCreate(editor);
    const gallery = findGallery(editor);
    if (!gallery) throw new Error("gallery 不存在");
    editor.commands.insertContentAt(gallery.pos + gallery.node.nodeSize - 1, {
      type: "image",
      attrs: {
        src: IMAGE_UPLOAD_PLACEHOLDER_SRC,
        alt: "",
        uploadState: "loading",
        uploadId: "u-1",
        aspectRatio: "1.5",
      },
    });
    expect(findGallery(editor)?.node.childCount).toBe(3);
    expect(editor.getMarkdown().trim()).toBe(
      "![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)",
    );
    const resolved = editor.commands.resolveImagePlaceholder({
      uploadId: "u-1",
      src: "https://e.com/3.png",
    });
    const resolvedGallery = findGallery(editor);
    expect(resolved).toBe(true);
    expect(resolvedGallery?.node.child(2).attrs.src).toBe("https://e.com/3.png");
    expect(resolvedGallery?.node.child(2).attrs.uploadState).toBe("decoding");
  });
});
