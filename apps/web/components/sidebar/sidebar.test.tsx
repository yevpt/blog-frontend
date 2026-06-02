import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { RecentVisitors } from "./recent-visitors";
import { TagsCloud } from "./tags-cloud";
import type { Visitor, Tag } from "../../app/_mock/types";

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

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

vi.mock("@repo/ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
  Button: ({
    children,
    variant,
    ...props
  }: {
    children: ReactNode;
    variant?: string;
    [key: string]: unknown;
  }) => (
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

function makeVisitor(id: string, isOnline = false): Visitor {
  return {
    id,
    name: `访客${id}`,
    avatar: `https://example.com/avatar${id}.jpg`,
    isOnline,
    visitedAt: new Date("2026-05-30T10:00:00"),
  };
}

const mockVisitors: Visitor[] = Array.from({ length: 9 }, (_, i) => makeVisitor(String(i + 1)));

function makeTag(id: string, name: string): Tag {
  return { id, name, icon: "tag", count: Number(id) * 3 };
}

const mockTags: Tag[] = [
  makeTag("1", "React"),
  makeTag("2", "TypeScript"),
  makeTag("3", "Next.js"),
];

describe("RecentVisitors", () => {
  it("渲染不崩溃，显示 9 个头像", () => {
    render(<RecentVisitors visitors={mockVisitors} />);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(9);
  });

  it("访客少于 9 人时显示实际数量", () => {
    render(<RecentVisitors visitors={mockVisitors.slice(0, 5)} />);
    expect(screen.getAllByRole("img")).toHaveLength(5);
  });

  it("访客超过 10 人时只显示 10 个头像", () => {
    const manyVisitors = [...mockVisitors, makeVisitor("10"), makeVisitor("11")];
    render(<RecentVisitors visitors={manyVisitors} />);
    expect(screen.getAllByRole("img")).toHaveLength(10);
  });

  it("显示区块标题", () => {
    render(<RecentVisitors visitors={mockVisitors} />);
    expect(screen.getByText("最近来访")).toBeTruthy();
  });

  it("两个底部按钮（入驻 QQ 群 / 查看更多）存在", () => {
    render(<RecentVisitors visitors={mockVisitors} />);
    expect(screen.getByText("入驻 QQ 群")).toBeTruthy();
    expect(screen.getByText("查看更多")).toBeTruthy();
  });

  it("在线访客显示「在线」文字", () => {
    const onlineVisitor = makeVisitor("1", true);
    render(<RecentVisitors visitors={[onlineVisitor]} />);
    expect(screen.getByText("在线")).toBeTruthy();
  });

  it("离线访客显示相对时间", () => {
    const offlineVisitor = makeVisitor("1", false);
    render(<RecentVisitors visitors={[offlineVisitor]} />);
    // formatRelativeTime 返回相对时间，存在"来过"后缀
    expect(screen.getByText(/来过/)).toBeTruthy();
  });

  it("显示访客名称", () => {
    render(<RecentVisitors visitors={[makeVisitor("1")]} />);
    expect(screen.getByText("访客1")).toBeTruthy();
  });

  it("空访客列表不渲染头像", () => {
    render(<RecentVisitors visitors={[]} />);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
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
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(mockTags.length);
  });

  it("显示区块标题", () => {
    render(<TagsCloud tags={mockTags} />);
    expect(screen.getByText("标签")).toBeTruthy();
  });

  it("显示每个标签的计数", () => {
    render(<TagsCloud tags={mockTags} />);
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
  });

  it("空标签列表不渲染按钮", () => {
    render(<TagsCloud tags={[]} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("每个标签都显示计数", () => {
    render(<TagsCloud tags={mockTags} />);
    const counts = screen.getAllByTestId("tag-count");
    expect(counts).toHaveLength(mockTags.length);
  });
});
