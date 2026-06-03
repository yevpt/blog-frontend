export interface FeaturedPost {
  id: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  date: string;
  href: string;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  publishedAt: Date;
  views: number;
  likes: number;
  comments: number;
  href: string;
}

export interface Visitor {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  visitedAt: Date;
}

import type { IconName } from "@repo/icons";

export interface Tag {
  id: string;
  name: string;
  icon: IconName;
  count: number;
}
