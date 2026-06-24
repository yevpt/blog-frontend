import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  SvgSprite: () => null,
}));
vi.mock("../avatar/avatar", () => ({
  Avatar: ({ alt }: { alt?: string }) => <span data-testid="avatar">{alt}</span>,
}));
vi.mock("../input/label", () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));
vi.mock("../input/hint-text", () => ({
  HintText: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import { Select } from "./select";

const items = [
  { id: "1", label: "苹果" },
  { id: "2", label: "香蕉" },
  { id: "3", label: "橙子" },
];

describe("Select", () => {
  it("渲染 placeholder", () => {
    render(
      <Select aria-label="水果" placeholder="请选择水果">
        {items.map((item) => (
          <Select.Item key={item.id} id={item.id} label={item.label} />
        ))}
      </Select>,
    );
    expect(screen.getByText("请选择水果")).toBeTruthy();
  });

  it("含 chevron-down 图标", () => {
    render(
      <Select aria-label="水果">
        <Select.Item id="1" label="苹果" />
      </Select>,
    );
    expect(screen.getByTestId("icon-chevron-down")).toBeTruthy();
  });

  it("Select 按钮具有正确的 aria-label", () => {
    render(
      <Select aria-label="水果">
        {items.map((item) => (
          <Select.Item key={item.id} id={item.id} label={item.label} />
        ))}
      </Select>,
    );
    // react-aria Select 渲染为 button，并继承 aria-label
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("disabled 状态渲染不崩溃", () => {
    render(
      <Select aria-label="水果" isDisabled>
        {items.map((item) => (
          <Select.Item key={item.id} id={item.id} label={item.label} />
        ))}
      </Select>,
    );
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("Select.ComboBox 渲染搜索框与 chevron", () => {
    render(
      <Select.ComboBox aria-label="搜索水果">
        {items.map((item) => (
          <Select.Item key={item.id} id={item.id} label={item.label} />
        ))}
      </Select.ComboBox>,
    );
    expect(screen.getByRole("combobox")).toBeTruthy();
    expect(screen.getByTestId("icon-search")).toBeTruthy();
    expect(screen.getByTestId("icon-chevron-down")).toBeTruthy();
  });

  it("Select.ComboBox 触发器使用 compact 细边框样式", () => {
    render(
      <Select.ComboBox aria-label="搜索水果" size="sm">
        {items.map((item) => (
          <Select.Item key={item.id} id={item.id} label={item.label} />
        ))}
      </Select.ComboBox>,
    );
    const combobox = screen.getByRole("combobox");
    expect(combobox.parentElement).toHaveClass("border-input");
  });

  it("默认 compact variant 使用细边框触发器样式", () => {
    render(
      <Select aria-label="水果">
        <Select.Item id="1" label="苹果" />
      </Select>,
    );
    expect(screen.getByRole("button")).toHaveClass("border-input");
  });

  it("soft variant 使用 muted 填充触发器样式", () => {
    render(
      <Select aria-label="水果" variant="soft">
        <Select.Item id="1" label="苹果" />
      </Select>,
    );
    expect(screen.getByRole("button")).toHaveClass("bg-muted/50");
  });

  it("minimal variant 使用无框自适应宽度触发器", () => {
    render(
      <Select aria-label="语言" variant="minimal" size="sm">
        <Select.Item id="plaintext" label="Plain Text" />
      </Select>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-transparent", "border-0", "w-auto");
    expect(button).not.toHaveClass("w-full");
  });

  it("展开时 chevron 旋转", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(
      <Select aria-label="水果">
        {items.map((item) => (
          <Select.Item key={item.id} id={item.id} label={item.label} />
        ))}
      </Select>,
    );
    const chevron = screen.getByTestId("icon-chevron-down").parentElement;
    expect(chevron).toHaveAttribute("data-open", "false");
    await user.click(screen.getByRole("button"));
    expect(chevron).toHaveAttribute("data-open", "true");
  });
});
