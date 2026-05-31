import type { FeaturedPost } from "./types";

export const featuredPosts: FeaturedPost[] = [
  {
    id: "1",
    title: "构建高质量 React 组件：从设计系统到实战",
    excerpt:
      "深入探讨如何建立可复用的 React 组件库，涵盖 TypeScript 类型设计、样式隔离、无障碍访问和测试策略，让你的前端团队协作更高效。",
    coverImage: "https://picsum.photos/seed/react-components/800/450",
    category: "编程",
    href: "/articles/react-components",
  },
  {
    id: "2",
    title: "我用了一年的效率工具清单",
    excerpt:
      "从笔记软件到终端配置，分享那些真正改变了我工作方式的工具。包含实际使用心得和配置分享，不是广告。",
    coverImage: "https://picsum.photos/seed/productivity/800/450",
    category: "工具",
    href: "/articles/productivity-tools",
  },
  {
    id: "3",
    title: "《百年孤独》：孤独是人类共同的语言",
    excerpt:
      "重读马尔克斯，在魔幻现实主义的叙事里，我看到了现代人与孤独相处的永恒命题。关于记忆、时间与家族命运的随想。",
    coverImage: "https://picsum.photos/seed/loneliness/800/450",
    category: "文学",
    href: "/articles/cien-anos-soledad",
  },
];
