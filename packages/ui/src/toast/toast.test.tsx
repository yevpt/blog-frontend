import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastQueue } from "./toast";
import { ToastRegion } from "./toast";
import type { ToastContent } from "./types";

function makeQueue(...items: ToastContent[]) {
  const q = new ToastQueue<ToastContent>({ maxVisibleToasts: 5 });
  items.forEach((item) => q.add(item));
  return q;
}

describe("ToastRegion", () => {
  it("没有 toast 时不渲染任何消息文字", () => {
    const queue = makeQueue();
    render(<ToastRegion queue={queue} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("渲染 success toast 消息文字", () => {
    const queue = makeQueue({ message: "登录成功", type: "success" });
    render(<ToastRegion queue={queue} />);
    expect(screen.getByText("登录成功")).toBeInTheDocument();
  });

  it("渲染 error toast 消息文字", () => {
    const queue = makeQueue({ message: "操作失败", type: "error" });
    render(<ToastRegion queue={queue} />);
    expect(screen.getByText("操作失败")).toBeInTheDocument();
  });

  it("不同类型渲染各自对应的图标", () => {
    const queue = makeQueue(
      { message: "登录成功", type: "success" },
      { message: "操作失败", type: "error" },
      { message: "测试通知", type: "info" },
    );
    render(<ToastRegion queue={queue} />);
    const hrefs = Array.from(document.body.querySelectorAll("use")).map((el) =>
      el.getAttribute("href"),
    );
    expect(hrefs).toContain("#icon-check");
    expect(hrefs).toContain("#icon-alert-circle");
    expect(hrefs).toContain("#icon-info-circle");
  });

  it("error toast 的图标芯片使用 destructive 色调", () => {
    const queue = makeQueue({ message: "操作失败", type: "error" });
    render(<ToastRegion queue={queue} />);
    const chip = document.body.querySelector('[role="alertdialog"] > span');
    expect(chip).toHaveClass("text-destructive");
  });

  it("容器宽度跟随内容，不是写死的固定像素宽度", () => {
    const queue = makeQueue({ message: "已置顶", type: "success" });
    render(<ToastRegion queue={queue} />);
    const toast = screen.getByText("已置顶").closest('[role="alertdialog"]');
    // 排除 min-w-[..]/max-w-[..]，只检测写死的固定宽度（如旧版 w-[320px]）
    expect(toast?.className).not.toMatch(/(?<!min-|max-)\bw-\[\d/);
    expect(toast).toHaveClass("w-fit");
  });

  it("默认弹出位置是右下角", () => {
    const queue = makeQueue({ message: "测试通知", type: "info" });
    render(<ToastRegion queue={queue} />);
    const region = screen.getByRole("alertdialog").closest('[role="region"]');
    expect(region).toHaveClass("bottom-4");
    expect(region).toHaveClass("right-4");
    expect(region).toHaveClass("items-end");
  });

  it("position=top-left 时渲染左上角对应的定位类名", () => {
    const queue = makeQueue({ message: "测试通知", type: "info" });
    render(<ToastRegion queue={queue} position="top-left" />);
    const region = screen.getByRole("alertdialog").closest('[role="region"]');
    expect(region).toHaveClass("top-4");
    expect(region).toHaveClass("left-4");
    expect(region).toHaveClass("items-start");
  });

  it("position=top-center 时水平居中并取消左右锚点", () => {
    const queue = makeQueue({ message: "测试通知", type: "info" });
    render(<ToastRegion queue={queue} position="top-center" />);
    const region = screen.getByRole("alertdialog").closest('[role="region"]');
    expect(region).toHaveClass("top-4");
    expect(region).toHaveClass("left-1/2");
    expect(region).toHaveClass("-translate-x-1/2");
    expect(region).toHaveClass("items-center");
  });

  it("点击关闭按钮后 toast 消失", async () => {
    const user = userEvent.setup();
    const queue = makeQueue({ message: "测试通知", type: "info" });
    render(<ToastRegion queue={queue} />);
    expect(screen.getByText("测试通知")).toBeInTheDocument();
    await user.click(screen.getByLabelText("关闭通知"));
    expect(screen.queryByText("测试通知")).not.toBeInTheDocument();
  });

  it("传入 renderToast 时按自定义内容渲染", () => {
    interface DemoContent {
      label: string;
    }
    const queue = new ToastQueue<DemoContent>({ maxVisibleToasts: 5 });
    queue.add({ label: "自定义内容" });
    render(
      <ToastRegion queue={queue} renderToast={(toast) => <span>{toast.content.label}</span>} />,
    );
    expect(screen.getByText("自定义内容")).toBeInTheDocument();
  });

  it("itemClassName 覆盖默认的宽度与对齐类名", () => {
    interface DemoContent {
      label: string;
    }
    const queue = new ToastQueue<DemoContent>({ maxVisibleToasts: 5 });
    queue.add({ label: "自定义内容" });
    render(
      <ToastRegion
        queue={queue}
        itemClassName="w-[300px] items-start"
        renderToast={(toast) => <span>{toast.content.label}</span>}
      />,
    );
    const item = screen.getByRole("alertdialog");
    expect(item).toHaveClass("w-[300px]");
    expect(item).toHaveClass("items-start");
    expect(item).not.toHaveClass("w-fit");
  });

  it("renderToast 的 close helper 能关闭对应 toast", async () => {
    interface DemoContent {
      label: string;
    }
    const user = userEvent.setup();
    const queue = new ToastQueue<DemoContent>({ maxVisibleToasts: 5 });
    queue.add({ label: "可关闭内容" });
    render(
      <ToastRegion
        queue={queue}
        renderToast={(toast, { close }) => (
          <button type="button" onClick={close}>
            关闭 {toast.content.label}
          </button>
        )}
      />,
    );
    const closeBtn = screen.getByRole("button", { name: /可关闭内容/ });
    await user.click(closeBtn);
    expect(screen.queryByText(/可关闭内容/)).not.toBeInTheDocument();
  });
});
