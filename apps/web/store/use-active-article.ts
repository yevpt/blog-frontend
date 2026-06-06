import { create } from "zustand";

interface SyncArticleInput {
  articleId: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
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
  syncArticle: (input: SyncArticleInput) => void;
  patchLike: (input: PatchLikeInput) => void;
  clearArticle: () => void;
}

export const useActiveArticle = create<ActiveArticleStore>((set) => ({
  articleId: null,
  likeCount: 0,
  commentCount: 0,
  isLiked: false,
  syncArticle: ({ articleId, likeCount, commentCount, isLiked }) =>
    set({ articleId, likeCount, commentCount, isLiked }),
  patchLike: ({ likeCount, isLiked }) => set({ likeCount, isLiked }),
  clearArticle: () =>
    set({
      articleId: null,
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
    }),
}));
