import { describe, it, expect } from "vitest";
import type { CollectPayload } from "./types";

describe("CollectPayload", () => {
  it("有后端约定的全部 snake_case 字段", () => {
    const payload: CollectPayload = {
      event_type: "page_view",
      path: "/",
      title: "Home",
      referer: "",
      session_id: "sid",
      screen: "1920x1080",
    };
    expect(Object.keys(payload).sort()).toEqual(
      ["event_type", "path", "referer", "screen", "session_id", "title"].sort(),
    );
  });
});
