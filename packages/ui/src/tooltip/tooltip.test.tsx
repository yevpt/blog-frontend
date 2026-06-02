import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tooltip, TooltipTrigger } from "./tooltip";

describe("Tooltip", () => {
  it("渲染 children 不崩溃", () => {
    render(
      <Tooltip title="提示内容">
        <button>触发器</button>
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: "触发器" })).toBeTruthy();
  });

  it("defaultOpen 时直接显示 tooltip 文字", () => {
    render(
      <Tooltip title="提示文字" defaultOpen>
        <button>触发器</button>
      </Tooltip>,
    );
    // defaultOpen 使 tooltip 初始可见，验证内容正常渲染
    expect(screen.getByText("提示文字")).toBeTruthy();
  });

  it("TooltipTrigger 渲染 children", () => {
    render(
      <Tooltip title="提示">
        <TooltipTrigger>
          <span>图标</span>
        </TooltipTrigger>
      </Tooltip>,
    );
    expect(screen.getByText("图标")).toBeTruthy();
  });
});
