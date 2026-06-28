import type { ArticleListItemResp } from "@repo/api";
import type { FeaturedPost } from "@/app/_mock/types";

/** 按视口解析文章封面 URL：移动端优先 mobile_cover_img_url，桌面端优先 cover_img_url。 */
export function resolveArticleCoverUrl(
  article: Pick<ArticleListItemResp, "cover_img_url" | "mobile_cover_img_url">,
  viewport: "mobile" | "desktop",
): string | undefined {
  const desktop = article.cover_img_url?.trim();
  const mobile = article.mobile_cover_img_url?.trim();

  if (viewport === "mobile") {
    return mobile || desktop || undefined;
  }
  return desktop || mobile || undefined;
}

/** 将 FeaturedPost 映射为指定视口下应展示的封面。 */
export function resolveFeaturedPostForViewport(
  post: FeaturedPost,
  viewport: "mobile" | "desktop",
): FeaturedPost {
  const coverImage = resolveArticleCoverUrl(
    { cover_img_url: post.coverImage, mobile_cover_img_url: post.mobileCoverImage },
    viewport,
  );
  if (!coverImage || coverImage === post.coverImage) {
    return post;
  }
  return { ...post, coverImage };
}
