import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarSectionHeader } from "./sidebar-section-header";

describe("SidebarSectionHeader", () => {
  it("渲染标题", () => {
    render(<SidebarSectionHeader title="最近来访" />);
    expect(screen.getByRole("heading", { level: 3, name: "最近来访" })).toBeInTheDocument();
  });

  it("有 action 时渲染右侧动作槽", () => {
    render(<SidebarSectionHeader title="碎语" action={<button type="button">换一批</button>} />);
    expect(screen.getByRole("heading", { level: 3, name: "碎语" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "换一批" })).toBeInTheDocument();
  });

  it("无 action 时不渲染动作槽", () => {
    render(<SidebarSectionHeader title="标签" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
