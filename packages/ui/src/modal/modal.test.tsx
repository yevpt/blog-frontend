import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../button";
import { Modal } from "./modal";

describe("Modal", () => {
  it("isOpen=false 时不渲染 dialog", () => {
    render(
      <Modal isOpen={false} onOpenChange={() => {}} aria-label="测试弹窗">
        内容
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("isOpen=true 时渲染 dialog 和内容", () => {
    render(
      <Modal isOpen onOpenChange={() => {}} aria-label="测试弹窗">
        内容
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "测试弹窗" })).toBeTruthy();
    expect(screen.getByText("内容")).toBeTruthy();
  });

  it("打开时使用共享 Modal 入场动画 class", () => {
    render(
      <Modal isOpen onOpenChange={() => {}} aria-label="测试弹窗">
        内容
      </Modal>,
    );
    expect(screen.getByTestId("modal-overlay").className).toContain("ui-modal-overlay-enter");
    expect(screen.getByTestId("modal-panel").className).toContain("ui-modal-panel-enter");
  });

  it("点击遮罩时触发 onOpenChange(false)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Modal isOpen isDismissable onOpenChange={onOpenChange} aria-label="测试弹窗">
        内容
      </Modal>,
    );
    await user.click(screen.getByTestId("modal-overlay"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("点击布局空白处触发 onBackdropPress", async () => {
    const user = userEvent.setup();
    const onBackdropPress = vi.fn();
    render(
      <Modal isOpen onOpenChange={() => {}} onBackdropPress={onBackdropPress} aria-label="测试弹窗">
        内容
      </Modal>,
    );
    await user.click(screen.getByTestId("modal-backdrop"));
    expect(onBackdropPress).toHaveBeenCalledOnce();
  });

  it("placement=sheet 时使用底部布局 class", () => {
    render(
      <Modal isOpen onOpenChange={() => {}} placement="sheet" aria-label="测试弹窗">
        内容
      </Modal>,
    );
    expect(screen.getByTestId("modal-positioner").className).toContain("items-end");
    expect(screen.getByRole("dialog").parentElement?.className).toContain("rounded-t-2xl");
  });

  it("placement=fullscreen-mobile 时 size 限制仅在 md: 及以上生效", () => {
    render(
      <Modal
        isOpen
        onOpenChange={() => {}}
        placement="fullscreen-mobile"
        size="md"
        aria-label="测试弹窗"
      >
        内容
      </Modal>,
    );
    const panelClassName = screen.getByTestId("modal-panel").className;
    // 移动端必须真正全屏：不能存在无前缀的 max-w-[440px]
    expect(panelClassName).not.toMatch(/(?<!:)max-w-\[440px\]/);
    // md: 断点起应用 size 限制
    expect(panelClassName).toContain("md:max-w-[440px]");
    // 移动端按内容高度撑开，最高不超过视口；桌面端仍受 md:max-w 约束
    expect(panelClassName).toContain("max-md:max-h-dvh");
    expect(panelClassName).toContain("max-md:fixed");
    expect(panelClassName).toContain("max-md:inset-x-0");
    expect(screen.getByTestId("modal-positioner").className).toContain("max-md:contents");
  });

  it("placement=center 时 size 在所有断点生效", () => {
    render(
      <Modal isOpen onOpenChange={() => {}} placement="center" size="md" aria-label="测试弹窗">
        内容
      </Modal>,
    );
    expect(screen.getByTestId("modal-panel").className).toContain("max-w-[440px]");
  });

  it("modalStyle 会透传到面板元素", () => {
    render(
      <Modal isOpen onOpenChange={() => {}} aria-label="测试弹窗" modalStyle={{ height: "320px" }}>
        内容
      </Modal>,
    );
    expect(screen.getByTestId("modal-panel").style.height).toBe("320px");
  });

  it("children 函数可以通过 close 关闭弹窗", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Modal isOpen onOpenChange={onOpenChange} aria-label="测试弹窗">
        {({ close }) => (
          <Button type="button" onPress={close}>
            关闭
          </Button>
        )}
      </Modal>,
    );
    await user.click(screen.getByRole("button", { name: "关闭" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
