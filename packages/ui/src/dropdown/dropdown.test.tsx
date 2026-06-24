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
        <Dropdown.DotsButton aria-label="打开菜单" />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="菜单">
            <Dropdown.Item label="选项一" id="1" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    // DotsButton 默认 aria-label 为 "Open menu"，测试名称兼容
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

  it("Dropdown.DotsButton 支持 icon 切换为横向三点", () => {
    render(
      <Dropdown.Root>
        <Dropdown.DotsButton icon="dots-horizontal" aria-label="打开菜单" />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="菜单">
            <Dropdown.Item label="删除" id="delete" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    expect(screen.getByTestId("icon-dots-horizontal")).toBeTruthy();
  });

  it("菜单项使用紧凑精致内层样式", async () => {
    const user = userEvent.setup();
    render(
      <Dropdown.Root>
        <Dropdown.DotsButton aria-label="打开菜单" />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="菜单">
            <Dropdown.Item label="选项一" id="1" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    await user.click(screen.getByRole("button", { name: "打开菜单" }));
    const item = await screen.findByRole("menuitem", { name: "选项一" });
    const inner = item.firstElementChild as HTMLElement;
    expect(inner.className).toContain("font-medium");
    expect(inner.className).toContain("py-1.5");
  });

  it("Dropdown.DotsButton variant=ghost 使用圆形 hover 背景样式", () => {
    render(
      <Dropdown.Root>
        <Dropdown.DotsButton variant="ghost" aria-label="打开菜单" />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="菜单">
            <Dropdown.Item label="删除" id="delete" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    const button = screen.getByRole("button", { name: "打开菜单" });
    // ghost 变体走圆形背景路径，并借 aria-expanded 在菜单打开时保持高亮
    expect(button.className).toContain("rounded-full");
    expect(button.className).toContain("aria-expanded:bg-accent");
  });

  it("danger 菜单项使用危险样式文案", async () => {
    const user = userEvent.setup();
    render(
      <Dropdown.Root>
        <Dropdown.DotsButton aria-label="打开菜单" />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="菜单">
            <Dropdown.Item label="删除" id="delete" danger />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    await user.click(screen.getByRole("button", { name: "打开菜单" }));
    const item = await screen.findByText("删除");
    expect(item.className).toContain("text-destructive");
  });

  it("unstyled 菜单项保留自定义内容和可访问名称", async () => {
    const user = userEvent.setup();
    render(
      <Dropdown.Root>
        <Dropdown.DotsButton aria-label="打开菜单" />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="菜单" selectionMode="single" selectedKeys={new Set(["draft"])}>
            <Dropdown.Item unstyled id="draft" textValue="草稿">
              {({ isSelected }) => (
                <>
                  <span>{isSelected ? "已选" : "未选"}</span>
                  <span>草稿</span>
                </>
              )}
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );

    await user.click(screen.getByRole("button", { name: "打开菜单" }));

    expect(await screen.findByRole("menuitemradio", { name: "已选 草稿" })).toBeTruthy();
  });

  it("description 渲染次级文案且并入可访问名称", async () => {
    const user = userEvent.setup();
    render(
      <Dropdown.Root>
        <Dropdown.DotsButton aria-label="打开菜单" />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="菜单">
            <Dropdown.Item label="复制" description="复制选中文本" id="copy" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    await user.click(screen.getByRole("button", { name: "打开菜单" }));

    expect(await screen.findByText("复制选中文本")).toBeTruthy();
    // label slot 作为主名，description slot 作为描述，二者都进入无障碍信息
    expect(await screen.findByRole("menuitem", { name: "复制" })).toBeTruthy();
  });

  it("SubmenuTrigger 展开子菜单并渲染子项", async () => {
    const user = userEvent.setup();
    render(
      <Dropdown.Root>
        <Dropdown.DotsButton aria-label="打开菜单" />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="菜单">
            <Dropdown.SubmenuTrigger>
              <Dropdown.Item label="分享" id="share" />
              <Dropdown.Menu aria-label="分享方式">
                <Dropdown.Item label="邮件" id="email" />
                <Dropdown.Item label="短信" id="sms" />
              </Dropdown.Menu>
            </Dropdown.SubmenuTrigger>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    await user.click(screen.getByRole("button", { name: "打开菜单" }));

    const trigger = await screen.findByRole("menuitem", { name: "分享" });
    // 触发项带有子菜单语义
    expect(trigger.getAttribute("aria-haspopup")).toBeTruthy();

    await user.click(trigger);
    expect(await screen.findByText("邮件")).toBeTruthy();
    expect(await screen.findByText("短信")).toBeTruthy();
  });

  it("Keyboard 渲染为 kbd 元素", async () => {
    const user = userEvent.setup();
    render(
      <Dropdown.Root>
        <Dropdown.DotsButton aria-label="打开菜单" />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="菜单">
            <Dropdown.Item id="copy" textValue="复制">
              复制
              <Dropdown.Keyboard>⌘C</Dropdown.Keyboard>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    await user.click(screen.getByRole("button", { name: "打开菜单" }));

    const kbd = await screen.findByText("⌘C");
    expect(kbd.tagName.toLowerCase()).toBe("kbd");
  });
});
