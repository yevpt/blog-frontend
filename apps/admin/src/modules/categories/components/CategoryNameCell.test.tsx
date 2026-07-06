import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CategoryNameCell } from "./CategoryNameCell";
import type { CategoryRow } from "../model";

const brokenSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path xmlns="http://www.w3.org/2000/svg" fill="currentColor" d="M6 19"/></svg>`;

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

  it("有图标时渲染预览图", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(brokenSvg),
      }),
    );

    const { container } = render(
      <CategoryNameCell category={{ ...category, icon: "https://cdn.example.com/icon.svg" }} />,
    );

    await waitFor(() => {
      expect(container.querySelector("img")).toBeTruthy();
    });
  });
});
