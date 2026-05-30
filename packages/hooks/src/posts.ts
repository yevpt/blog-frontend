export type PostStatus = "draft" | "published";

export type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  status: PostStatus;
  tag: string;
  readingMinutes: number;
};

// demoPosts 暂时模拟后端数据；真实项目里可以替换成接口请求或数据库查询结果。
export const demoPosts: BlogPost[] = [
  {
    id: "next-ssr",
    title: "用 Next.js 打造 SSR 博客首页",
    excerpt: "展示端默认服务端渲染，首屏更稳定，也更适合 SEO。",
    author: "VPT",
    status: "published",
    tag: "Next.js",
    readingMinutes: 5,
  },
  {
    id: "admin-csr",
    title: "用 React CSR 搭建后台管理台",
    excerpt: "管理端保留纯客户端交互，便于接入复杂表单和权限逻辑。",
    author: "VPT",
    status: "draft",
    tag: "React",
    readingMinutes: 4,
  },
  {
    id: "shared-packages",
    title: "把 hooks 与组件放进 packages",
    excerpt: "共享包导出源码和 types，Next 与 Vite 都能获得完整提示。",
    author: "VPT",
    status: "published",
    tag: "Monorepo",
    readingMinutes: 6,
  },
];

// 纯函数只依赖传入数据，既能在 Next 服务端组件中用，也方便以后写单元测试。
export function getPublishedPosts(posts: BlogPost[] = demoPosts) {
  return posts.filter((post) => post.status === "published");
}
