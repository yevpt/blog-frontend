// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { readImageAspectRatio } from "./read-image-aspect-ratio";

describe("readImageAspectRatio", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("根据图片 natural 尺寸返回宽高比", async () => {
    const file = new File(["fake"], "wide.png", { type: "image/png" });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 800;
      naturalHeight = 400;

      set src(_value: string) {
        this.onload?.();
      }
    }

    vi.stubGlobal("Image", MockImage);

    await expect(readImageAspectRatio(file)).resolves.toBe(2);
  });

  it("读图失败时回退 16:9", async () => {
    const file = new File(["fake"], "bad.png", { type: "image/png" });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    class BrokenImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;

      set src(_value: string) {
        this.onload?.();
      }
    }

    vi.stubGlobal("Image", BrokenImage);

    await expect(readImageAspectRatio(file)).resolves.toBe(16 / 9);
  });
});
