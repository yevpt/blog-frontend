import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchField } from "./search-field";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe("SearchField", () => {
  it("渲染不崩溃", () => {
    render(<SearchField placeholder="搜索文章" />);
    expect(screen.getByRole("searchbox", { name: "搜索文章" })).toBeTruthy();
  });

  it("label 渲染", () => {
    render(<SearchField label="站内搜索" placeholder="搜索文章" />);
    expect(screen.getByText("站内搜索")).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "站内搜索" })).toBeTruthy();
  });

  it("onChange 返回 string 值", () => {
    const onChange = vi.fn();
    render(<SearchField placeholder="搜索文章" onChange={onChange} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "React" } });

    expect(onChange).toHaveBeenCalledWith("React");
  });

  it("点击清除按钮清空输入并触发 onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchField placeholder="搜索文章" defaultValue="React" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "清除搜索" }));

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("点击输入框壳层时聚焦搜索输入", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SearchField placeholder="搜索文章" defaultValue="React" />
        <button type="button">外部按钮</button>
      </>,
    );

    const input = screen.getByRole("searchbox", { name: "搜索文章" });
    const inputFrame = input.parentElement;
    expect(inputFrame).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "外部按钮" }));
    await user.click(inputFrame as HTMLElement);

    expect(input).toHaveFocus();
  });

  it("显示搜索和清除图标", () => {
    render(<SearchField placeholder="搜索文章" defaultValue="React" />);
    expect(screen.getByTestId("icon-search")).toBeTruthy();
    expect(screen.getByTestId("icon-close")).toBeTruthy();
  });

  it("groupClassName 透传到输入框外壳并能覆盖默认样式", () => {
    render(<SearchField placeholder="搜索文章" groupClassName="rounded-full custom-group" />);

    const group = screen.getByRole("searchbox").parentElement;
    expect(group).not.toBeNull();
    expect(group).toHaveClass("custom-group", "rounded-full");
    // tailwind-merge 应去掉与 rounded-full 冲突的默认 rounded-md
    expect(group).not.toHaveClass("rounded-md");
  });

  it("clearButtonClassName 透传到清除按钮", () => {
    render(
      <SearchField
        placeholder="搜索文章"
        defaultValue="React"
        clearButtonClassName="ghost-clear-button"
      />,
    );

    expect(screen.getByRole("button", { name: "清除搜索" })).toHaveClass("ghost-clear-button");
  });

  it("compact 模式内部 16px，通过 origin-top-right scale 对齐 h-7 视觉槽位", () => {
    render(<SearchField placeholder="搜索文章" compact />);

    const input = screen.getByRole("searchbox", { name: "搜索文章" });
    const scaleShell = input.closest(".origin-top-right");
    const visualSlot = scaleShell?.parentElement;

    expect(input).toHaveClass("text-base");
    expect(input).not.toHaveAttribute("data-compact-input");
    expect(scaleShell).toHaveClass(
      "scale-[0.75]",
      "origin-top-right",
      "h-[2.333rem]",
      "w-[133.333%]",
    );
    expect(visualSlot).toHaveClass("h-7");
  });
});
