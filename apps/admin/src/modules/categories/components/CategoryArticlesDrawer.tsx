import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, ButtonUtility, Checkbox, Modal, Pagination, SearchField, cn } from "@repo/ui";
import {
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogFrame,
  AdminDialogHeader,
} from "../../../components/AdminDialog";
import { addToast } from "../../../lib/toast";
import { useCategoryArticles } from "../hooks/use-category-articles";
import type { CategoryRow } from "../model";

interface CategoryArticlesDrawerProps {
  category: CategoryRow | null;
  isOpen: boolean;
  onClose: () => void;
  onArticlesChanged?: () => Promise<void>;
}

const drawerModalClassName = cn(
  "max-md:overflow-hidden md:overflow-hidden",
  "md:fixed md:inset-y-0 md:left-auto md:right-0 md:my-0 md:max-h-none md:h-dvh md:w-full md:max-w-md md:rounded-none md:border-l",
);

const drawerPositionerClassName = "md:justify-end md:items-stretch md:p-0";

function ArticleRowItem({
  title,
  excerpt,
  meta,
  trailing,
}: {
  title: string;
  excerpt: string;
  meta?: string;
  trailing: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-border/70 bg-card px-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{excerpt}</p>
        {meta ? <p className="mt-1 text-[11px] text-muted-foreground">{meta}</p> : null}
      </div>
      <div className="shrink-0">{trailing}</div>
    </div>
  );
}

export function CategoryArticlesDrawer({
  category,
  isOpen,
  onClose,
  onArticlesChanged,
}: CategoryArticlesDrawerProps) {
  const {
    rows,
    page,
    totalPages,
    total,
    isLoading,
    error,
    search,
    setSearch,
    setPage,
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
  } = useCategoryArticles({ category, isOpen, onArticlesChanged });

  const handleRemove = async (articleId: string) => {
    try {
      await removeArticle(articleId);
      addToast("已移出分类", "success");
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : "移除失败，请稍后重试", "error");
    }
  };

  const handleAdd = async () => {
    const hasMigration = pickerRows.some(
      (row) => selectedArticleIds.includes(row.id) && row.otherCategory,
    );
    try {
      await addSelectedArticles();
      addToast(hasMigration ? "文章已加入分类，原分类关联已迁移" : "文章已加入分类", "success");
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : "添加失败，请稍后重试", "error");
    }
  };

  const dialogLabel = category ? `管理文章 · ${category.name}` : "管理文章";

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable={!isAdding && removingArticleId === null}
      placement="fullscreen-mobile"
      size="md"
      aria-label={dialogLabel}
      positionerClassName={drawerPositionerClassName}
      modalClassName={drawerModalClassName}
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-x-hidden"
    >
      <AdminDialogFrame>
        <AdminDialogHeader
          eyebrow="分类文章"
          title={<span className="block truncate">{dialogLabel}</span>}
          description={
            isAddViewOpen
              ? "选择要加入的文章；若文章已有分类，将迁移到当前分类。"
              : `共 ${total} 篇文章`
          }
          className="max-md:pt-[max(1rem,env(safe-area-inset-top))]"
          action={
            <ButtonUtility
              tooltip="关闭文章管理"
              color="tertiary"
              icon={<SvgIcon name="close" />}
              isDisabled={isAdding || removingArticleId !== null}
              onClick={onClose}
            />
          }
        />

        <AdminDialogBody contentClassName="py-4 sm:py-5">
          {isAddViewOpen ? (
            <div className="grid min-w-0 gap-4">
              <SearchField
                aria-label="搜索要添加的文章"
                placeholder="搜索标题或摘要"
                value={pickerSearch}
                onChange={setPickerSearch}
                size="sm"
              />
              {pickerError ? (
                <p role="alert" className="text-sm text-destructive">
                  {pickerError.message}
                </p>
              ) : null}
              {isPickerLoading ? <p className="text-sm text-muted-foreground">加载中…</p> : null}
              {!isPickerLoading && pickerRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">未找到可添加的文章</p>
              ) : null}
              <div className="grid min-w-0 gap-2">
                {pickerRows.map((article) => (
                  <label
                    key={article.id}
                    className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-card px-3 py-3"
                  >
                    <Checkbox
                      isSelected={selectedArticleIds.includes(article.id)}
                      onChange={() => toggleSelectedArticle(article.id)}
                      aria-label={`选择 ${article.title}`}
                      className="mt-0.5"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {article.title}
                      </span>
                      <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {article.excerpt}
                      </span>
                      {article.otherCategory ? (
                        <span className="mt-1 block text-[11px] text-amber-700 dark:text-amber-300">
                          当前分类：{article.otherCategory}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
              {pickerTotalPages > 1 ? (
                <Pagination
                  currentPage={pickerPage}
                  totalPages={pickerTotalPages}
                  onPageChange={setPickerPage}
                  className="justify-center border-t-0 pt-0"
                />
              ) : null}
            </div>
          ) : (
            <div className="grid min-w-0 gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <SearchField
                    aria-label="搜索分类内文章"
                    placeholder="搜索标题或摘要"
                    value={search}
                    onChange={setSearch}
                    size="sm"
                  />
                </div>
                <Button size="sm" onPress={openAddView}>
                  <SvgIcon name="plus" size={15} />
                  添加文章
                </Button>
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error.message}
                </p>
              ) : null}
              {isLoading ? <p className="text-sm text-muted-foreground">加载中…</p> : null}
              {!isLoading && rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">该分类下还没有文章</p>
              ) : null}
              <div className="grid min-w-0 gap-2">
                {rows.map((article) => (
                  <ArticleRowItem
                    key={article.id}
                    title={article.title}
                    excerpt={article.excerpt}
                    trailing={
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          isDisabled={removingArticleId === article.id}
                          onPress={() => {
                            void handleRemove(article.id);
                          }}
                        >
                          {removingArticleId === article.id ? "移除中…" : "移除"}
                        </Button>
                        <Link
                          to={`/articles/${article.id}/edit`}
                          className="text-xs text-primary hover:underline"
                        >
                          编辑
                        </Link>
                      </div>
                    }
                  />
                ))}
              </div>
              {totalPages > 1 ? (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  className="justify-center border-t-0 pt-0"
                />
              ) : null}
            </div>
          )}
        </AdminDialogBody>

        <AdminDialogFooter className="max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">
          {isAddViewOpen ? (
            <>
              <Button variant="outline" onPress={closeAddView} isDisabled={isAdding}>
                返回列表
              </Button>
              <Button
                onPress={() => {
                  void handleAdd();
                }}
                isDisabled={selectedArticleIds.length === 0}
                isLoading={isAdding}
                loadingText="添加中…"
              >
                添加 {selectedArticleIds.length > 0 ? selectedArticleIds.length : ""} 篇
              </Button>
            </>
          ) : (
            <Button variant="outline" onPress={onClose}>
              关闭
            </Button>
          )}
        </AdminDialogFooter>
      </AdminDialogFrame>
    </Modal>
  );
}
