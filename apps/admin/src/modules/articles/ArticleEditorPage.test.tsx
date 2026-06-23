import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ArticleEditorPage } from "./ArticleEditorPage";

vi.mock("@repo/editor", () => ({
  RichEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label="文章内容编辑器"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

function renderEditorPage(route = "/articles/new") {
  window.history.pushState({}, "", route);

  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/articles/new" element={<ArticleEditorPage />} />
        <Route path="/articles/:articleId/edit" element={<ArticleEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ArticleEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("渲染文章编辑工作台的核心字段", () => {
    renderEditorPage();

    expect(screen.getByRole("navigation", { name: "文章编辑导航" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "文章管理" })).toHaveAttribute("href", "/articles");
    expect(screen.getByText("新建文章")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "文章标题" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "文章描述" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "文章内容编辑器" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "替换背景图" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "更换音乐" })).toBeInTheDocument();
    expect(screen.getByLabelText("文章分类")).toBeInTheDocument();
  });

  it("编辑路由展示编辑文章标题", () => {
    renderEditorPage("/articles/12/edit");

    expect(screen.getByText("编辑文章")).toBeInTheDocument();
  });

  it("背景图片卡片与标题描述区同步高度", async () => {
    renderEditorPage();

    const coverCard = screen.getByText("背景图片").closest(".flex.flex-col");
    expect(coverCard).toBeTruthy();

    await waitFor(() => {
      expect(coverCard).toHaveStyle({ height: expect.stringMatching(/^\d+px$/) });
    });
  });

  it("内容归档字段标签与卡片标题左缘对齐", () => {
    renderEditorPage();

    const archiveCard = screen.getByText("内容归档").closest("[class*='rounded-2xl']");
    expect(archiveCard).toBeTruthy();

    const scoped = within(archiveCard as HTMLElement);
    const title = scoped.getByText("内容归档");
    const categoryLabel = scoped.getByText("文章分类");
    const tagLabel = scoped.getByText("文章标签");

    const titleLeft = title.getBoundingClientRect().left;
    expect(categoryLabel.getBoundingClientRect().left).toBeCloseTo(titleLeft, 0);
    expect(tagLabel.getBoundingClientRect().left).toBeCloseTo(titleLeft, 0);
  });

  it("背景音乐卡片支持移除与替换", async () => {
    const user = userEvent.setup();
    renderEditorPage();

    expect(screen.getByText("Midnight Drafts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "移除背景音乐" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "移除背景音乐" }));
    expect(screen.queryByText("Midnight Drafts")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加背景音乐" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加背景音乐" }));
    await user.type(screen.getByRole("searchbox", { name: "搜索音乐" }), "quiet");
    await user.click(screen.getByRole("button", { name: /Quiet Rain/ }));
    expect(screen.getByText("Quiet Rain")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "更换音乐" })).toBeInTheDocument();
  });

  it("背景音乐移除后与选中状态保持相同高度", async () => {
    const user = userEvent.setup();
    renderEditorPage();

    const selectedCard = screen.getByText("Midnight Drafts").closest(".h-16");
    expect(selectedCard).toBeTruthy();

    const selectedHeight = selectedCard!.getBoundingClientRect().height;

    await user.click(screen.getByRole("button", { name: "移除背景音乐" }));

    const emptyCard = screen.getByRole("button", { name: "添加背景音乐" });
    expect(emptyCard.getBoundingClientRect().height).toBeCloseTo(selectedHeight, 0);
  });

  it("通过 Autocomplete 追加标签并保持增加标签按钮在末尾", async () => {
    const user = userEvent.setup();
    renderEditorPage();

    const tagRegion = screen.getByRole("group", { name: "文章标签" });
    expect(within(tagRegion).getByText("React")).toBeInTheDocument();
    expect(within(tagRegion).queryByText("编辑器")).not.toBeInTheDocument();

    await user.click(within(tagRegion).getByRole("button", { name: "增加标签" }));
    await user.type(screen.getByRole("searchbox", { name: "搜索标签" }), "编辑");
    await user.click(screen.getByRole("menuitem", { name: "编辑器" }));

    expect(within(tagRegion).getByText("编辑器")).toBeInTheDocument();
    expect(within(tagRegion).getByRole("button", { name: "移除 编辑器" })).toBeInTheDocument();
    expect(within(tagRegion).getByRole("button", { name: "增加标签" })).toBeInTheDocument();
  });
});
