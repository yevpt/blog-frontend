import { expect, test } from "vitest";
import { resolveCircleVirtualBuffer } from "./use-circle-virtual-buffer";

test("resolveCircleVirtualBuffer 按视口高度对称预留并限制在合理区间", () => {
  expect(resolveCircleVirtualBuffer(400)).toBe(360);
  expect(resolveCircleVirtualBuffer(800)).toBe(360);
  expect(resolveCircleVirtualBuffer(1500)).toBe(640);
});
