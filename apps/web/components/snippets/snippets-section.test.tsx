import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { SnippetsSection } from "./snippets-section";
import type { MomentItemResp } from "@repo/api";

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

// 生成测试用 MomentItemResp 数据
function makeMoment(
  id: number,
  content: string,
  overrides: Partial<MomentItemResp> = {},
): MomentItemResp {
  return {
    id,
    user_id: 1,
    content,
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 10,
    comment_count: 3,
    is_liked: false,
    user: {
      id: 1,
      username: `author${id}`,
      nickname: `作者${id}`,
      mark: "博主",
      avatar_url: `https://example.com/avatar${id}.jpg`,
    },
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

// 短内容（< 120 字符）
const SHORT_CONTENT = "这是一条短碎语，不超过120字符的限制。";

// 长内容（> 120 字符），确保触发截断（JS 字符串 length 按 UTF-16 单元计算，中文每字1单元）
const LONG_CONTENT =
  "这是一条很长的碎语内容，超过了一百二十个字符的限制，需要显示展开按钮。" +
  "这部分内容在默认状态下应该被隐藏，只有点击展开按钮后才能看到全部内容。" +
  "这里是更多的补充内容，确保文本足够长。继续增加内容直到超过一百二十个字符为止，包括这段额外的说明文字。";

const mockMoments: MomentItemResp[] = [makeMoment(1, SHORT_CONTENT), makeMoment(2, LONG_CONTENT)];

describe("SnippetsSection", () => {
  it("渲染不崩溃，显示碎语内容", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    // 区块标题
    expect(screen.getByText("碎语")).toBeTruthy();
    // 短内容完整显示
    expect(screen.getByText(SHORT_CONTENT)).toBeTruthy();
  });

  it("长内容默认截断，显示展开按钮", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    const expandBtns = screen.getAllByText("展开");
    expect(expandBtns.length).toBeGreaterThan(0);
    const truncated = LONG_CONTENT.slice(0, 120) + "...";
    expect(screen.getByText(truncated)).toBeTruthy();
    expect(screen.queryByText(LONG_CONTENT)).toBeNull();
  });

  it("点击展开后显示全部内容", async () => {
    const user = userEvent.setup();
    render(<SnippetsSection snippets={mockMoments} />);

    const expandBtn = screen.getAllByText("展开")[0];
    await act(async () => {
      await user.click(expandBtn);
    });

    expect(screen.getByText(LONG_CONTENT)).toBeTruthy();
    expect(screen.getByText("收起")).toBeTruthy();
  });

  it("点击收起后重新截断", async () => {
    const user = userEvent.setup();
    render(<SnippetsSection snippets={mockMoments} />);

    const expandBtn = screen.getAllByText("展开")[0];
    await act(async () => {
      await user.click(expandBtn);
    });

    const collapseBtn = screen.getByText("收起");
    await act(async () => {
      await user.click(collapseBtn);
    });

    expect(screen.queryByText(LONG_CONTENT)).toBeNull();
    expect(screen.getAllByText("展开").length).toBeGreaterThan(0);
  });

  it("发表碎语和查看更多按钮存在", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    expect(screen.getByText("发表碎语")).toBeTruthy();
    expect(screen.getByText("查看更多")).toBeTruthy();
  });

  it("短内容不显示展开按钮", () => {
    render(<SnippetsSection snippets={[makeMoment(99, SHORT_CONTENT)]} />);
    expect(screen.queryByText("展开")).toBeNull();
  });

  it("显示作者名和徽章", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    expect(screen.getByText("作者1")).toBeTruthy();
    expect(screen.getAllByText("博主").length).toBe(mockMoments.length);
  });

  it("显示点赞和评论统计数字", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    const likeLabels = screen.getAllByText("10 喜欢");
    const commentLabels = screen.getAllByText("3 评论");
    expect(likeLabels).toHaveLength(mockMoments.length);
    expect(commentLabels).toHaveLength(mockMoments.length);
  });

  it("碎语之间使用紧凑分隔线和合理内边距", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    const cards = screen.getAllByTestId("snippet-card");
    expect(cards[0].className).toContain("border-b");
    expect(cards[0].className).toContain("py-3");
  });

  it("喜欢按钮点击后变为激活状态（liked）", async () => {
    const user = userEvent.setup();
    render(<SnippetsSection snippets={[makeMoment(1, SHORT_CONTENT)]} />);

    const likeBtn = screen.getByLabelText("喜欢");
    expect(likeBtn.className).not.toContain("text-red-500");

    await act(async () => {
      await user.click(likeBtn);
    });

    expect(likeBtn.className).toContain("text-red-500");
  });

  it("snippets 为空时仍渲染区块标题和操作按钮", () => {
    render(<SnippetsSection snippets={[]} />);
    expect(screen.getByText("碎语")).toBeTruthy();
    expect(screen.getByText("发表碎语")).toBeTruthy();
    expect(screen.getByText("查看更多")).toBeTruthy();
  });

  it("最多只显示 3 条碎语", () => {
    const manyMoments = Array.from({ length: 6 }, (_, i) =>
      makeMoment(i + 1, `${SHORT_CONTENT} #${i + 1}`),
    );
    render(<SnippetsSection snippets={manyMoments} />);

    expect(screen.getByText(`${SHORT_CONTENT} #1`)).toBeTruthy();
    expect(screen.getByText(`${SHORT_CONTENT} #2`)).toBeTruthy();
    expect(screen.getByText(`${SHORT_CONTENT} #3`)).toBeTruthy();
    expect(screen.queryByText(`${SHORT_CONTENT} #4`)).toBeNull();
    expect(screen.queryByText(`${SHORT_CONTENT} #5`)).toBeNull();
    expect(screen.queryByText(`${SHORT_CONTENT} #6`)).toBeNull();
  });
});
