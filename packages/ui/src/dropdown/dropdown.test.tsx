import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  SvgSprite: () => null,
}));

vi.mock("../avatar/avatar", () => ({
  Avatar: ({ alt }: { alt?: string }) => <span data-testid="avatar">{alt}</span>,
}));

import { Dropdown } from "./dropdown";

describe("Dropdown", () => {
  it("渲染触发器不崩溃", () => {
    render(
      <Dropdown.Root>
        <button>打开菜单</button>
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="菜单">
            <Dropdown.Item label="选项一" id="1" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    expect(screen.getByRole("button", { name: "打开菜单" })).toBeTruthy();
  });

  it("点击触发器后显示菜单项", async () => {
    // react-aria MenuTrigger 需要使用 AriaButton 作为触发器
    // 使用 DotsButton（基于 AriaButton）确保事件系统正常工作
    const user = userEvent.setup();
    render(
      <Dropdown.Root>
        <Dropdown.DotsButton aria-label="打开菜单" />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="菜单">
            <Dropdown.Item label="选项一" id="1" />
            <Dropdown.Item label="选项二" id="2" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    await user.click(screen.getByRole("button", { name: "打开菜单" }));
    expect(await screen.findByText("选项一")).toBeTruthy();
    expect(await screen.findByText("选项二")).toBeTruthy();
  });

  it("点击菜单项触发 onAction", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <Dropdown.Root>
        <Dropdown.DotsButton aria-label="打开菜单" />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="菜单" onAction={onAction}>
            <Dropdown.Item label="选项一" id="action-1" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    await user.click(screen.getByRole("button", { name: "打开菜单" }));
    await user.click(await screen.findByText("选项一"));
    expect(onAction).toHaveBeenCalledWith("action-1");
  });

  it("Dropdown.DotsButton 渲染三点图标", () => {
    render(
      <Dropdown.Root>
        <Dropdown.DotsButton />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="菜单">
            <Dropdown.Item label="删除" id="delete" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    expect(screen.getByTestId("icon-dots-vertical")).toBeTruthy();
  });
});
