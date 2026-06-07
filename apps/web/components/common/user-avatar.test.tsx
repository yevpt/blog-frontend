import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserAvatar } from "./user-avatar";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
    onError,
  }: {
    src: string;
    alt: string;
    className?: string;
    onError?: () => void;
  }) => <img src={src} alt={alt} className={className} onError={onError} />,
}));

describe("UserAvatar", () => {
  it("有 src 时渲染 img 元素", () => {
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" />);
    const img = screen.getByRole("img", { name: "Alice" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/a.jpg");
  });

  it("无 src 时渲染首字母大写", () => {
    render(<UserAvatar name="bob" />);
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("img 加载失败时回退到首字母", () => {
    render(<UserAvatar src="https://broken.url/img.jpg" name="Charlie" />);
    fireEvent.error(screen.getByRole("img", { name: "Charlie" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("name 为空字符串时显示 ?", () => {
    render(<UserAvatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("size=xs 应用 h-5 w-5", () => {
    const { container } = render(<UserAvatar name="D" size="xs" />);
    expect(container.firstChild).toHaveClass("h-5");
    expect(container.firstChild).toHaveClass("w-5");
  });

  it("size=md 应用 h-7 w-7（默认）", () => {
    const { container } = render(<UserAvatar name="D" />);
    expect(container.firstChild).toHaveClass("h-7");
    expect(container.firstChild).toHaveClass("w-7");
  });
});
