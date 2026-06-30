import { describe, expect, it } from "vitest";
import type {
  CommentItemResp,
  CommentReplyResp,
  GuestbookItemResp,
  UserDetailResp,
} from "@repo/api";
import {
  enrichCommentAuthor,
  enrichGuestbookAuthor,
  enrichReplyFromAuthor,
  profileToUgcUser,
} from "./enrich-ugc-author";

const profile: UserDetailResp = {
  id: 7,
  username: "alice@example.com",
  nickname: "Alice",
  avatar_url: "https://cdn.example/avatar.png",
  site: "https://alice.example",
  mark: "writer",
  status: 1,
  roles: ["user"],
};

const commentBase: CommentItemResp = {
  id: 1,
  target_type: "article",
  target_id: 10,
  user_id: 7,
  content: "hello",
  reply_count: 0,
  like_count: 0,
  is_liked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const guestbookBase: GuestbookItemResp = {
  id: 2,
  owner_user_id: 0,
  from_user_id: 7,
  content: "hi",
  reply_count: 0,
  like_count: 0,
  is_liked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const replyBase: CommentReplyResp = {
  id: 3,
  target_type: "article",
  comment_id: 1,
  from_user_id: 7,
  to_user_id: 2,
  parent_reply_id: 0,
  content: "reply",
  like_count: 0,
  is_liked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("profileToUgcUser", () => {
  it("映射展示所需字段", () => {
    expect(profileToUgcUser(profile)).toEqual({
      id: 7,
      username: "alice@example.com",
      nickname: "Alice",
      avatar_url: "https://cdn.example/avatar.png",
      site: "https://alice.example",
      mark: "writer",
      roles: ["user"],
    });
  });
});

describe("enrichCommentAuthor", () => {
  it("缺 user 且为当前用户时补全作者", () => {
    const enriched = enrichCommentAuthor(commentBase, 7, profile);
    expect(enriched.user).toEqual(profileToUgcUser(profile));
  });

  it("已有可展示 user 时不覆盖", () => {
    const withUser = {
      ...commentBase,
      user: { id: 7, username: "bob", nickname: "Bob" },
    };
    expect(enrichCommentAuthor(withUser, 7, profile)).toBe(withUser);
  });

  it("作者不是当前用户时不补全", () => {
    expect(enrichCommentAuthor(commentBase, 99, profile)).toBe(commentBase);
  });
});

describe("enrichGuestbookAuthor", () => {
  it("缺 user 且为当前用户时补全作者", () => {
    const enriched = enrichGuestbookAuthor(guestbookBase, 7, profile);
    expect(enriched.user).toEqual(profileToUgcUser(profile));
  });
});

describe("enrichReplyFromAuthor", () => {
  it("缺 from_user 且为当前用户时补全作者", () => {
    const enriched = enrichReplyFromAuthor(replyBase, 7, profile);
    expect(enriched.from_user).toEqual(profileToUgcUser(profile));
  });
});
