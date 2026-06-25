/**
 * 碎语图片项：同时支持本地新增文件与已上传远程图片。
 * - 新建/编辑新增：file 必填，previewUrl 为本地 blob
 * - 编辑已有：remoteUrl 必填，file 为空，previewUrl 通常等于 remoteUrl
 */
export interface MomentImageItem {
  id: string;
  /** 本地选中的图片文件；新建或编辑新增时使用 */
  file?: File;
  /** 已有远程图片地址；编辑时使用，不触发上传 */
  remoteUrl?: string;
  /** 预览/显示用的 URL：本地为 blob，远程为 remoteUrl */
  previewUrl: string;
}
