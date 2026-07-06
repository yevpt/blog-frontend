import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryVisualAssetsEditor } from "./CategoryVisualAssetsEditor";
import { createCategoryAssetFromUrl } from "../model";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("./CategoryIconPreview", () => ({
  CategoryIconPreview: ({ alt }: { alt: string }) => <img src="preview.svg" alt={alt} />,
}));

describe("CategoryVisualAssetsEditor", () => {
  it("展示可选素材编辑区", () => {
    render(
      <CategoryVisualAssetsEditor
        icon={{ submitValue: "", previewUrl: "" }}
        cover={{ submitValue: "", previewUrl: "" }}
        isIconUploading={false}
        isCoverUploading={false}
        uploadError={null}
        onIconPick={vi.fn()}
        onCoverPick={vi.fn()}
        onIconRemove={vi.fn()}
        onCoverRemove={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("视觉素材配置")).toBeInTheDocument();
    expect(screen.getAllByText("可选")).toHaveLength(2);
    expect(screen.getByText("SVG，最大 256 KB")).toBeInTheDocument();
  });

  it("图标操作钮在预览框下方横排展示", () => {
    render(
      <CategoryVisualAssetsEditor
        icon={createCategoryAssetFromUrl("https://cdn.example.com/icon.svg")}
        cover={{ submitValue: "", previewUrl: "" }}
        isIconUploading={false}
        isCoverUploading={false}
        uploadError={null}
        onIconPick={vi.fn()}
        onCoverPick={vi.fn()}
        onIconRemove={vi.fn()}
        onCoverRemove={vi.fn()}
      />,
    );

    const replaceButtons = screen.getAllByRole("button", { name: "更换" });
    expect(replaceButtons).toHaveLength(1);
    expect(replaceButtons[0]?.closest(".absolute")).toBeNull();
  });

  it("已有预览时展示更换与移除", async () => {
    const onIconRemove = vi.fn();
    render(
      <CategoryVisualAssetsEditor
        icon={createCategoryAssetFromUrl("https://cdn.example.com/icon.svg")}
        cover={{ submitValue: "", previewUrl: "" }}
        isIconUploading={false}
        isCoverUploading={false}
        uploadError={null}
        onIconPick={vi.fn()}
        onCoverPick={vi.fn()}
        onIconRemove={onIconRemove}
        onCoverRemove={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "移除" }));
    expect(onIconRemove).toHaveBeenCalledTimes(1);
  });

  it("展示上传错误", () => {
    render(
      <CategoryVisualAssetsEditor
        icon={{ submitValue: "", previewUrl: "" }}
        cover={{ submitValue: "", previewUrl: "" }}
        isIconUploading={false}
        isCoverUploading={false}
        uploadError="图标上传失败"
        onIconPick={vi.fn()}
        onCoverPick={vi.fn()}
        onIconRemove={vi.fn()}
        onCoverRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("图标上传失败")).toBeInTheDocument();
  });
});
