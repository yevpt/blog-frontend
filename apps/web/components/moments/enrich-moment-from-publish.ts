import type { MomentItemResp, MomentPageResp } from "@repo/api";

/** 碎语是否携带可展示的图片投影（含待审 pending_images）。 */
export function momentHasPublishableMedia(moment: MomentItemResp): boolean {
  return (moment.images?.length ?? 0) > 0 || (moment.moderation?.pending_images?.length ?? 0) > 0;
}

/**
 * 列表接口可能省略 pending_images；发布 POST 响应更完整。
 * 同 id 且列表项缺图时，用发布响应补齐 images / moderation。
 */
export function enrichMomentFromPublish(
  fetched: MomentItemResp,
  published: MomentItemResp | null,
): MomentItemResp {
  if (!published || fetched.id !== published.id) {
    return fetched;
  }
  if (momentHasPublishableMedia(fetched)) {
    return fetched;
  }
  if (!momentHasPublishableMedia(published)) {
    return fetched;
  }
  return {
    ...fetched,
    images: published.images,
    moderation: published.moderation,
  };
}

export function mergePageWithPublishedMoment(
  data: MomentPageResp,
  published: MomentItemResp | null,
): MomentPageResp {
  if (!published) {
    return data;
  }
  return {
    ...data,
    list: data.list.map((item) => enrichMomentFromPublish(item, published)),
  };
}
