import type { Visitor } from "./types";

// 9 位最近来访用户，visitedAt 分布在过去 30 天内
export const visitors: Visitor[] = [
  {
    id: "1",
    name: "林晓雨",
    avatar: "https://i.pravatar.cc/48?img=10",
    visitedAt: new Date("2026-05-31T08:22:00"),
  },
  {
    id: "2",
    name: "张博文",
    avatar: "https://i.pravatar.cc/48?img=12",
    visitedAt: new Date("2026-05-30T20:05:00"),
  },
  {
    id: "3",
    name: "苏静怡",
    avatar: "https://i.pravatar.cc/48?img=15",
    visitedAt: new Date("2026-05-29T14:37:00"),
  },
  {
    id: "4",
    name: "陈浩宇",
    avatar: "https://i.pravatar.cc/48?img=17",
    visitedAt: new Date("2026-05-27T11:18:00"),
  },
  {
    id: "5",
    name: "刘明月",
    avatar: "https://i.pravatar.cc/48?img=20",
    visitedAt: new Date("2026-05-25T09:44:00"),
  },
  {
    id: "6",
    name: "周思远",
    avatar: "https://i.pravatar.cc/48?img=22",
    visitedAt: new Date("2026-05-22T17:30:00"),
  },
  {
    id: "7",
    name: "吴嘉欣",
    avatar: "https://i.pravatar.cc/48?img=25",
    visitedAt: new Date("2026-05-19T10:15:00"),
  },
  {
    id: "8",
    name: "郑子轩",
    avatar: "https://i.pravatar.cc/48?img=27",
    visitedAt: new Date("2026-05-15T13:52:00"),
  },
  {
    id: "9",
    name: "许晨曦",
    avatar: "https://i.pravatar.cc/48?img=30",
    visitedAt: new Date("2026-05-10T08:09:00"),
  },
];
