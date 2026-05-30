"use client";

import { useMemo, useState } from "react";

import { demoPosts, type PostStatus } from "./posts";

export function usePostFilter(initialStatus: PostStatus | "all" = "all") {
  // useState 保存当前筛选条件；调用 setStatus 后 React 会重新执行这个 hook 和组件函数。
  const [status, setStatus] = useState<PostStatus | "all">(initialStatus);

  // useMemo 缓存筛选结果，只有 status 改变时才重新过滤文章列表。
  const posts = useMemo(() => {
    if (status === "all") {
      return demoPosts;
    }

    return demoPosts.filter((post) => post.status === status);
  }, [status]);

  return {
    status,
    setStatus,
    posts,
    counts: {
      all: demoPosts.length,
      draft: demoPosts.filter((post) => post.status === "draft").length,
      published: demoPosts.filter((post) => post.status === "published").length,
    },
  };
}
