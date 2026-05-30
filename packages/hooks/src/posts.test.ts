import { describe, expect, it } from "vitest";

import { type BlogPost, demoPosts, getPublishedPosts } from "./posts";

describe("getPublishedPosts", () => {
  it("默认只返回已发布文章", () => {
    const result = getPublishedPosts();
    expect(result.every((p) => p.status === "published")).toBe(true);
  });

  it("从自定义列表中过滤已发布文章", () => {
    const posts: BlogPost[] = [
      {
        id: "1",
        title: "A",
        excerpt: "",
        author: "",
        status: "published",
        tag: "",
        readingMinutes: 1,
      },
      { id: "2", title: "B", excerpt: "", author: "", status: "draft", tag: "", readingMinutes: 1 },
    ];
    const result = getPublishedPosts(posts);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("空列表返回空数组", () => {
    expect(getPublishedPosts([])).toHaveLength(0);
  });

  it("全为草稿时返回空数组", () => {
    const posts: BlogPost[] = [
      { id: "1", title: "A", excerpt: "", author: "", status: "draft", tag: "", readingMinutes: 1 },
    ];
    expect(getPublishedPosts(posts)).toHaveLength(0);
  });

  it("返回结果数量与 demoPosts 中已发布文章一致", () => {
    const expected = demoPosts.filter((p) => p.status === "published").length;
    expect(getPublishedPosts()).toHaveLength(expected);
  });
});
