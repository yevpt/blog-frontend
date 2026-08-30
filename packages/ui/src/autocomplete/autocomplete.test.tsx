import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Autocomplete } from "./autocomplete";
import { Button } from "../button";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const tagItems = [
  { id: "react", label: "React" },
  { id: "typescript", label: "TypeScript" },
  { id: "editor", label: "编辑器" },
];

describe("Autocomplete", () => {
  it("支持按钮打开 content 搜索并选择候选项", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <Autocomplete.Trigger>
        <Button type="button">增加标签</Button>
        <Autocomplete.Popover>
          <Autocomplete>
            <Autocomplete.SearchField aria-label="搜索标签" placeholder="搜索标签" />
            <Autocomplete.Menu aria-label="标签候选" onAction={onAction}>
              {tagItems.map((item) => (
                <Autocomplete.Item key={item.id} id={item.id} label={item.label} />
              ))}
            </Autocomplete.Menu>
          </Autocomplete>
        </Autocomplete.Popover>
      </Autocomplete.Trigger>,
    );

    await user.click(screen.getByRole("button", { name: "增加标签" }));
    await user.type(screen.getByRole("searchbox", { name: "搜索标签" }), "Type");

    expect(screen.queryByRole("menuitem", { name: "React" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "TypeScript" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0]?.[0]).toBe("typescript");
  });

  it("无匹配项时展示 empty state", async () => {
    const user = userEvent.setup();

    render(
      <Autocomplete.Trigger>
        <Button type="button">增加标签</Button>
        <Autocomplete.Popover>
          <Autocomplete>
            <Autocomplete.SearchField aria-label="搜索标签" placeholder="搜索标签" />
            <Autocomplete.Menu aria-label="标签候选" renderEmptyState={() => "没有可添加的标签"}>
              {tagItems.map((item) => (
                <Autocomplete.Item key={item.id} id={item.id} label={item.label} />
              ))}
            </Autocomplete.Menu>
          </Autocomplete>
        </Autocomplete.Popover>
      </Autocomplete.Trigger>,
    );

    await user.click(screen.getByRole("button", { name: "增加标签" }));
    await user.type(screen.getByRole("searchbox", { name: "搜索标签" }), "Vue");

    expect(screen.getByText("没有可添加的标签")).toBeInTheDocument();
  });
});
