import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryVisualAssetsPlaceholder } from "./CategoryVisualAssetsPlaceholder";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe("CategoryVisualAssetsPlaceholder", () => {
  it("展示开发中说明", () => {
    render(<CategoryVisualAssetsPlaceholder />);

    expect(screen.getByLabelText("视觉素材配置")).toBeInTheDocument();
    expect(screen.getByText("开发中")).toBeInTheDocument();
    expect(screen.getByText("分类图标")).toBeInTheDocument();
    expect(screen.getByText("分类封面")).toBeInTheDocument();
  });

  it("有历史素材时展示提示", () => {
    render(
      <CategoryVisualAssetsPlaceholder
        iconUrl="https://cdn.example.com/icon.svg"
        coverUrl="https://cdn.example.com/cover.jpg"
      />,
    );

    expect(screen.getByText(/已有历史素材，待后端支持后可编辑/)).toBeInTheDocument();
  });
});
