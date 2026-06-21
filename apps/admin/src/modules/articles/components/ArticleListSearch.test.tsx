import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ArticleListSearch } from "./ArticleListSearch";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  SvgSprite: () => null,
}));

describe("ArticleListSearch", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("默认只显示搜索按钮，点击后展开输入框并聚焦", async () => {
    const user = userEvent.setup();
    render(<ArticleListSearch value="" onChange={vi.fn()} />);

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "展开搜索" }));

    const input = screen.getByRole("searchbox", { name: "搜索标题或摘要" });
    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });

  it("有值时直接保持展开但不自动聚焦，输入内容停止后再提交 onChange", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<ArticleListSearch value="Vite" onChange={onChange} />);

    const input = screen.getByRole("searchbox", { name: "搜索标题或摘要" });
    expect(input).not.toHaveFocus();

    fireEvent.change(input, { target: { value: "Vite 管理后台" } });

    expect(input).toHaveValue("Vite 管理后台");
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onChange).toHaveBeenCalledWith("Vite 管理后台");
  });

  it("有值搜索框失焦后点击输入框壳层仍能聚焦输入", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ArticleListSearch value="Vite" onChange={vi.fn()} />
        <button type="button">外部按钮</button>
      </>,
    );

    const input = screen.getByRole("searchbox", { name: "搜索标题或摘要" });
    const inputFrame = input.parentElement;
    expect(inputFrame).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "外部按钮" }));
    expect(input).not.toHaveFocus();

    await user.click(inputFrame as HTMLElement);

    expect(input).toHaveFocus();
  });

  it("空值输入框失焦后收起为搜索按钮", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ArticleListSearch value="" onChange={vi.fn()} />
        <button type="button">外部按钮</button>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "展开搜索" }));
    await user.tab();

    await waitFor(() => {
      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "展开搜索" })).toBeInTheDocument();
  });
});
