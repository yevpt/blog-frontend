import { create } from "zustand";

interface SyncArticleInput {
  articleId: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  readCount: number;
}

interface PatchLikeInput {
  likeCount: number;
  isLiked: boolean;
}

interface ActiveArticleStore {
  articleId: number | null;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  readCount: number;
  syncArticle: (input: SyncArticleInput) => void;
  patchLike: (input: PatchLikeInput) => void;
  patchViewCount: (readCount: number) => void;
  clearArticle: () => void;
}

export const useActiveArticle = create<ActiveArticleStore>((set) => ({
  articleId: null,
  likeCount: 0,
  commentCount: 0,
  isLiked: false,
  readCount: 0,
  syncArticle: ({ articleId, likeCount, commentCount, isLiked, readCount }) =>
    set({ articleId, likeCount, commentCount, isLiked, readCount }),
  patchLike: ({ likeCount, isLiked }) => set({ likeCount, isLiked }),
  patchViewCount: (readCount) => set({ readCount }),
  clearArticle: () =>
    set({
      articleId: null,
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
      readCount: 0,
    }),
}));
