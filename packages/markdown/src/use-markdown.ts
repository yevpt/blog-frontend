"use client";

import { useState, useEffect } from "react";

/**
 * 异步 markdown 渲染 hook。
 *
 * 接受 renderFn 而不是直接导入 Server Action，使 hook 与具体渲染实现解耦，
 * 各 app（web/admin）可注入自己的 renderMarkdown Server Action。
 *
 * @param content  原始 Markdown 字符串
 * @param renderFn 将 Markdown 转换为 HTML 的异步函数（通常是 Server Action）
 */
export function useMarkdown(
  content: string,
  renderFn: (content: string) => Promise<string>,
): { html: string | null; isLoading: boolean; error: string | null } {
  const [html, setHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // isMounted 防止组件卸载后异步回调更新已销毁组件的状态（竞态保护）
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    renderFn(content)
      .then((result) => {
        if (isMounted) {
          setHtml(result);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [content, renderFn]);

  return { html, isLoading, error };
}
