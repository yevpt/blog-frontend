import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../tooltip/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ButtonUtility } from "./button-utility";

const MockIcon = ({ className }: { className?: string }) => (
  <svg className={className} data-testid="mock-icon" />
);

describe("ButtonUtility", () => {
  it("渲染不崩溃", () => {
    render(<ButtonUtility icon={MockIcon} />);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("点击触发回调", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ButtonUtility icon={MockIcon} onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });

  it("isDisabled 时无法点击", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ButtonUtility icon={MockIcon} isDisabled onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("href 时渲染为 link", () => {
    render(<ButtonUtility icon={MockIcon} href="/test" />);
    expect(screen.getByRole("link")).toBeTruthy();
  });
});
