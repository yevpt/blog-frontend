import { describe, expect, it } from "vitest";
import {
  getAuthorMomentDisplayContent,
  shouldShowModerationContentPlaceholder,
} from "./moderation-presentation";

describe("moderation-presentation author helpers", () => {
  it("非作者在中风险首次发布时显示占位", () => {
    expect(
      shouldShowModerationContentPlaceholder(
        {
          public_state: "placeholder",
          display_version: "none",
          has_pending_revision: true,
          can_interact: false,
        },
        false,
      ),
    ).toBe(true);
  });

  it("作者在中风险首次发布时不显示占位", () => {
    expect(
      shouldShowModerationContentPlaceholder(
        {
          public_state: "placeholder",
          display_version: "none",
          has_pending_revision: true,
          can_interact: false,
        },
        true,
      ),
    ).toBe(false);
  });

  it("作者优先展示 pending_content", () => {
    expect(
      getAuthorMomentDisplayContent({
        content: "",
        moderation: {
          public_state: "placeholder",
          display_version: "none",
          has_pending_revision: true,
          pending_content: "待审正文",
          can_interact: false,
        },
      }),
    ).toBe("待审正文");
  });
});
