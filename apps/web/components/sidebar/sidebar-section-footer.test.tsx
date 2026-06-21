import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { SidebarSectionFooter, SidebarFooterButton } from "./sidebar-section-footer";

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  Button: ({
    children,
    className,
    variant,
    size,
    onPress,
    href,
    ...props
  }: {
    children: ReactNode;
    className?: string;
    variant?: string;
    size?: string;
    onPress?: () => void;
    href?: string;
    [key: string]: unknown;
  }) =>
    href !== undefined ? (
      <a href={href} className={className} data-variant={variant} data-size={size} {...props}>
        {children}
      </a>
    ) : (
      <button
        type="button"
        className={className}
        data-variant={variant}
        data-size={size}
        onClick={onPress}
        {...props}
      >
        {children}
      </button>
    ),
}));

describe("SidebarSectionFooter", () => {
  it("渲染子节点于横向容器", () => {
    render(
      <SidebarSectionFooter>
        <span>左</span>
        <span>右</span>
      </SidebarSectionFooter>,
    );
    expect(screen.getByText("左")).toBeTruthy();
    expect(screen.getByText("右")).toBeTruthy();
  });
});

describe("SidebarFooterButton", () => {
  it("tone=primary 使用淡主色底样式且等宽", () => {
    render(<SidebarFooterButton tone="primary">发表</SidebarFooterButton>);
    const cls = screen.getByRole("button", { name: "发表" }).className;
    expect(cls).toContain("flex-1");
    expect(cls).toContain("bg-primary/10");
    expect(cls).toContain("text-primary");
  });

  it("tone=ghost 使用透明描边样式且等宽", () => {
    render(<SidebarFooterButton tone="ghost">查看更多</SidebarFooterButton>);
    const cls = screen.getByRole("button", { name: "查看更多" }).className;
    expect(cls).toContain("flex-1");
    expect(cls).toContain("border-border");
  });

  it("点击触发 onPress", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(
      <SidebarFooterButton tone="primary" onPress={onPress}>
        发表
      </SidebarFooterButton>,
    );
    await user.click(screen.getByRole("button", { name: "发表" }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("传 href 时渲染为链接", () => {
    render(
      <SidebarFooterButton tone="ghost" href="/snippets">
        查看更多
      </SidebarFooterButton>,
    );
    const link = screen.getByRole("link", { name: "查看更多" });
    expect(link.getAttribute("href")).toBe("/snippets");
  });

  it("透传自定义 className", () => {
    render(
      <SidebarFooterButton tone="primary" className="custom-x">
        发表
      </SidebarFooterButton>,
    );
    expect(screen.getByRole("button", { name: "发表" }).className).toContain("custom-x");
  });
});
