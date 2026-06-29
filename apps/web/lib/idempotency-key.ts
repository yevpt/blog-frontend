/** 审核写请求的业务作用域，仅用于排查和识别幂等键来源。 */
export type IdempotencyScope =
  | "comment"
  | "comment-edit"
  | "reply"
  | "reply-edit"
  | "guestbook"
  | "guestbook-edit"
  | "moment"
  | "moment-edit";

/** 为一次新的逻辑提交生成不超过后端 128 字符限制的幂等键。 */
export function createIdempotencyKey(scope: IdempotencyScope): string {
  return `${scope}:${crypto.randomUUID()}`;
}
