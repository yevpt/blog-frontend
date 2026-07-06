import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ChangeEvent } from "react";
import { ApiError } from "@repo/api";
import { useCategoryAssetUpload } from "./use-category-asset-upload";
import { apiClient } from "../../../lib/api";

const prepareImageForUploadMock = vi.fn();

vi.mock("@repo/hooks", () => ({
  prepareImageForUpload: (file: File, scene: string) => prepareImageForUploadMock(file, scene),
}));

vi.mock("../../../lib/api", () => ({
  apiClient: {
    categories: {
      uploadIcon: vi.fn(),
      uploadCover: vi.fn(),
    },
  },
}));

describe("useCategoryAssetUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prepareImageForUploadMock.mockImplementation(async (file: File) => file);
    vi.mocked(apiClient.categories.uploadIcon).mockResolvedValue({
      key: "tmp/icon.svg",
      url: "https://cdn.example.com/tmp/icon.svg",
      size: 128,
      mime: "image/svg+xml",
    });
    vi.mocked(apiClient.categories.uploadCover).mockResolvedValue({
      key: "tmp/cover.jpg",
      url: "https://cdn.example.com/tmp/cover.jpg",
      size: 2048,
      mime: "image/jpeg",
    });
  });

  it("图标上传成功后回调素材值", async () => {
    const { result } = renderHook(() => useCategoryAssetUpload());
    const onUploaded = vi.fn();
    const file = new File(["<svg></svg>"], "icon.svg", { type: "image/svg+xml" });
    const event = {
      target: { files: [file], value: "icon.svg" },
    } as unknown as ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleIconFileChange(event, onUploaded);
    });

    expect(apiClient.categories.uploadIcon).toHaveBeenCalledWith(file);
    expect(onUploaded).toHaveBeenCalledWith({
      submitValue: "tmp/icon.svg",
      previewUrl: "https://cdn.example.com/tmp/icon.svg",
    });
  });

  it("封面上传前调用文章场景预处理", async () => {
    const { result } = renderHook(() => useCategoryAssetUpload());
    const onUploaded = vi.fn();
    const file = new File(["cover"], "cover.png", { type: "image/png" });
    const event = {
      target: { files: [file], value: "cover.png" },
    } as unknown as ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleCoverFileChange(event, onUploaded);
    });

    expect(prepareImageForUploadMock).toHaveBeenCalledWith(file, "article");
    expect(apiClient.categories.uploadCover).toHaveBeenCalledWith(file);
    expect(onUploaded).toHaveBeenCalled();
  });

  it("非 SVG 图标不上传并记录错误", async () => {
    const { result } = renderHook(() => useCategoryAssetUpload());
    const onUploaded = vi.fn();
    const file = new File(["png"], "icon.png", { type: "image/png" });
    const event = {
      target: { files: [file], value: "icon.png" },
    } as unknown as ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleIconFileChange(event, onUploaded);
    });

    expect(apiClient.categories.uploadIcon).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
    expect(result.current.uploadError).toBe("仅支持 SVG 格式图标");
  });

  it("上传失败时展示后端错误", async () => {
    vi.mocked(apiClient.categories.uploadCover).mockRejectedValue(new ApiError(400, "封面过大"));
    const { result } = renderHook(() => useCategoryAssetUpload());
    const onUploaded = vi.fn();
    const file = new File(["cover"], "cover.png", { type: "image/png" });
    const event = {
      target: { files: [file], value: "cover.png" },
    } as unknown as ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleCoverFileChange(event, onUploaded);
    });

    expect(onUploaded).not.toHaveBeenCalled();
    expect(result.current.uploadError).toBe("封面过大");
  });
});
