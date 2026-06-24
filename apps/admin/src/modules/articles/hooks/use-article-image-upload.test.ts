import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { ApiError } from "@repo/api";
import type { ChangeEvent } from "react";
import { useArticleImageUpload } from "./use-article-image-upload";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";

const useEditorImageUploadMock = vi.fn();

vi.mock("@repo/hooks", () => ({
  useEditorImageUpload: (options: unknown) => useEditorImageUploadMock(options),
}));

vi.mock("../../../lib/api", () => ({
  apiClient: {
    uploads: { tempImage: vi.fn() },
  },
}));

vi.mock("../../../lib/toast", () => ({
  addToast: vi.fn(),
}));

describe("useArticleImageUpload", () => {
  const inlineHandlers = {
    inputRef: { current: null },
    isUploading: false,
    handleInsertImageRequest: vi.fn(),
    handleFileChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useEditorImageUploadMock.mockReturnValue(inlineHandlers);
    vi.mocked(apiClient.uploads.tempImage).mockResolvedValue({
      key: "temp/key.png",
      url: "https://cdn.example.com/key.png",
    });
  });

  it("正文插图走 useEditorImageUpload article 场景", () => {
    renderHook(() => useArticleImageUpload());

    expect(useEditorImageUploadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scene: "article",
      }),
    );
  });

  it("封面上传成功后回调 URL", async () => {
    const { result } = renderHook(() => useArticleImageUpload());
    const onUploaded = vi.fn();
    const file = new File(["cover"], "cover.png", { type: "image/png" });
    const event = {
      target: { files: [file], value: "cover.png" },
    } as unknown as ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleCoverFileChange(event, onUploaded);
    });

    expect(apiClient.uploads.tempImage).toHaveBeenCalledWith(file, {
      dir: "covers",
      scene: "article",
    });
    expect(onUploaded).toHaveBeenCalledWith("https://cdn.example.com/key.png");
  });

  it("封面上传失败时提示错误", async () => {
    vi.mocked(apiClient.uploads.tempImage).mockRejectedValue(new ApiError(400, "上传失败"));
    const { result } = renderHook(() => useArticleImageUpload());
    const onUploaded = vi.fn();
    const file = new File(["cover"], "cover.png", { type: "image/png" });
    const event = {
      target: { files: [file], value: "cover.png" },
    } as unknown as ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleCoverFileChange(event, onUploaded);
    });

    expect(onUploaded).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith("上传失败", "error");
  });
});
