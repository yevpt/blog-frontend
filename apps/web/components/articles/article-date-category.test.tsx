import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleDateCategory } from "./article-date-category";

describe("ArticleDateCategory", () => {
  it("渲染日期文本", () => {
    render(<ArticleDateCategory dateTime="2026-06-01T00:00:00Z" formattedDate="2026/06/01" />);
    expect(screen.getByText("2026/06/01")).toBeInTheDocument();
  });

  it("time 元素的 dateTime 属性与传入一致", () => {
    render(<ArticleDateCategory dateTime="2026-06-01T00:00:00Z" formattedDate="2026/06/01" />);
    expect(screen.getByRole("time")).toHaveAttribute("dateTime", "2026-06-01T00:00:00Z");
  });

  it("无 category 时不渲染分类名", () => {
    const { container } = render(
      <ArticleDateCategory dateTime="2026-06-01T00:00:00Z" formattedDate="2026/06/01" />,
    );
    // 只有 time 元素，没有额外的 span
    expect(container.querySelectorAll("span")).toHaveLength(0);
  });

  it("有 category 时渲染分类名称", () => {
    render(
      <ArticleDateCategory
        dateTime="2026-06-01T00:00:00Z"
        formattedDate="2026/06/01"
        category="技术"
      />,
    );
    expect(screen.getByText("技术")).toBeInTheDocument();
  });

  it("className 被合并到容器", () => {
    const { container } = render(
      <ArticleDateCategory
        dateTime="2026-06-01T00:00:00Z"
        formattedDate="2026/06/01"
        className="custom-class"
      />,
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
