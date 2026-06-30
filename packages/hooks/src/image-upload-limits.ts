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
