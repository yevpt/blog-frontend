import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { BfcacheBoundary } from "./bfcache-boundary";

function firePageShow(persisted: boolean) {
  const event = new Event("pageshow") as PageTransitionEvent;
  Object.defineProperty(event, "persisted", { value: persisted });
  act(() => {
    window.dispatchEvent(event);
  });
}

// 探针：每次挂载递增计数，用于断言子树是否重挂载。
function Probe({ onMount }: { onMount: () => void }) {
  useEffect(() => {
    onMount();
  }, [onMount]);
  return <div data-testid="probe">probe</div>;
}

describe("BfcacheBoundary", () => {
  it("从 bfcache 恢复（persisted=true）时重挂载 children", () => {
    const onMount = vi.fn();
    render(
      <BfcacheBoundary>
        <Probe onMount={onMount} />
      </BfcacheBoundary>,
    );

    expect(onMount).toHaveBeenCalledTimes(1);

    firePageShow(true);

    // key 递增导致子树卸载并重新挂载，effect 再次运行。
    expect(onMount).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("probe")).toBeInTheDocument();
  });

  it("普通 pageshow（persisted=false）不重挂载", () => {
    const onMount = vi.fn();
    render(
      <BfcacheBoundary>
        <Probe onMount={onMount} />
      </BfcacheBoundary>,
    );

    firePageShow(false);

    expect(onMount).toHaveBeenCalledTimes(1);
  });

  it("卸载后移除监听，不再触发重挂载", () => {
    const onMount = vi.fn();
    const { unmount } = render(
      <BfcacheBoundary>
        <Probe onMount={onMount} />
      </BfcacheBoundary>,
    );

    unmount();
    onMount.mockClear();
    firePageShow(true);

    expect(onMount).not.toHaveBeenCalled();
  });
});
