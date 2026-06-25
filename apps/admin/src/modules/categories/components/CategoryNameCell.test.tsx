import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryNameCell } from "./CategoryNameCell";
import type { CategoryRow } from "../model";

const category: CategoryRow = {
  id: "1",
  name: "文学",
  seq: 0,
  articleCount: 10,
};

describe("CategoryNameCell", () => {
  it("渲染分类名称", () => {
    render(<CategoryNameCell category={category} />);
    expect(screen.getByText("文学")).toBeInTheDocument();
  });

  it("有图标时渲染预览图", () => {
    const { container } = render(
      <CategoryNameCell category={{ ...category, icon: "https://cdn.example.com/icon.svg" }} />,
    );
    expect(container.querySelector("img")).toBeTruthy();
  });
});
