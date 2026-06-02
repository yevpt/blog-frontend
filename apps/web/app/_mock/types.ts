export interface FeaturedPost {
  id: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
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

export interface Snippet {
  id: string;
  author: {
    name: string;
    avatar: string;
    badge: string;
  };
  content: string;
  publishedAt: Date;
  likes: number;
  comments: number;
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
