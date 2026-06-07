import { beforeEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ArticleNavbarSync } from "./article-navbar-sync";
import { useActiveArticle } from "@/store/use-active-article";

describe("ArticleNavbarSync", () => {
  beforeEach(() => {
    useActiveArticle.getState().clearArticle();
  });

  it("mount 时把文章信息同步到 store", () => {
    render(
      <ArticleNavbarSync articleId={3} likeCount={17} commentCount={21} isLiked readCount={100} />,
    );

    expect(useActiveArticle.getState()).toMatchObject({
      articleId: 3,
      likeCount: 17,
      commentCount: 21,
      isLiked: true,
      readCount: 100,
    });
  });

  it("unmount 时清空 store，避免切页残留", () => {
    const { unmount } = render(
      <ArticleNavbarSync articleId={3} likeCount={17} commentCount={21} isLiked readCount={100} />,
    );

    unmount();

    expect(useActiveArticle.getState()).toMatchObject({
      articleId: null,
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
      readCount: 0,
    });
  });
});
