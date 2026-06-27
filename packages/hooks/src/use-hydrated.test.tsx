// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { resetHydratedStateForTests, useHydrated } from "./use-hydrated";

function HydrationProbe() {
  const hydrated = useHydrated();
  return <span data-testid="hydrated">{hydrated ? "yes" : "no"}</span>;
}

describe("useHydrated", () => {
  beforeEach(() => {
    resetHydratedStateForTests();
  });

  afterEach(() => {
    cleanup();
  });

  it("挂载后变为 true", () => {
    render(<HydrationProbe />);
    expect(screen.getByTestId("hydrated").textContent).toBe("yes");
  });

  it("全局 hydrated 后 remount 首帧即为 true", () => {
    const { unmount } = render(<HydrationProbe />);
    expect(screen.getByTestId("hydrated").textContent).toBe("yes");
    unmount();
    cleanup();

    const { getByTestId } = render(<HydrationProbe />);
    expect(getByTestId("hydrated").textContent).toBe("yes");
  });
});
