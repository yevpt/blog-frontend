import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ArticleListSearch } from "./ArticleListSearch";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  SvgSprite: () => null,
}));

describe("ArticleListSearch", () => {
  it("默认只显示搜索按钮，点击后展开输入框并聚焦", async () => {
    const user = userEvent.setup();
    render(<ArticleListSearch value="" onChange={vi.fn()} />);

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "展开搜索" }));

    const input = screen.getByRole("searchbox", { name: "搜索标题或摘要" });
    expect(input).toHaveFocus();
  });

  it("有值时直接保持展开但不自动聚焦，输入内容时调用 onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ArticleListSearch value="Vite" onChange={onChange} />);

    const input = screen.getByRole("searchbox", { name: "搜索标题或摘要" });
    expect(input).not.toHaveFocus();

    await user.type(input, " 管理后台");

    expect(onChange).toHaveBeenCalled();
  });

  it("空值输入框失焦后收起为搜索按钮", async () => {
    const user = userEvent.setup();
    render(<ArticleListSearch value="" onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "展开搜索" }));
    await user.tab();

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "展开搜索" })).toBeInTheDocument();
  });
});
