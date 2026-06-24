import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleTagPicker } from "./ArticleTagPicker";

const tagCandidates = [
  { id: 1, label: "React" },
  { id: 2, label: "后台" },
  { id: 3, label: "体验设计" },
  { id: 4, label: "TypeScript" },
  { id: 5, label: "编辑器" },
];

describe("ArticleTagPicker", () => {
  it("通过 Autocomplete 选择未选标签后调用 onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ArticleTagPicker
        selectedTags={tagCandidates.slice(0, 3)}
        tagCandidates={tagCandidates}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "增加标签" }));
    await user.type(screen.getByRole("searchbox", { name: "搜索标签" }), "编辑");
    await user.click(screen.getByRole("menuitem", { name: "编辑器" }));

    expect(onChange).toHaveBeenCalledWith([...tagCandidates.slice(0, 3), tagCandidates[4]]);
  });

  it("点击标签右上角移除按钮时移除该标签", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ArticleTagPicker
        selectedTags={tagCandidates.slice(0, 3)}
        tagCandidates={tagCandidates}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "移除 后台" }));

    expect(onChange).toHaveBeenCalledWith([tagCandidates[0], tagCandidates[2]]);
  });
});
