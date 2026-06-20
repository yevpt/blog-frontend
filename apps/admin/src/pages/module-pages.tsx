import { ArticlesPage } from "../modules/articles";
import { ModulePlaceholder } from "./ModulePlaceholder";

export { ArticlesPage };

export function PinnedArticlesPage() {
  return (
    <ModulePlaceholder
      title="置顶管理"
      icon="arrow-up"
      description="管理文章置顶顺序、展示优先级与前台推荐位。"
    />
  );
}

export function ArticleEditorPage() {
  return (
    <ModulePlaceholder
      title="编辑文章"
      icon="pen"
      description="编辑文章标题、正文、分类、标签与发布状态。"
    />
  );
}

export function CategoriesPage() {
  return (
    <ModulePlaceholder
      title="分类管理"
      icon="folder"
      description="维护内容分类、层级关系与前台展示顺序。"
    />
  );
}

export function TagsPage() {
  return (
    <ModulePlaceholder
      title="标签管理"
      icon="tag"
      description="整理标签字典与文章关联，保持内容检索清晰。"
    />
  );
}

export function MusicPage() {
  return (
    <ModulePlaceholder
      title="音乐管理"
      icon="music"
      description="维护站点音乐收藏、来源信息与展示状态。"
    />
  );
}

export function LinksPage() {
  return (
    <ModulePlaceholder
      title="友链管理"
      icon="link"
      description="管理友情链接、站点描述与审核展示状态。"
    />
  );
}
