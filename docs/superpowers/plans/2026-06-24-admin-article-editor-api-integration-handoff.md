# 管理端文章新建/编辑对接任务清单

## 当前基线

- 后端仓库：`/Volumes/External/SynologyDrive/Codes/Blog/blog-backend`
- 前端仓库：`/Volumes/External/SynologyDrive/Codes/Blog/blog-frontend`
- 已补充音乐列表接口：`GET /music`
- 已补充前端 API 方法：`apiClient.music.list()`
- 文章保存接口已存在：`POST /admin/articles`
- 文章管理端详情接口已存在：`GET /admin/articles/:id`

## 目标

把 `apps/admin/src/modules/articles/ArticleEditorPage.tsx` 从静态 mock 页面接入真实后端，支持：

- 新建文章。
- 编辑文章时加载详情并回填。
- 保存草稿。
- 发布文章。
- 使用真实分类、标签、音乐列表。
- 上传封面和正文图片后保存本站对象地址。

## 任务清单

### 1. 补齐 `@repo/api` 文章编辑相关类型

文件：

- `packages/api/src/types/article.ts`
- `packages/api/src/index.ts`

要求：

- 新增 `ArticleSaveReq`。
- 新增/补齐 `AdminArticleDetailResp`。
- 补齐 `ArticleDetailResp` 缺失字段：`passworded`、`category_ids`、`categories`、`tag_ids`、`recommend_seq`。
- 字段名保持后端 snake_case。
- 不使用 `any`。

验收：

- TypeScript 能从 `@repo/api` 导入这些类型。

### 2. 补齐 `@repo/api` 文章编辑方法

文件：

- `packages/api/src/client.ts`
- `packages/api/src/client.test.ts`

要求：

- `apiClient.articles.getAdminDetail(id)` 调 `GET /admin/articles/:id`，使用 `fetchAuthed`。
- `apiClient.articles.saveAdmin(req)` 调 `POST /admin/articles`，使用 `fetchAuthed`。
- 测试覆盖 URL、method、body、Authorization header。

验收：

- `pnpm --filter @repo/api test -- client.test.ts` 通过。

### 3. 补齐临时图片上传 API

文件：

- `packages/api/src/types/upload.ts`
- `packages/api/src/index.ts`
- `packages/api/src/client.ts`
- `packages/api/src/client.test.ts`

要求：

- 定义 `TempUploadResp { key: string; url: string }`。
- 新增 `apiClient.uploads.tempImage(file, dir)`，调 `POST /uploads/temp`。
- `dir` 类型为 `"images" | "covers"`。
- 上传使用 `FormData`，不要手动设置 `Content-Type`。
- 现有 `request()` 默认会设置 JSON `Content-Type`，需要为 multipart 提供专门请求路径，仍保留统一响应解包和 401 刷新逻辑。

验收：

- 测试证明 multipart 请求没有手动 JSON `Content-Type`。
- 上传接口仍携带 Authorization。

### 4. 编辑页加载真实资源选项

文件：

- `apps/admin/src/modules/articles/ArticleEditorPage.tsx`
- 可新增 hook：`apps/admin/src/modules/articles/hooks/use-article-editor-options.ts`
- `apps/admin/src/modules/articles/components/ArticleTagPicker.tsx`
- 对应测试文件。

要求：

- 分类来自 `apiClient.categories.listTabs()`。
- 标签来自 `apiClient.tags.list()`。
- 音乐来自 `apiClient.music.list()`。
- 删除 `editor-options.ts` 中用于生产路径的静态 mock 依赖；测试可在 mock API 中保留测试数据。
- 选项加载失败时显示错误 toast 或页面内错误，不要静默失败。

验收：

- 新建页展示真实分类、标签、音乐选项。
- `ArticleTagPicker` 不再从模块静态导入标签候选，而是由 props 传入候选列表。

### 5. 编辑页加载文章详情

文件：

- `ArticleEditorPage.tsx`
- 可新增 hook：`use-article-editor-detail.ts`
- `ArticleEditorPage.test.tsx`

要求：

- `/articles/new` 使用空白默认值。
- `/articles/:articleId/edit` 调 `apiClient.articles.getAdminDetail(Number(articleId))`。
- 非正整数 articleId 显示可理解错误。
- 回填字段：标题、摘要、正文、封面、分类、标签、音乐、发布状态、评论状态、推荐状态。
- 加密文章如暂不做密码编辑，至少保留 `status: 2` 的显示与保存约束说明，避免误清密码。

验收：

- 编辑路由能显示后端详情。
- loading/error/success 测试覆盖。

### 6. 封面和正文图片上传

文件：

- `ArticleEditorPage.tsx`
- 可新增工具或 hook：`use-article-image-upload.ts`
- `ArticleEditorPage.test.tsx`

要求：

- 封面选择文件后，先调 `apiClient.uploads.tempImage(file, "covers")`，保存返回的 `url` 或 `key`。
- 正文插图通过 RichEditor 的 `onInsertImage` 上传到 `dir="images"` 后插入返回 URL。
- 不再把 `blob:` URL 提交给后端。
- 上传失败要恢复可操作状态并提示错误。

验收：

- 保存请求中的 `cover_img_url` 不是 `blob:`。
- 插入正文图片时调用上传 API。

### 7. 保存草稿和发布文章

文件：

- `ArticleEditorPage.tsx`
- `ArticleEditorPage.test.tsx`

请求映射：

- 保存草稿：`status: 0`
- 发布文章：`status: 1`
- `comment_status` 默认 `1`，若补 UI 则按 UI 值。
- `category_ids` 必须包含一个数字分类 ID。
- 标签优先提交 `tags: selectedTags.map((tag, index) => ({ tag_id: tag.id, seq: index }))`。
- 音乐提交 `music_ids`，没有音乐传空数组。
- 编辑时传 `id`，新建时不传 `id`。
- `recommend` 和 `recommend_seq` 如页面暂未提供控件，可保留后端默认：`false` 和 `0`。

验收：

- 新建保存成功后跳转到编辑页或列表页，并 toast 成功。
- 编辑保存成功后保持在编辑页并用返回值同步状态。
- 后端业务错误展示 `ApiError.message`。

### 8. 测试与验证

必须运行：

- `pnpm --filter @repo/api test -- client.test.ts`
- `pnpm --filter admin test -- src/modules/articles/ArticleEditorPage.test.tsx`
- 如新增 hook，再跑对应 hook 测试。

建议手测：

- 新建草稿。
- 发布文章。
- 编辑旧文章。
- 上传封面。
- 插入正文图片。
- 选择/移除音乐。

## 交付提示词

```text
你是一个执行型编码 agent。请在以下两个仓库中完成“管理端文章新建/编辑页真实接口对接”：

前端仓库：/Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
后端仓库：/Volumes/External/SynologyDrive/Codes/Blog/blog-backend

先阅读前端 AGENTS.md、后端 AGENTS.md，以及本交接文档：
/Volumes/External/SynologyDrive/Codes/Blog/blog-frontend/docs/superpowers/plans/2026-06-24-admin-article-editor-api-integration-handoff.md

严格按文档的任务清单顺序执行。不要重构无关模块，不要使用 any，不要在组件里写裸 fetch；所有前端请求必须走 @repo/api。改组件/Hook/API client 后必须补或更新测试。后端当前已提供 GET /music，文章详情/保存接口也已存在；除非发现阻塞问题，不要再改后端文章保存逻辑。

完成后运行文档列出的测试，并在最终回复中只说明：做了什么、改了哪些文件、验证了什么、剩余风险。
```
