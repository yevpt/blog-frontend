/** 碎语 / 评论 / 文章：选图体积上限（转码/压缩前立即拒绝） */
export const IMAGE_SELECTION_MAX_BYTES = 10 * 1024 * 1024;
/** 头像：选图体积上限 */
export const AVATAR_SELECTION_MAX_BYTES = 3 * 1024 * 1024;

/** 后端 imagefile.DefaultMaxPixels=12_000_000；4032×3024 会超限，前端留余量 */
export const BACKEND_SAFE_MAX_PIXELS = 11_500_000;
/** 碎语 / 评论 / 留言：压缩最长边，确保像素数落在后端安全区内 */
export const INTERACTIVE_IMAGE_MAX_EDGE_PX = 2048;

/** 留言 / 评论临时图：后端 upload.MaxCommentTempImageStoredBytes */
export const COMMENT_IMAGE_COMPRESS_TARGET_BYTES = 500 * 1024;

/** 碎语 / 评论：前端超过该体积才压缩 */
export const INTERACTIVE_IMAGE_COMPRESS_TRIGGER_BYTES = 2 * 1024 * 1024;
/** 碎语 / 评论：前端压缩目标与后端读取冗余上限 */
export const INTERACTIVE_IMAGE_UPLOAD_MAX_BYTES = 3 * 1024 * 1024;
/** 碎语 / 评论：前端压缩输出上限 */
export const INTERACTIVE_IMAGE_COMPRESS_TARGET_BYTES = 2 * 1024 * 1024;

/** 文章：前端仅校验体积，不压缩 */
export const ARTICLE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/** 头像 / 友链：前端超过该体积才压缩 */
export const AVATAR_COMPRESS_TRIGGER_BYTES = 200 * 1024;
/** 头像 / 友链：上传体积上限（与后端 MaxRawAvatarBytes 一致） */
export const AVATAR_UPLOAD_MAX_BYTES = 256 * 1024;

/** GIF 原样上传上限 */
export const GIF_MAX_BYTES = 300 * 1024;
