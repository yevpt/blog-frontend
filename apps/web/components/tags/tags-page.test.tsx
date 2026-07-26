import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { TagItemResp } from "@repo/api";
import { TagsPage } from "./tags-page";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@repo/ui", () => ({
  cn: (...classes: (string | undefined | false | null)[]) => classes.filter(Boolean).join(" "),
  FadeInUp: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToastQueue: class {
    add() {}
  },
}));

const tags: TagItemResp[] = [
  { id: 1, name: "Go", seq: 0, article_count: 3 },
  { id: 2, name: "React", seq: 1, article_count: 25 },
  { id: 3, name: "随笔", seq: 2, article_count: 8 },
  { id: 4, name: "空标签", seq: 3, article_count: 0 },
];

describe("TagsPage", () => {
  it("渲染页头与统计", () => {
    render(<TagsPage tags={tags} />);
    expect(screen.getByRole("heading", { level: 1, name: "文章标签" })).toBeTruthy();
    expect(screen.getByText("共 3 个标签")).toBeTruthy();
  });

  it("过滤无文章的标签", () => {
    render(<TagsPage tags={tags} />);
    expect(screen.getByText("Go")).toBeTruthy();
    expect(screen.queryByText("空标签")).toBeNull();
  });

  it("按文章数降序排列", () => {
    render(<TagsPage tags={tags} />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["React25", "随笔8", "Go3"]);
  });

  it("每个标签链接到详情页", () => {
    render(<TagsPage tags={tags} />);
    expect(screen.getByRole("link", { name: /React/ }).getAttribute("href")).toBe("/tags/2");
  });

  it("标签 chip 尺寸统一", () => {
    render(<TagsPage tags={tags} />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("text-sm");
      expect(link.className).toContain("px-3.5");
    }
  });

  it("空列表时渲染空态且不显示统计", () => {
    render(<TagsPage tags={[]} />);
    expect(screen.getByText("还没有公开标签，敬请期待。")).toBeTruthy();
    expect(screen.queryByText(/个标签/)).toBeNull();
  });
});
