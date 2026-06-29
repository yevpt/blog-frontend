// packages/api/src/errors.ts

/**
 * API 统一错误类，携带后端数字状态码或稳定字符串业务错误码。
 * 调用方用 `err instanceof ApiError` 区分网络错误和业务错误。
 */
export class ApiError extends Error {
  constructor(
    public readonly code: number | string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
