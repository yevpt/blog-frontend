import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResponsiveModalShell } from "./responsive-modal";

function mockMatch(isDesktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes("min-width: 768px") ? isDesktop : false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}
beforeEach(() => mockMatch(true));

describe("ResponsiveModalShell", () => {
  it("渲染标题、body 与 footer", async () => {
    render(
      <ResponsiveModalShell isOpen title="写碎语" onClose={() => {}} footer={<span>底栏</span>}>
        {() => <p>正文</p>}
      </ResponsiveModalShell>,
    );
    expect(await screen.findByRole("dialog", { name: "写碎语" })).toBeInTheDocument();
    expect(screen.getByText("正文")).toBeInTheDocument();
    expect(screen.getByText("底栏")).toBeInTheDocument();
  });

  it("移动端视口渲染底部 sheet（含拖拽抓手）", async () => {
    mockMatch(false);
    render(
      <ResponsiveModalShell isOpen title="写碎语" onClose={() => {}}>
        {() => <p>正文</p>}
      </ResponsiveModalShell>,
    );
    expect(await screen.findByRole("dialog", { name: "写碎语" })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector(".cursor-grab")).toBeTruthy());
  });

  it("isOpen 从关到开时按当前视口判定（不在挂载时锁死）", async () => {
    const props = { title: "写碎语", onClose: () => {} };
    const { rerender } = render(
      <ResponsiveModalShell isOpen={false} {...props}>
        {() => <p>正文</p>}
      </ResponsiveModalShell>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    mockMatch(false);
    rerender(
      <ResponsiveModalShell isOpen {...props}>
        {() => <p>正文</p>}
      </ResponsiveModalShell>,
    );
    expect(await screen.findByRole("dialog", { name: "写碎语" })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector(".cursor-grab")).toBeTruthy());
  });

  it("点击关闭键触发 onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ResponsiveModalShell isOpen title="写碎语" onClose={onClose}>
        {() => <p>正文</p>}
      </ResponsiveModalShell>,
    );
    await user.click(await screen.findByRole("button", { name: "关闭" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
