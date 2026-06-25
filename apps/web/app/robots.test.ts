import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";

describe("robots metadata route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("允许公开页面抓取，并指向 sitemap", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com/");

    expect(robots()).toEqual({
      rules: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/notifications", "/oauth"],
        },
      ],
      sitemap: "https://example.com/sitemap.xml",
      host: "https://example.com",
    });
  });
});
