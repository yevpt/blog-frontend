import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Selection } from "react-aria-components";
import { TagGroup, TagList, TagItem } from "./tag-group";

function TestTags({ onSelectionChange }: { onSelectionChange?: (keys: Set<string>) => void }) {
  return (
    <TagGroup
      selectionMode="multiple"
      onSelectionChange={(keys: Selection) => onSelectionChange?.(new Set(keys as Set<string>))}
    >
      <TagList>
        <TagItem id="ts">TypeScript</TagItem>
        <TagItem id="react" count={5}>
          React
        </TagItem>
        <TagItem id="css">CSS</TagItem>
      </TagList>
    </TagGroup>
  );
}

describe("TagGroup", () => {
  it("渲染不崩溃，显示所有标签", () => {
    render(<TestTags />);
    expect(screen.getByText("TypeScript")).toBeTruthy();
    expect(screen.getByText("React")).toBeTruthy();
    expect(screen.getByText("CSS")).toBeTruthy();
  });

  it("count 显示在标签旁", () => {
    render(<TestTags />);
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("点击标签后切换选中态（bg-primary）", async () => {
    const user = userEvent.setup();
    render(<TestTags />);
    const tag = screen.getByText("TypeScript").closest("[data-key='ts']")!;
    await user.click(tag);
    expect(tag.className).toContain("bg-primary");
  });

  it("onSelectionChange 在选中时触发", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TestTags onSelectionChange={onChange} />);
    const cssTag = screen.getByText("CSS").closest("[data-key='css']")!;
    await user.click(cssTag);
    expect(onChange).toHaveBeenCalled();
  });

  it("label prop 渲染标题", () => {
    render(
      <TagGroup label="标签云" selectionMode="none">
        <TagList>
          <TagItem id="a">A</TagItem>
        </TagList>
      </TagGroup>,
    );
    expect(screen.getByText("标签云")).toBeTruthy();
  });
});
