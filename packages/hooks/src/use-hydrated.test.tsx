// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useHydrated } from "./use-hydrated";

function HydrationProbe() {
  const hydrated = useHydrated();
  return <span data-testid="hydrated">{hydrated ? "yes" : "no"}</span>;
}

describe("useHydrated", () => {
  it("挂载后变为 true", () => {
    render(<HydrationProbe />);
    expect(screen.getByTestId("hydrated").textContent).toBe("yes");
  });
});
