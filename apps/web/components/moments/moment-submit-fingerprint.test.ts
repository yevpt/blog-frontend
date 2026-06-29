import { describe, it, expect } from "vitest";
import type { MomentImageItem } from "./types";
import { momentPublishFingerprint, momentEditFingerprint } from "./moment-submit-fingerprint";

function fileItem(name: string, size: number, lastModified: number): MomentImageItem {
  const file = new File([new Uint8Array(size)], name, { type: "image/png" });
  // jsdom File 不自动设置 lastModified，显式挂上保证指纹稳定可测
  Object.defineProperty(file, "lastModified", { value: lastModified, configurable: true });
  return { id: name, file, previewUrl: `blob:${name}` };
}

function urlItem(remoteUrl: string): MomentImageItem {
  return { id: remoteUrl, remoteUrl, previewUrl: remoteUrl };
}

describe("momentPublishFingerprint", () => {
  it("包含正文、status、comment_status 与按序图片身份", () => {
    const images = [urlItem("https://cdn/a.png"), fileItem("b.png", 100, 1700000000000)];

    const fp = momentPublishFingerprint("你好", "1", "1", images);

    expect(fp).toContain("你好");
    expect(fp).toContain("1");
    expect(fp).toContain("url:https://cdn/a.png");
    expect(fp).toContain("file:b.png:100:1700000000000");
    // 顺序固定：url 在 file 之前
    expect(fp.indexOf("url:https://cdn/a.png")).toBeLessThan(
      fp.indexOf("file:b.png:100:1700000000000"),
    );
  });

  it("正文变化则指纹变化", () => {
    const images = [urlItem("https://cdn/a.png")];
    expect(momentPublishFingerprint("A", "1", "1", images)).not.toBe(
      momentPublishFingerprint("B", "1", "1", images),
    );
  });

  it("图片顺序变化则指纹变化", () => {
    const a = urlItem("https://cdn/a.png");
    const b = urlItem("https://cdn/b.png");
    expect(momentPublishFingerprint("x", "1", "1", [a, b])).not.toBe(
      momentPublishFingerprint("x", "1", "1", [b, a]),
    );
  });

  it("status 或 comment_status 变化则指纹变化", () => {
    const images: MomentImageItem[] = [];
    expect(momentPublishFingerprint("x", "1", "1", images)).not.toBe(
      momentPublishFingerprint("x", "0", "1", images),
    );
    expect(momentPublishFingerprint("x", "1", "1", images)).not.toBe(
      momentPublishFingerprint("x", "1", "0", images),
    );
  });
});

describe("momentEditFingerprint", () => {
  it("包含碎语 ID、正文、status、comment_status 与按序图片身份", () => {
    const images = [fileItem("c.png", 200, 1700000000001), urlItem("https://cdn/d.png")];

    const fp = momentEditFingerprint(42, "改", 1, 1, images);

    expect(fp).toContain("42");
    expect(fp).toContain("改");
    expect(fp).toContain("1");
    expect(fp).toContain("file:c.png:200:1700000000001");
    expect(fp).toContain("url:https://cdn/d.png");
    expect(fp.indexOf("file:c.png:200:1700000000001")).toBeLessThan(
      fp.indexOf("url:https://cdn/d.png"),
    );
  });

  it("碎语 ID 不同则指纹不同", () => {
    const images: MomentImageItem[] = [];
    expect(momentEditFingerprint(1, "x", 1, 1, images)).not.toBe(
      momentEditFingerprint(2, "x", 1, 1, images),
    );
  });

  it("正文变化则指纹变化", () => {
    const images: MomentImageItem[] = [];
    expect(momentEditFingerprint(1, "A", 1, 1, images)).not.toBe(
      momentEditFingerprint(1, "B", 1, 1, images),
    );
  });

  it("图片顺序变化则指纹变化", () => {
    const a = urlItem("https://cdn/a.png");
    const b = urlItem("https://cdn/b.png");
    expect(momentEditFingerprint(1, "x", 1, 1, [a, b])).not.toBe(
      momentEditFingerprint(1, "x", 1, 1, [b, a]),
    );
  });
});
