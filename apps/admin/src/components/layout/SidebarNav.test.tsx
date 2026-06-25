import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SidebarNav } from "./SidebarNav";
import { adminNavItems } from "../../config/modules";

describe("SidebarNav", () => {
  it("渲染全部后台菜单项", () => {
    render(
      <MemoryRouter>
        <SidebarNav isCollapsed={false} />
      </MemoryRouter>,
    );

    for (const item of adminNavItems) {
      expect(screen.getByRole("link", { name: item.label })).toBeInTheDocument();
    }
  });

  it("根据当前路由标记激活菜单", () => {
    render(
      <MemoryRouter initialEntries={["/tags"]}>
        <SidebarNav isCollapsed={false} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "标签" })).toHaveClass("bg-foreground");
    expect(screen.getByRole("link", { name: "概览" })).not.toHaveClass("bg-foreground");
  });
});
