import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BreadcrumbItem, Breadcrumbs } from "./breadcrumbs";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

describe("Breadcrumbs", () => {
  it("渲染导航地标与面包屑层级", () => {
    render(
      <Breadcrumbs aria-label="文章编辑导航">
        <BreadcrumbItem href="/articles">文章管理</BreadcrumbItem>
        <BreadcrumbItem>新建文章</BreadcrumbItem>
      </Breadcrumbs>,
    );

    expect(screen.getByRole("navigation", { name: "文章编辑导航" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "文章管理" })).toHaveAttribute("href", "/articles");
    expect(screen.getByText("新建文章")).toBeInTheDocument();
    expect(screen.getByTestId("icon-chevron-right")).toBeInTheDocument();
  });

  it("当前页不展示分隔符", () => {
    render(
      <Breadcrumbs>
        <BreadcrumbItem href="/articles">文章管理</BreadcrumbItem>
        <BreadcrumbItem>编辑文章</BreadcrumbItem>
      </Breadcrumbs>,
    );

    expect(screen.getAllByTestId("icon-chevron-right")).toHaveLength(1);
  });

  it("className 透传到 nav", () => {
    render(
      <Breadcrumbs className="custom-root">
        <BreadcrumbItem>当前页</BreadcrumbItem>
      </Breadcrumbs>,
    );

    expect(screen.getByRole("navigation")).toHaveClass("custom-root");
  });
});
