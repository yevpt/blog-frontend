import { describe, it, expect } from "vitest";
import { formatRegisterAt, getAge, getZodiac } from "./profile-format";

describe("getAge", () => {
  const referenceDate = new Date("2026-06-16T12:00:00Z");

  it("returns age before birthday in current year", () => {
    expect(getAge("2000-12-25", referenceDate)).toBe(25);
  });

  it("returns age after birthday in current year", () => {
    expect(getAge("2000-01-01", referenceDate)).toBe(26);
  });
});

describe("getZodiac", () => {
  it("returns 双鱼座 before Aries boundary", () => {
    expect(getZodiac("2024-03-20")).toBe("双鱼座");
  });

  it("returns 白羊座 on Aries boundary", () => {
    expect(getZodiac("2024-03-21")).toBe("白羊座");
  });
});

describe("formatRegisterAt", () => {
  it("formats ISO date strings", () => {
    expect(formatRegisterAt("2024-01-01T00:00:00Z")).toBe("2024-01-01 00:00:00");
  });

  it("falls back to original string when formatting fails", () => {
    expect(formatRegisterAt("not-an-iso-date")).toBe("not-an-iso-date");
  });
});
