import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@repo/api";
import { apiClient } from "../../../lib/api";
import {
  isCategoryArticleAddCandidate,
  mapAdminArticleToCategoryArticleRow,
  type CategoryArticleRow,
  type CategoryRow,
} from "../model";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export interface UseCategoryArticlesOptions {
  category: CategoryRow | null;
  isOpen: boolean;
  onArticlesChanged?: () => Promise<void>;
}

export interface UseCategoryArticlesResult {
  rows: CategoryArticleRow[];
  page: number;
  totalPages: number;
  total: number;
  isLoading: boolean;
  error: Error | null;
  search: string;
  setSearch: (value: string) => void;
  setPage: (page: number) => void;
  refetch: () => Promise<void>;
  removeArticle: (articleId: string) => Promise<void>;
  removingArticleId: string | null;
  isAddViewOpen: boolean;
  openAddView: () => void;
  closeAddView: () => void;
  pickerRows: CategoryArticleRow[];
  pickerPage: number;
  pickerTotalPages: number;
  pickerSearch: string;
  setPickerSearch: (value: string) => void;
  setPickerPage: (page: number) => void;
  isPickerLoading: boolean;
  pickerError: Error | null;
  selectedArticleIds: string[];
  toggleSelectedArticle: (articleId: string) => void;
  addSelectedArticles: () => Promise<void>;
  isAdding: boolean;
}

export function useCategoryArticles({
  category,
  isOpen,
  onArticlesChanged,
}: UseCategoryArticlesOptions): UseCategoryArticlesResult {
  const categoryId = category ? Number(category.id) : null;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<CategoryArticleRow[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [removingArticleId, setRemovingArticleId] = useState<string | null>(null);

  const [isAddViewOpen, setIsAddViewOpen] = useState(false);
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerSearch, setPickerSearch] = useState("");
  const [debouncedPickerSearch, setDebouncedPickerSearch] = useState("");
  const [pickerRows, setPickerRows] = useState<CategoryArticleRow[]>([]);
  const [pickerTotalPages, setPickerTotalPages] = useState(0);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<Error | null>(null);
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const previousDebouncedSearchRef = useRef(debouncedSearch);
  const previousDebouncedPickerSearchRef = useRef(debouncedPickerSearch);

  const refetch = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  const openAddView = useCallback(() => {
    setIsAddViewOpen(true);
    setPickerPage(1);
    setPickerSearch("");
    setDebouncedPickerSearch("");
    setSelectedArticleIds([]);
    setPickerError(null);
  }, []);

  const closeAddView = useCallback(() => {
    setIsAddViewOpen(false);
    setSelectedArticleIds([]);
    setPickerError(null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsAddViewOpen(false);
      setSearch("");
      setDebouncedSearch("");
      setPage(1);
      setSelectedArticleIds([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedPickerSearch(pickerSearch.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [pickerSearch]);

  useEffect(() => {
    if (previousDebouncedSearchRef.current === debouncedSearch) return;
    previousDebouncedSearchRef.current = debouncedSearch;
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (previousDebouncedPickerSearchRef.current === debouncedPickerSearch) return;
    previousDebouncedPickerSearchRef.current = debouncedPickerSearch;
    setPickerPage(1);
  }, [debouncedPickerSearch]);

  useEffect(() => {
    if (!isOpen || categoryId === null) return;

    let cancelled = false;

    async function loadCategoryArticles() {
      setIsLoading(true);
      setError(null);

      try {
        const resp = await apiClient.articles.listAdmin({
          page,
          page_size: PAGE_SIZE,
          category_id: categoryId ?? undefined,
          search: debouncedSearch || undefined,
        });
        if (cancelled) return;
        setRows(resp.list.map((item) => mapAdminArticleToCategoryArticleRow(item)));
        setTotalPages(resp.pages);
        setTotal(resp.total);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载分类文章失败"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadCategoryArticles();

    return () => {
      cancelled = true;
    };
  }, [isOpen, categoryId, page, debouncedSearch, reloadToken]);

  useEffect(() => {
    if (!isOpen || categoryId === null || !isAddViewOpen) return;

    let cancelled = false;

    async function loadPickerArticles() {
      setIsPickerLoading(true);
      setPickerError(null);

      try {
        const resp = await apiClient.articles.listAdmin({
          page: pickerPage,
          page_size: PAGE_SIZE,
          search: debouncedPickerSearch || undefined,
        });
        if (cancelled) return;
        const candidates = resp.list
          .filter((item) => isCategoryArticleAddCandidate(item, categoryId!))
          .map((item) => mapAdminArticleToCategoryArticleRow(item, categoryId!));
        setPickerRows(candidates);
        setPickerTotalPages(resp.pages);
      } catch (err) {
        if (cancelled) return;
        setPickerError(err instanceof Error ? err : new Error("加载文章候选失败"));
      } finally {
        if (!cancelled) setIsPickerLoading(false);
      }
    }

    void loadPickerArticles();

    return () => {
      cancelled = true;
    };
  }, [isOpen, categoryId, isAddViewOpen, pickerPage, debouncedPickerSearch, reloadToken]);

  const toggleSelectedArticle = useCallback((articleId: string) => {
    setSelectedArticleIds((current) =>
      current.includes(articleId)
        ? current.filter((id) => id !== articleId)
        : [...current, articleId],
    );
  }, []);

  const removeArticle = useCallback(
    async (articleId: string) => {
      if (categoryId === null) return;

      setRemovingArticleId(articleId);
      try {
        await apiClient.categories.removeArticles(categoryId, {
          article_ids: [Number(articleId)],
        });
        await refetch();
        await onArticlesChanged?.();
      } catch (err) {
        throw err instanceof ApiError ? err : new Error("移除文章失败");
      } finally {
        setRemovingArticleId(null);
      }
    },
    [categoryId, onArticlesChanged, refetch],
  );

  const addSelectedArticles = useCallback(async () => {
    if (categoryId === null || selectedArticleIds.length === 0) return;

    setIsAdding(true);
    try {
      await apiClient.categories.addArticles(categoryId, {
        article_ids: selectedArticleIds.map(Number),
      });
      closeAddView();
      await refetch();
      await onArticlesChanged?.();
    } catch (err) {
      throw err instanceof ApiError ? err : new Error("添加文章失败");
    } finally {
      setIsAdding(false);
    }
  }, [categoryId, closeAddView, onArticlesChanged, refetch, selectedArticleIds]);

  return useMemo(
    () => ({
      rows,
      page,
      totalPages,
      total,
      isLoading,
      error,
      search,
      setSearch,
      setPage,
      refetch,
      removeArticle,
      removingArticleId,
      isAddViewOpen,
      openAddView,
      closeAddView,
      pickerRows,
      pickerPage,
      pickerTotalPages,
      pickerSearch,
      setPickerSearch,
      setPickerPage,
      isPickerLoading,
      pickerError,
      selectedArticleIds,
      toggleSelectedArticle,
      addSelectedArticles,
      isAdding,
    }),
    [
      addSelectedArticles,
      closeAddView,
      error,
      isAddViewOpen,
      isAdding,
      isLoading,
      isPickerLoading,
      openAddView,
      page,
      pickerError,
      pickerPage,
      pickerRows,
      pickerSearch,
      pickerTotalPages,
      refetch,
      removeArticle,
      removingArticleId,
      rows,
      search,
      selectedArticleIds,
      toggleSelectedArticle,
      total,
      totalPages,
    ],
  );
}
