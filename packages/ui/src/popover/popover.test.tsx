import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Popover, PopoverTrigger, PopoverDialog } from "./popover";

describe("Popover", () => {
  it("defaultOpen 时渲染浮层内容", () => {
    render(
      <PopoverTrigger defaultOpen>
        <button>触发器</button>
        <Popover aria-label="设置">内容</Popover>
      </PopoverTrigger>,
    );
    expect(screen.getByText("内容")).toBeTruthy();
  });

  it("默认收起时不渲染浮层内容", () => {
    render(
      <PopoverTrigger>
        <button>触发器</button>
        <Popover aria-label="设置">内容</Popover>
      </PopoverTrigger>,
    );
    expect(screen.queryByText("内容")).toBeNull();
  });

  it("showArrow 渲染箭头", () => {
    render(
      <PopoverTrigger defaultOpen>
        <button>触发器</button>
        <Popover aria-label="设置" showArrow>
          内容
        </Popover>
      </PopoverTrigger>,
    );
    expect(document.querySelector("svg")).toBeTruthy();
  });

  it("不传 showArrow 时无箭头", () => {
    render(
      <PopoverTrigger defaultOpen>
        <button>触发器</button>
        <Popover aria-label="设置">内容</Popover>
      </PopoverTrigger>,
    );
    expect(document.querySelector("svg")).toBeNull();
  });

  it("className 透传到浮层 root", () => {
    render(
      <PopoverTrigger defaultOpen>
        <button>触发器</button>
        <Popover aria-label="设置" className="custom-popover">
          内容
        </Popover>
      </PopoverTrigger>,
    );
    expect(document.querySelector(".custom-popover")).toBeTruthy();
  });

  it("classNames slot 定制 popover 与 arrow", () => {
    render(
      <PopoverTrigger defaultOpen>
        <button>触发器</button>
        <Popover
          aria-label="设置"
          showArrow
          classNames={{ popover: "slot-root", arrow: "slot-arrow" }}
        >
          内容
        </Popover>
      </PopoverTrigger>,
    );
    expect(document.querySelector(".slot-root")).toBeTruthy();
    expect(document.querySelector(".slot-arrow")).toBeTruthy();
  });

  it("PopoverDialog 提供 dialog 语义容器", () => {
    render(
      <PopoverTrigger defaultOpen>
        <button>触发器</button>
        <Popover>
          <PopoverDialog aria-label="设置">对话内容</PopoverDialog>
        </Popover>
      </PopoverTrigger>,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("对话内容")).toBeTruthy();
  });
});
