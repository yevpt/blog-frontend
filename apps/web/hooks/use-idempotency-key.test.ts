import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useIdempotencyKey } from "./use-idempotency-key";

describe("useIdempotencyKey", () => {
  it("重试期间复用同一个键", () => {
    const { result } = renderHook(() => useIdempotencyKey("reply"));

    expect(result.current.getIdempotencyKey("same-payload")).toBe(
      result.current.getIdempotencyKey("same-payload"),
    );
  });

  it("重置后为下一次逻辑操作生成新键", () => {
    const { result } = renderHook(() => useIdempotencyKey("guestbook"));
    const previous = result.current.getIdempotencyKey("payload");

    act(() => result.current.resetIdempotencyKey());

    expect(result.current.getIdempotencyKey("payload")).not.toBe(previous);
  });

  it("提交载荷发生变化时自动生成新键", () => {
    const { result } = renderHook(() => useIdempotencyKey("comment-edit"));
    const previous = result.current.getIdempotencyKey("content:v1");

    expect(result.current.getIdempotencyKey("content:v2")).not.toBe(previous);
  });
});
