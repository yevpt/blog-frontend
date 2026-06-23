import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

    expect(screen.getByRole("heading", { name: "新建文章" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "文章标题" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "文章描述" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "文章内容编辑器" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "替换背景图" })).toBeInTheDocument();
    expect(screen.getByLabelText("文章分类")).toBeInTheDocument();
    expect(screen.getByLabelText("背景音乐")).toBeInTheDocument();
  });

  it("编辑路由展示编辑文章标题", () => {
    renderEditorPage("/articles/12/edit");

    expect(screen.getByRole("heading", { name: "编辑文章" })).toBeInTheDocument();
  });

  it("通过 Autocomplete 追加标签并保持增加标签按钮在末尾", async () => {
    const user = userEvent.setup();
    renderEditorPage();

    const tagRegion = screen.getByRole("group", { name: "文章标签" });
    expect(within(tagRegion).getByRole("button", { name: "React" })).toBeInTheDocument();
    expect(within(tagRegion).queryByRole("button", { name: "编辑器" })).not.toBeInTheDocument();

    await user.click(within(tagRegion).getByRole("button", { name: "增加标签" }));
    await user.type(screen.getByRole("searchbox", { name: "搜索标签" }), "编辑");
    await user.click(screen.getByRole("menuitem", { name: "编辑器" }));

    const buttons = within(tagRegion)
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(buttons).toEqual(["React", "后台", "体验设计", "编辑器", "增加标签"]);
  });
});
