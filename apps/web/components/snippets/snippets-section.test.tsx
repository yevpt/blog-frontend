import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { SnippetsSection } from "./snippets-section";
import type { Snippet } from "../../app/_mock/types";

// Mock @repo/icons
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

// Mock @repo/ui（Button 组件）
vi.mock("@repo/ui", () => ({
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
}));

// Mock @repo/hooks useLocale
vi.mock("@repo/hooks", () => ({
  useLocale: () => ({
    locale: "zh",
    setLocale: () => undefined,
    t: (key: string) => {
      const messages: Record<string, string> = {
        "home.snippets": "碎语",
        "snippet.expand": "展开",
        "snippet.collapse": "收起",
        "snippet.like": "喜欢",
        "snippet.comment": "评论",
        "snippet.share": "转发",
        "snippet.postNew": "发表碎语",
        "snippet.viewMore": "查看更多",
      };
      return messages[key] ?? key;
    },
  }),
}));

// 生成测试用 Snippet 数据
function makeSnippet(id: string, content: string, overrides: Partial<Snippet> = {}): Snippet {
  return {
    id,
    author: {
      name: `作者${id}`,
      avatar: `https://example.com/avatar${id}.jpg`,
      badge: "博主",
    },
    content,
    publishedAt: new Date("2026-05-30T09:00:00"),
    likes: 10,
    comments: 3,
    ...overrides,
  };
}

// 短内容（< 120 字符）
const SHORT_CONTENT = "这是一条短碎语，不超过120字符的限制。";

// 长内容（> 120 字符），确保触发截断（JS 字符串 length 按 UTF-16 单元计算，中文每字1单元）
// 需要超过 120 个字符
const LONG_CONTENT =
  "这是一条很长的碎语内容，超过了一百二十个字符的限制，需要显示展开按钮。" +
  "这部分内容在默认状态下应该被隐藏，只有点击展开按钮后才能看到全部内容。" +
  "这里是更多的补充内容，确保文本足够长。继续增加内容直到超过一百二十个字符为止，包括这段额外的说明文字。";

const mockSnippets: Snippet[] = [makeSnippet("1", SHORT_CONTENT), makeSnippet("2", LONG_CONTENT)];

describe("SnippetsSection", () => {
  it("渲染不崩溃，显示碎语内容", () => {
    render(<SnippetsSection snippets={mockSnippets} />);
    // 区块标题
    expect(screen.getByText("碎语")).toBeTruthy();
    // 短内容完整显示
    expect(screen.getByText(SHORT_CONTENT)).toBeTruthy();
  });

  it("长内容默认截断，显示展开按钮", () => {
    render(<SnippetsSection snippets={mockSnippets} />);
    // 长内容应该有展开按钮
    const expandBtns = screen.getAllByText("展开");
    expect(expandBtns.length).toBeGreaterThan(0);
    // 截断后的文本（前 120 字符 + "..."）存在
    const truncated = LONG_CONTENT.slice(0, 120) + "...";
    expect(screen.getByText(truncated)).toBeTruthy();
    // 完整内容不可见
    expect(screen.queryByText(LONG_CONTENT)).toBeNull();
  });

  it("点击展开后显示全部内容", async () => {
    const user = userEvent.setup();
    render(<SnippetsSection snippets={mockSnippets} />);

    const expandBtn = screen.getAllByText("展开")[0];
    await act(async () => {
      await user.click(expandBtn);
    });

    // 全部内容应可见
    expect(screen.getByText(LONG_CONTENT)).toBeTruthy();
    // 按钮变为收起
    expect(screen.getByText("收起")).toBeTruthy();
  });

  it("点击收起后重新截断", async () => {
    const user = userEvent.setup();
    render(<SnippetsSection snippets={mockSnippets} />);

    // 先展开
    const expandBtn = screen.getAllByText("展开")[0];
    await act(async () => {
      await user.click(expandBtn);
    });

    // 再收起
    const collapseBtn = screen.getByText("收起");
    await act(async () => {
      await user.click(collapseBtn);
    });

    // 重新截断：完整内容不可见
    expect(screen.queryByText(LONG_CONTENT)).toBeNull();
    // 展开按钮重新出现
    expect(screen.getAllByText("展开").length).toBeGreaterThan(0);
  });

  it("发表碎语和查看更多按钮存在", () => {
    render(<SnippetsSection snippets={mockSnippets} />);
    expect(screen.getByText("发表碎语")).toBeTruthy();
    expect(screen.getByText("查看更多")).toBeTruthy();
  });

  it("短内容不显示展开按钮", () => {
    const singleShortSnippet: Snippet[] = [makeSnippet("only-short", SHORT_CONTENT)];
    render(<SnippetsSection snippets={singleShortSnippet} />);
    // 没有展开按钮
    expect(screen.queryByText("展开")).toBeNull();
  });

  it("显示作者名和徽章", () => {
    render(<SnippetsSection snippets={mockSnippets} />);
    expect(screen.getByText("作者1")).toBeTruthy();
    expect(screen.getAllByText("博主").length).toBe(mockSnippets.length);
  });

  it("显示点赞和评论统计数字", () => {
    render(<SnippetsSection snippets={mockSnippets} />);
    // 每张卡片都有 "10 喜欢" 和 "3 评论"
    const likeLabels = screen.getAllByText("10 喜欢");
    const commentLabels = screen.getAllByText("3 评论");
    expect(likeLabels).toHaveLength(mockSnippets.length);
    expect(commentLabels).toHaveLength(mockSnippets.length);
  });

  it("喜欢按钮点击后变为激活状态（liked）", async () => {
    const user = userEvent.setup();
    render(<SnippetsSection snippets={[makeSnippet("1", SHORT_CONTENT)]} />);

    // 获取第一个喜欢 aria-label 按钮
    const likeBtn = screen.getByLabelText("喜欢");
    // 初始状态应带 text-muted-foreground 类（未激活）
    expect(likeBtn.className).toContain("text-muted-foreground");

    await act(async () => {
      await user.click(likeBtn);
    });

    // 点击后变为红色（激活）
    expect(likeBtn.className).toContain("text-red-500");
  });

  it("snippets 为空时仍渲染区块标题和操作按钮", () => {
    render(<SnippetsSection snippets={[]} />);
    expect(screen.getByText("碎语")).toBeTruthy();
    expect(screen.getByText("发表碎语")).toBeTruthy();
    expect(screen.getByText("查看更多")).toBeTruthy();
  });

  it("最多只显示 3 条碎语", () => {
    const manySnippets = Array.from({ length: 6 }, (_, i) =>
      makeSnippet(String(i + 1), `${SHORT_CONTENT} #${i + 1}`),
    );
    render(<SnippetsSection snippets={manySnippets} />);

    expect(screen.getByText(`${SHORT_CONTENT} #1`)).toBeTruthy();
    expect(screen.getByText(`${SHORT_CONTENT} #2`)).toBeTruthy();
    expect(screen.getByText(`${SHORT_CONTENT} #3`)).toBeTruthy();
    expect(screen.queryByText(`${SHORT_CONTENT} #4`)).toBeNull();
    expect(screen.queryByText(`${SHORT_CONTENT} #5`)).toBeNull();
    expect(screen.queryByText(`${SHORT_CONTENT} #6`)).toBeNull();
  });
});
