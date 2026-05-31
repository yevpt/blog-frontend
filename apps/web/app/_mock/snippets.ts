import type { Snippet } from "./types";

// 6 条碎语，有短的也有超过 4 行需要截断的
export const snippets: Snippet[] = [
  {
    id: "1",
    author: {
      name: "叶云",
      avatar: "https://i.pravatar.cc/48?img=1",
      badge: "博主",
    },
    content:
      "今天把 monorepo 的依赖关系整理了一遍，发现以前有几个包之间存在循环依赖，顺手解掉了。看着干净的依赖图，感觉神清气爽。",
    publishedAt: new Date("2026-05-30T09:15:00"),
    likes: 32,
    comments: 7,
  },
  {
    id: "2",
    author: {
      name: "林浩",
      avatar: "https://i.pravatar.cc/48?img=3",
      badge: "前端工程师",
    },
    content:
      '用了一周 Cursor，感受：对新文件生成效率极高，对旧代码的理解还是差一口气。最大的问题是它有时候会"自信地出错"，你必须保持足够的警惕，不能完全放手。总体来说是正向收益，但不是魔法。',
    publishedAt: new Date("2026-05-28T14:30:00"),
    likes: 58,
    comments: 12,
  },
  {
    id: "3",
    author: {
      name: "陈曦",
      avatar: "https://i.pravatar.cc/48?img=5",
      badge: "设计师",
    },
    content: "把所有的通知都关了，只留电话。安静了好多。",
    publishedAt: new Date("2026-05-26T19:00:00"),
    likes: 89,
    comments: 15,
  },
  {
    id: "4",
    author: {
      name: "王芸",
      avatar: "https://i.pravatar.cc/48?img=7",
      badge: "产品经理",
    },
    content:
      '做用户调研的时候，最有价值的往往不是用户说"我需要什么功能"，而是他们在描述当前工作流程时无意间透露出的痛点和变通方案。真正的需求藏在细节里，不在问卷里。\n\n今天和三位用户聊了将近两个小时，收获颇丰。下周准备做一个需求优先级的重新排列。',
    publishedAt: new Date("2026-05-24T11:20:00"),
    likes: 47,
    comments: 9,
  },
  {
    id: "5",
    author: {
      name: "赵远",
      avatar: "https://i.pravatar.cc/48?img=2",
      badge: "独立开发者",
    },
    content:
      "独立开发第 8 个月，产品上线了，用户还在慢慢涨。最大的挑战不是技术，是孤独感——没有同事讨论想法，没有人 review 你的代码，没有人分担焦虑。\n\n解决方案：加入了一个独立开发者的小社群，每周五下午同步进展。有时候只是知道有人在做类似的事，就够了。",
    publishedAt: new Date("2026-05-21T16:45:00"),
    likes: 124,
    comments: 28,
  },
  {
    id: "6",
    author: {
      name: "叶云",
      avatar: "https://i.pravatar.cc/48?img=1",
      badge: "博主",
    },
    content: "读完《置身事内》，推荐给每一个想搞懂中国经济逻辑的朋友。",
    publishedAt: new Date("2026-05-18T21:10:00"),
    likes: 61,
    comments: 11,
  },
];
