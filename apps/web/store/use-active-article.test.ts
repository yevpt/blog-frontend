import { beforeEach, describe, expect, it } from "vitest";
import { useActiveArticle } from "./use-active-article";

describe("useActiveArticle", () => {
  beforeEach(() => {
    useActiveArticle.getState().clearArticle();
  });

  it("syncArticle 写入当前文章状态", () => {
    useActiveArticle.getState().syncArticle({
      articleId: 8,
      likeCount: 12,
      commentCount: 34,
      isLiked: true,
    });

    expect(useActiveArticle.getState()).toMatchObject({
      articleId: 8,
      likeCount: 12,
      commentCount: 34,
      isLiked: true,
    });
  });

  it("patchLike 只更新点赞相关字段", () => {
    useActiveArticle.getState().syncArticle({
      articleId: 8,
      likeCount: 12,
      commentCount: 34,
      isLiked: false,
    });

    useActiveArticle.getState().patchLike({
      likeCount: 13,
      isLiked: true,
    });

    expect(useActiveArticle.getState()).toMatchObject({
      articleId: 8,
      likeCount: 13,
      commentCount: 34,
      isLiked: true,
    });
  });

  it("clearArticle 清空当前文章状态", () => {
    useActiveArticle.getState().syncArticle({
      articleId: 8,
      likeCount: 12,
      commentCount: 34,
      isLiked: true,
    });

    useActiveArticle.getState().clearArticle();

    expect(useActiveArticle.getState()).toMatchObject({
      articleId: null,
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
    });
  });
});
