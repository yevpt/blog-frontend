/** 临时图片上传场景 */
export type TempImageUploadScene = "article" | "comment";

/** POST /uploads/temp 请求（multipart 字段） */
export interface TempImageUploadReq {
  dir: "images" | "covers" | "mobile-covers";
  /** 默认 article；comment 用于留言、评论、回复 */
  scene?: TempImageUploadScene;
}

/** 临时图片上传响应 */
export interface TempUploadResp {
  key: string;
  url: string;
}
