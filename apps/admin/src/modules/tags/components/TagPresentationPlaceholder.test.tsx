import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TagPresentationPlaceholder } from "./TagPresentationPlaceholder";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe("TagPresentationPlaceholder", () => {
  it("展示开发中说明", () => {
    render(<TagPresentationPlaceholder />);

    expect(screen.getByText(/图标、封面与描述尚未开放配置/)).toBeInTheDocument();
    expect(screen.getByText("标签图标")).toBeInTheDocument();
    expect(screen.getByText("标签封面")).toBeInTheDocument();
    expect(screen.getByText("暂无描述 · 暂不可编辑")).toBeInTheDocument();
  });

  it("有历史数据时展示提示与描述", () => {
    render(
      <TagPresentationPlaceholder
        iconUrl="https://cdn.example.com/icon.svg"
        coverUrl="https://cdn.example.com/cover.jpg"
        description="Go 语言相关内容"
      />,
    );

    expect(screen.getByText(/已有历史数据，待功能完善后可编辑/)).toBeInTheDocument();
    expect(screen.getByText("Go 语言相关内容")).toBeInTheDocument();
  });
});
