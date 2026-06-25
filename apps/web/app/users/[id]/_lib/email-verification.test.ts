import { describe, it, expect } from "vitest";
import {
  isMainEmailVerified,
  isSubEmailVerified,
  resolveEmailVerificationStatus,
} from "./email-verification";

describe("email-verification", () => {
  it("resolveEmailVerificationStatus 按地址与 verified 推导", () => {
    expect(resolveEmailVerificationStatus(null, false)).toBe("unbound");
    expect(resolveEmailVerificationStatus("a@b.com", false)).toBe("unverified");
    expect(resolveEmailVerificationStatus("a@b.com", true)).toBe("verified");
    expect(resolveEmailVerificationStatus("a@b.com", undefined)).toBe("unverified");
  });

  it("isMainEmailVerified 缺字段按 false", () => {
    expect(isMainEmailVerified({ email: "a@b.com" })).toBe(false);
    expect(isMainEmailVerified({ email: "a@b.com", email_verified: true })).toBe(true);
    expect(isMainEmailVerified({})).toBe(false);
  });

  it("isSubEmailVerified 缺字段按 false", () => {
    expect(isSubEmailVerified({ meta: { sub_email: "s@b.com" } })).toBe(false);
    expect(isSubEmailVerified({ meta: { sub_email: "s@b.com", sub_email_verified: true } })).toBe(
      true,
    );
  });
});
