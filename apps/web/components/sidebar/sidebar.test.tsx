import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { RecentVisitors } from "./recent-visitors";
import { TagsCloud } from "./tags-cloud";
import type { Visitor, Tag } from "../../app/_mock/types";

// Mock @repo/hooks useLocale
vi.mock("@repo/hooks", () => ({
  useLocale: () => ({
    locale: "zh",
    setLocale: () => undefined,
    t: (key: string) => {
      const messages: Record<string, string> = {
        "sidebar.recentVisitors": "最近来访",
        "sidebar.joinQQ": "入驻 QQ 群",
        "sidebar.viewMore": "查看更多",
        "sidebar.tags": "标签",
      };
      return messages[key] ?? key;
    },
  }),
}));

// Mock @repo/icons
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

// Mock @repo/ui（Button + TagGroup 系列）
vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  Button: ({
    children,
    variant,
    href,
    ...props
  }: {
    children: ReactNode;
    variant?: string;
    href?: string;
    [key: string]: unknown;
  }) =>
    href !== undefined ? (
      <a href={href} data-variant={variant} {...props}>
        {children}
      </a>
    ) : (
      <button data-variant={variant} {...props}>
        {children}
      </button>
    ),
  TagGroup: ({
    children,
    label,
  }: {
    children: ReactNode;
    label?: string;
    selectionMode?: string;
    [key: string]: unknown;
  }) => (
    <div>
      {label && <span>{label}</span>}
      {children}
    </div>
  ),
  TagList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TagItem: ({
    children,
    count,
    id,
  }: {
    children: ReactNode;
    count?: number;
    id?: string;
    [key: string]: unknown;
  }) => (
    <button data-id={id}>
      {children}
      {count !== undefined && <span data-testid="tag-count">{count}</span>}
    </button>
  ),
}));

// 生成测试用 Visitor 数据
function makeVisitor(id: string): Visitor {
  return {
    id,
    name: `访客${id}`,
    avatar: `https://example.com/avatar${id}.jpg`,
    isOnline: id === "1",
    visitedAt: id === "1" ? new Date() : new Date("2026-05-30T10:00:00"),
  };
}

// 生成 9 个测试访客
const mockVisitors: Visitor[] = Array.from({ length: 9 }, (_, i) => makeVisitor(String(i + 1)));

// 生成测试用 Tag 数据
function makeTag(id: string, name: string): Tag {
  return {
    id,
    name,
    icon: "tag",
    count: Number(id) * 3,
  };
}

const mockTags: Tag[] = [
  makeTag("1", "React"),
  makeTag("2", "TypeScript"),
  makeTag("3", "Next.js"),
];

describe("RecentVisitors", () => {
  it("渲染不崩溃，显示 9 个头像", () => {
    render(<RecentVisitors visitors={mockVisitors} />);
    // 每个访客都有对应 img alt
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(9);
  });

  it("访客少于 9 人时显示实际数量", () => {
    const fewVisitors = mockVisitors.slice(0, 5);
    render(<RecentVisitors visitors={fewVisitors} />);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(5);
  });

  it("访客超过 9 人时只显示 9 个头像", () => {
    const manyVisitors = [...mockVisitors, makeVisitor("10"), makeVisitor("11")];
    render(<RecentVisitors visitors={manyVisitors} />);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(9);
  });

  it("显示区块标题", () => {
    render(<RecentVisitors visitors={mockVisitors} />);
    expect(screen.getByRole("heading", { level: 3, name: "最近来访" })).toBeInTheDocument();
  });

  it("底部渲染入驻 QQ 群（主操作）与查看更多（次操作）", () => {
    render(<RecentVisitors visitors={mockVisitors} />);
    expect(screen.getByRole("button", { name: /入驻 QQ 群/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /查看更多/ })).toBeTruthy();
    expect(screen.getByTestId("icon-qq")).toBeTruthy();
    expect(screen.getByTestId("icon-arrow-forward")).toBeTruthy();
  });

  it("查看更多跳转到圈子页", () => {
    render(<RecentVisitors visitors={mockVisitors} />);
    expect(screen.getByRole("link", { name: /查看更多/ }).getAttribute("href")).toBe("/circle");
  });

  it("Tooltip 包含访客名称", () => {
    render(<RecentVisitors visitors={[makeVisitor("1")]} />);
    expect(screen.getByText("访客1")).toBeTruthy();
    expect(screen.getByText("在线")).toBeTruthy();
  });

  it("访客项禁止文本选择，连续点击不会选中文字", () => {
    render(<RecentVisitors visitors={[makeVisitor("1")]} />);
    expect(screen.getByText("访客1").closest("[data-testid='visitor-item']")).toHaveClass(
      "select-none",
    );
  });

  it("空访客列表不渲染头像", () => {
    render(<RecentVisitors visitors={[]} />);
    const images = screen.queryAllByRole("img");
    expect(images).toHaveLength(0);
  });
});

describe("TagsCloud", () => {
  it("渲染不崩溃，显示标签名", () => {
    render(<TagsCloud tags={mockTags} />);
    expect(screen.getByText("React")).toBeTruthy();
    expect(screen.getByText("TypeScript")).toBeTruthy();
    expect(screen.getByText("Next.js")).toBeTruthy();
  });

  it("标签数量正确", () => {
    render(<TagsCloud tags={mockTags} />);
    // 每个标签渲染为 button
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(mockTags.length);
  });

  it("显示区块标题", () => {
    render(<TagsCloud tags={mockTags} />);
    expect(screen.getByRole("heading", { level: 3, name: "标签" })).toBeInTheDocument();
  });

  it("显示每个标签的计数", () => {
    render(<TagsCloud tags={mockTags} />);
    // makeTag(id) 的 count 是 id * 3：3, 6, 9
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
  });

  it("空标签列表不渲染按钮", () => {
    render(<TagsCloud tags={[]} />);
    const buttons = screen.queryAllByRole("button");
    expect(buttons).toHaveLength(0);
  });

  it("每个标签都显示计数", () => {
    render(<TagsCloud tags={mockTags} />);
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
  });
});
