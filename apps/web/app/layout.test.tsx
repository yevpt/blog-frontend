import { describe, expect, it } from "vitest";
import { viewport } from "./layout";

describe("Root layout viewport", () => {
  it("禁用移动端页面缩放", () => {
    expect(viewport).toMatchObject({
      width: "device-width",
      initialScale: 1,
      maximumScale: 1,
      userScalable: false,
    });
  });
});
