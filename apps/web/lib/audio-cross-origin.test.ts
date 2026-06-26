import { describe, expect, it } from "vitest";
import { resolveAudioCrossOrigin } from "./audio-cross-origin";

describe("resolveAudioCrossOrigin", () => {
  it("同源 URL 返回 anonymous", () => {
    expect(
      resolveAudioCrossOrigin("https://www.yevpt.com/api/music/a.m4a", "https://www.yevpt.com"),
    ).toBe("anonymous");
  });

  it("跨域 OSS URL 返回 anonymous，以便 CDN 已开启 CORS 后可被 Web Audio 采样", () => {
    expect(
      resolveAudioCrossOrigin(
        "https://blog-dev-oss.yevpt.com/blog/music/audio/2/track.m4a?a=1&b=2",
        "http://localhost:3000",
      ),
    ).toBe("anonymous");
  });

  it("非法 URL 返回 undefined", () => {
    expect(resolveAudioCrossOrigin("not-a-url", "http://localhost:3000")).toBeUndefined();
  });
});
