import type { Visitor } from "./types";

function visitor(
  id: string,
  name: string,
  avatar: string,
  isOnline: boolean,
  activeAt: Date,
): Visitor {
  return {
    id,
    name,
    avatar,
    isOnline,
    lastActiveAt: activeAt,
    lastLoginAt: activeAt,
  };
}

// 10 位最近来访用户，活跃时间分布在过去一年内
export const visitors: Visitor[] = [
  visitor("1", "林晓雨", "https://i.pravatar.cc/48?img=10", true, new Date("2026-05-31T08:22:00")),
  visitor("2", "张博文", "https://i.pravatar.cc/48?img=12", false, new Date("2026-05-30T20:05:00")),
  visitor("3", "苏静怡", "https://i.pravatar.cc/48?img=15", false, new Date("2026-05-29T14:37:00")),
  visitor("4", "陈浩宇", "https://i.pravatar.cc/48?img=17", true, new Date("2026-05-27T11:18:00")),
  visitor("5", "刘明月", "https://i.pravatar.cc/48?img=20", false, new Date("2026-05-25T09:44:00")),
  visitor("6", "周思远", "https://i.pravatar.cc/48?img=22", false, new Date("2026-05-22T17:30:00")),
  visitor("7", "吴嘉欣", "https://i.pravatar.cc/48?img=25", false, new Date("2026-05-19T10:15:00")),
  visitor("8", "郑子轩", "https://i.pravatar.cc/48?img=27", false, new Date("2026-05-15T13:52:00")),
  visitor("9", "许晨曦", "https://i.pravatar.cc/48?img=30", false, new Date("2026-05-10T08:09:00")),
  visitor(
    "10",
    "黄子轩",
    "https://i.pravatar.cc/48?img=40",
    false,
    new Date("2025-06-12T09:00:00"),
  ),
];
