import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryFormDialog } from "./CategoryFormDialog";
import { apiClient } from "../../../lib/api";
import type { CategoryAssetUploadResp } from "@repo/api";

const brokenSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path xmlns="http://www.w3.org/2000/svg" fill="currentColor" d="M6 19"/></svg>`;

const prepareImageForUploadMock = vi.fn();

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

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

const sampleCategory = {
  id: "1",
  name: "编程",
  url: "programming",
  icon: "https://cdn.example.com/icon.svg",
  description: "编程学习与工程实践",
  coverImgUrl: "https://cdn.example.com/cover.jpg",
  seq: 0,
  articleCount: 12,
};

describe("CategoryFormDialog", () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

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

  it("新建模式展示默认排序", () => {
    render(
      <CategoryFormDialog
        mode="create"
        open
        category={null}
        nextSeq={3}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
  });

  it("三项全空且填写名称后仍可创建", async () => {
    const user = userEvent.setup();
    render(
      <CategoryFormDialog
        mode="create"
        open
        category={null}
        nextSeq={0}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByPlaceholderText("例如：编程"), "新分类");
    await user.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const [values] = onSubmit.mock.calls[0]!;
    expect(values.description).toBe("");
    expect(values.icon.submitValue).toBe("");
    expect(values.coverImgUrl.submitValue).toBe("");
  });

  it("图标上传成功后预览并提交 key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(brokenSvg),
      }),
    );

    const user = userEvent.setup();
    render(
      <CategoryFormDialog
        mode="create"
        open
        category={null}
        nextSeq={0}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    const file = new File(["<svg></svg>"], "icon.svg", { type: "image/svg+xml" });
    await user.upload(screen.getByLabelText("上传分类图标"), file);
    await user.type(screen.getByPlaceholderText("例如：编程"), "新分类");
    await user.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(apiClient.categories.uploadIcon).toHaveBeenCalledWith(file);
      expect(onSubmit).toHaveBeenCalled();
    });
    const [values] = onSubmit.mock.calls[0]!;
    expect(values.icon.submitValue).toBe("tmp/icon.svg");
    await waitFor(() => {
      expect(screen.getByAltText("分类图标预览")).toHaveAttribute(
        "src",
        expect.stringMatching(/^data:image\/svg\+xml/),
      );
    });
  });

  it("封面上传调用文章场景预处理", async () => {
    const user = userEvent.setup();
    render(
      <CategoryFormDialog
        mode="create"
        open
        category={null}
        nextSeq={0}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    const file = new File(["cover"], "cover.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("上传分类封面"), file);

    expect(prepareImageForUploadMock).toHaveBeenCalledWith(file, "article");
    await waitFor(() => {
      expect(apiClient.categories.uploadCover).toHaveBeenCalled();
    });
  });

  it("编辑模式回显已有素材", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(brokenSvg),
      }),
    );

    render(
      <CategoryFormDialog
        mode="edit"
        open
        category={sampleCategory}
        nextSeq={0}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    await waitFor(() => {
      expect(screen.getByAltText("分类图标预览")).toHaveAttribute(
        "src",
        expect.stringMatching(/^data:image\/svg\+xml/),
      );
    });
    expect(screen.getByAltText("分类封面预览")).toHaveAttribute(
      "src",
      "https://cdn.example.com/cover.jpg",
    );
  });

  it("上传中禁用保存", async () => {
    const user = userEvent.setup();
    let resolveUpload: ((value: CategoryAssetUploadResp) => void) | undefined;
    vi.mocked(apiClient.categories.uploadIcon).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );

    render(
      <CategoryFormDialog
        mode="create"
        open
        category={null}
        nextSeq={0}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    const file = new File(["<svg></svg>"], "icon.svg", { type: "image/svg+xml" });
    void user.upload(screen.getByLabelText("上传分类图标"), file);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "创建" })).toBeDisabled();
    });

    resolveUpload?.({
      key: "tmp/icon.svg",
      url: "https://cdn.example.com/tmp/icon.svg",
      size: 128,
      mime: "image/svg+xml",
    });
  });

  it("缺少名称时不提交", async () => {
    const user = userEvent.setup();
    render(
      <CategoryFormDialog
        mode="create"
        open
        category={null}
        nextSeq={0}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "创建" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("请输入分类名称")).toBeInTheDocument();
  });
});
