import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Pagination } from "./pagination";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

describe("Pagination", () => {
  it("渲染不崩溃", () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("navigation", { name: "分页导航" })).toBeTruthy();
  });

  it("移动端显示页码摘要", () => {
    render(<Pagination currentPage={3} totalPages={10} onPageChange={vi.fn()} />);
    expect(screen.getByTestId("pagination-mobile-summary").textContent).toContain("3");
    expect(screen.getByTestId("pagination-mobile-summary").textContent).toContain("10");
  });

  it("上一页按钮在第 1 页时 disabled", () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />);
    const prevBtn = screen.getByRole("button", { name: "上一页" });
    expect(prevBtn).toBeDisabled();
  });

  it("上一页按钮在非第 1 页时不 disabled", () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />);
    const prevBtn = screen.getByRole("button", { name: "上一页" });
    expect(prevBtn).not.toBeDisabled();
  });

  it("下一页按钮在最后一页时 disabled", () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />);
    const nextBtn = screen.getByRole("button", { name: "下一页" });
    expect(nextBtn).toBeDisabled();
  });

  it("下一页按钮在非最后一页时不 disabled", () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />);
    const nextBtn = screen.getByRole("button", { name: "下一页" });
    expect(nextBtn).not.toBeDisabled();
  });

  it("点击页码触发 onPageChange(页码)", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: "第 3 页" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("点击下一页触发 onPageChange(currentPage + 1)", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("点击上一页触发 onPageChange(currentPage - 1)", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={4} totalPages={5} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: "上一页" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("来回点击上一页/下一页，页码高亮与摘要保持同步", async () => {
    const user = userEvent.setup();

    function ControlledPagination() {
      const [page, setPage] = useState(5);
      return <Pagination currentPage={page} totalPages={10} onPageChange={setPage} />;
    }

    render(<ControlledPagination />);

    expect(screen.getByRole("button", { name: "第 5 页" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(screen.getByRole("button", { name: "第 6 页" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "第 5 页" })).not.toHaveAttribute("aria-current");

    await user.click(screen.getByRole("button", { name: "上一页" }));
    expect(screen.getByRole("button", { name: "第 5 页" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: "第 1 页" }));
    expect(screen.getByRole("button", { name: "第 1 页" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "上一页" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "第 10 页" }));
    expect(screen.getByRole("button", { name: "第 10 页" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "下一页" })).toBeDisabled();
  });

  it("总页数 ≤ 7 时显示全部页码", () => {
    render(<Pagination currentPage={1} totalPages={7} onPageChange={vi.fn()} />);
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByRole("button", { name: `第 ${i} 页` })).toBeTruthy();
    }
    expect(screen.queryByText("…")).toBeNull();
  });

  it("总页数 > 7 时出现省略号", () => {
    render(<Pagination currentPage={5} totalPages={10} onPageChange={vi.fn()} />);
    const ellipses = screen.getAllByText("…");
    expect(ellipses.length).toBeGreaterThan(0);
  });

  it("总页数 > 7 时始终显示第 1 页和最后一页", () => {
    render(<Pagination currentPage={5} totalPages={10} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "第 1 页" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "第 10 页" })).toBeTruthy();
  });

  it('当前页按钮具有 aria-current="page" 属性且不禁用', () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />);
    const currentBtn = screen.getByRole("button", { name: "第 3 页" });
    expect(currentBtn).toHaveAttribute("aria-current", "page");
    expect(currentBtn).not.toBeDisabled();
  });

  it("支持自定义 className", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={vi.fn()}
        className="my-custom-class"
      />,
    );
    const nav = screen.getByRole("navigation", { name: "分页导航" });
    expect(nav.className).toContain("my-custom-class");
  });
});
