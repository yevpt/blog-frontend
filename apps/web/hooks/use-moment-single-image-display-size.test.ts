// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMomentSingleImageDisplaySize } from "./use-moment-single-image-display-size";

describe("useMomentSingleImageDisplaySize", () => {
  const originalImage = window.Image;

  beforeEach(() => {
    vi.stubGlobal(
      "Image",
      class MockImage {
        decoding = "async";
        naturalWidth = 0;
        naturalHeight = 0;
        private _src = "";

        set src(value: string) {
          this._src = value;
          queueMicrotask(() => {
            if (value.includes("fail")) {
              this.onerror?.(new Event("error"));
              return;
            }
            this.naturalWidth = 1600;
            this.naturalHeight = 900;
            this.onload?.(new Event("load"));
          });
        }

        get src() {
          return this._src;
        }

        onload: ((event: Event) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
      },
    );
  });

  afterEach(() => {
    vi.stubGlobal("Image", originalImage);
  });

  it("按 object-contain 上限计算展示尺寸", async () => {
    const { result } = renderHook(() =>
      useMomentSingleImageDisplaySize("https://cdn.example.com/photo.jpg"),
    );

    await waitFor(() => {
      expect(result.current).toEqual({ width: 480, height: 270 });
    });
  });

  it("探测失败时回退到最大展示框", async () => {
    const { result } = renderHook(() =>
      useMomentSingleImageDisplaySize("https://cdn.example.com/fail.jpg"),
    );

    await waitFor(() => {
      expect(result.current).toEqual({ width: 480, height: 320 });
    });
  });
});
