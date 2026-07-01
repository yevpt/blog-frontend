// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ChangeEvent } from "react";
import type { ImageInsertHandlers } from "@repo/editor";
import { useEditorImageUpload } from "./use-editor-image-upload";

vi.mock("@repo/editor", () => ({
  readImageAspectRatio: vi.fn().mockResolvedValue(1.5),
}));

const prepareImageForUpload = vi.fn();
vi.mock("./compress-image", () => ({
  prepareImageForUpload: (file: File, scene: string) => prepareImageForUpload(file, scene),
  USER_FACING_IMAGE_ERROR_PREFIXES: ["图片过大"],
}));

describe("useEditorImageUpload", () => {
  const handlers: ImageInsertHandlers = {
    insert: vi.fn(),
    insertLoading: vi.fn(),
    resolveLoading: vi.fn(),
    removeLoading: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(console, "info").mockImplementation(() => undefined);
    prepareImageForUpload.mockImplementation(async (file: File) => file);
  });

  it("comment 场景先准备图片再上传", async () => {
    const upload = vi.fn().mockResolvedValue("https://cdn.example.com/a.png");
    const { result } = renderHook(() =>
      useEditorImageUpload({ scene: "comment", upload, onError: vi.fn() }),
    );

    act(() => {
      result.current.handleInsertImageRequest(handlers);
    });

    const file = new File(["img"], "a.png", { type: "image/png" });
    const event = {
      target: { files: [file], value: "a.png" },
    } as unknown as ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event);
    });

    expect(prepareImageForUpload).toHaveBeenCalledWith(file, "comment");
    // eslint-disable-next-line no-console
    expect(console.info).toHaveBeenCalledWith(
      "[upload-image:comment:select]",
      expect.objectContaining({ name: "a.png", sizeBytes: file.size }),
    );
    // eslint-disable-next-line no-console
    expect(console.info).toHaveBeenCalledWith(
      "[upload-image:comment:upload]",
      expect.objectContaining({ name: "a.png", sizeBytes: file.size }),
    );
    expect(handlers.insertLoading).toHaveBeenCalledWith(
      expect.objectContaining({ aspectRatio: 1.5, alt: "a.png" }),
    );
    expect(upload).toHaveBeenCalledWith(file);
    expect(handlers.resolveLoading).toHaveBeenCalledWith(
      (handlers.insertLoading as ReturnType<typeof vi.fn>).mock.calls[0]![0].uploadId,
      "https://cdn.example.com/a.png",
      "a.png",
    );
  });

  it("article 场景仅走体积校验准备流程", async () => {
    const upload = vi.fn().mockResolvedValue("https://cdn.example.com/b.png");
    const { result } = renderHook(() => useEditorImageUpload({ scene: "article", upload }));

    act(() => {
      result.current.handleInsertImageRequest(handlers);
    });

    const file = new File(["img"], "b.png", { type: "image/png" });
    const event = {
      target: { files: [file], value: "b.png" },
    } as unknown as ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event);
    });

    expect(prepareImageForUpload).toHaveBeenCalledWith(file, "article");
    expect(upload).toHaveBeenCalledWith(file);
  });

  it("上传失败时移除占位并回调 onError", async () => {
    const onError = vi.fn();
    const upload = vi.fn().mockRejectedValue(new Error("网络错误"));
    const { result } = renderHook(() =>
      useEditorImageUpload({ scene: "comment", upload, onError }),
    );

    act(() => {
      result.current.handleInsertImageRequest(handlers);
    });

    const file = new File(["img"], "c.png", { type: "image/png" });
    const event = {
      target: { files: [file], value: "c.png" },
    } as unknown as ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event);
    });

    expect(handlers.removeLoading).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith("网络错误");
  });
});
