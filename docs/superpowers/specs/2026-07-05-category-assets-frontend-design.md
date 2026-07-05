# 后台分类可选素材：前端设计

## 目标

完整开放后台分类的新建/编辑能力：分类描述、分类图标、分类封面均为可选项；三者为空时不阻止提交。图标支持 SVG 上传，封面支持位图上传、预览、更换和移除。

本设计只覆盖 `blog-frontend`。后端契约和资源安全策略见 `blog-backend/docs/superpowers/specs/2026-07-05-category-assets-backend-design.md`。

## 当前问题

- `validateCategoryForm` 强制要求描述。
- `CategoryVisualAssetsPlaceholder` 只展示“开发中”，无法上传或移除素材。
- `toCategoryUpdateReq` 故意忽略图标和封面，编辑无法保存这两个字段。
- `CategoryCreateReq.description` 在 TypeScript 中仍是必填。
- 通用临时图片接口不支持 SVG；分类素材应走后端新增的分类专用上传接口。

## 依赖的后端契约

### 上传

- `POST /admin/categories/uploads/icon`
  - multipart 字段：`file`
  - 仅 SVG
- `POST /admin/categories/uploads/cover`
  - multipart 字段：`file`
  - 位图规则与文章封面一致
- 两者统一返回：

```ts
interface CategoryAssetUploadResp {
  key: string;
  url: string;
  size: number;
  mime: string;
}
```

### 保存

`CategoryCreateReq` 与 `CategoryUpdateReq` 中以下字段均可选：

```ts
description?: string;
icon?: string;
cover_img_url?: string;
```

创建请求省略空值；更新请求必须能表达清空：用户主动移除时传空字符串，未改动时可传原值。上传成功后保存请求优先传后端返回的 `key`，不能传 blob URL。

列表和保存响应中的 `icon`、`cover_img_url` 是可直接预览的 URL；后端同时接受本站正式 URL、正式 key 或当前用户刚上传的临时 key。

## 数据层

### `@repo/api`

- 增加 `CategoryAssetUploadResp` 类型并从包入口导出。
- `CategoryCreateReq.description` 改为可选。
- 在 `categories` client 分组增加：
  - `uploadIcon(file)`
  - `uploadCover(file)`
- 两个方法使用 `fetchAuthed`、`FormData`，不手写 `Content-Type`。
- 保持分类创建/更新仍为 JSON 请求。

### 表单值

表单需要同时保存“提交引用”和“预览 URL”：

- 已有素材：提交引用可使用响应中的本站 URL，预览也使用该 URL。
- 新上传素材：提交引用使用 `key`，预览使用 `url`。
- 移除素材：提交引用和预览都清空，并记录该字段已被用户修改。

可用独立的 `CategoryAssetValue { value; previewUrl }`，或等价的精确类型；禁止用 blob URL 作为最终请求值。创建表单空值直接省略；编辑表单主动清空时必须传 `""`。

## UI 与交互

用真实素材编辑区替换 `CategoryVisualAssetsPlaceholder`：

- 分类图标：选择 `.svg`，展示方形预览；提示“SVG，最大 256 KB”。
- 分类封面：选择常见位图，展示横向预览；提示压缩与大小限制。
- 两项均显示“可选”，提供上传/更换、移除操作。
- 上传中显示独立 loading 状态，并禁用保存和关闭弹窗，避免临时资源尚未返回就提交。
- 上传失败保留原素材和其他表单内容，在素材区域或表单底部展示后端错误。
- 移除已上传但尚未保存的素材只清空表单；临时对象由后端清理机制兜底。
- 描述标签去掉必填星号，校验不再报空值错误。
- 继续使用 `@repo/ui` 的 `Button`、`Label` 等组件和 `@repo/icons`，不新增裸基础控件实现；文件 input 可保持原生隐藏控件。

封面上传前复用 `@repo/hooks` 的 `prepareImageForUpload(file, "article")`，与文章封面前端压缩参数一致。SVG 不进入位图压缩管线，只做轻量的扩展名、类型和体积提示；安全校验以后端为准。

如果素材编辑区可被文章/音乐复用且抽象自然，可提取到 `apps/admin/src/components`；否则保留为 categories 私有组件，不为本次需求过度泛化。

## 提交流程

1. 用户填写名称、别名、排序及可选描述。
2. 用户可分别上传图标或封面；上传立即得到临时 `key/url` 并预览。
3. 点击创建/保存时，只校验名称和非负整数排序。
4. mapper 生成请求：
   - 创建：三个可选字段为空则省略。
   - 编辑：素材未改可传原值；主动移除传空字符串；描述允许空字符串以清空。
5. 保存成功后关闭弹窗并刷新分类列表；失败时保留表单状态。

## 测试要求

严格按 TDD，先看到新增测试因旧行为失败，再改生产代码。

### `packages/api`

- 两个上传方法使用正确 URL、POST、`fetchAuthed` 与 `FormData(file)`。
- 分类创建请求允许不含描述、图标、封面。

### categories model

- 空描述不产生校验错误。
- 创建 mapper 省略三个空可选字段。
- 更新 mapper 能保存新素材引用，也能用空字符串清空素材和描述。

### 组件/页面

- 新建时三项全空，仍调用 `onSubmit`。
- 图标 input 只接受 SVG；上传成功后预览并提交返回 key。
- 封面上传调用文章场景的预处理，成功后预览并提交 key。
- 编辑时回显已有素材；更换和移除分别生成正确请求。
- 上传中禁用保存；上传失败不丢失原表单值。
- 删除旧的“开发中”占位断言，补真实交互断言。

建议验证命令：

```bash
pnpm --filter @repo/api test
pnpm --filter admin test
pnpm typecheck
pnpm lint
```

## 范围外

- 不开放任意外链作为新分类素材。
- 不改标签模块的素材占位。
- 不新增前台分类展示样式。
- 不做手动裁剪、SVG 在线编辑或素材库。

## 风险与联调点

- 前端可先按契约完成并 mock 上传，但真实联调依赖后端两个上传端点。
- 后端返回 `key` 和 `url` 的语义必须稳定；请求不得误传预览 blob URL。
- 编辑清空与“未修改”必须区分，否则会误删已有素材。
- SVG 浏览器预览仍只使用后端校验通过后的 URL，不预览未经上传验证的原始文本。

## 可直接交给前端 Agent 的提示词

```text
你负责在 /Users/vpt/Documents/Codes/blog/blog-frontend 独立完成“后台分类可选描述、SVG 图标上传、封面上传”前端实现。

开始前：
1. 阅读仓库根 AGENTS.md。
2. 完整阅读 docs/superpowers/specs/2026-07-05-category-assets-frontend-design.md。
3. 按任务触发并遵守 building-ui、extending-api、writing-tests；修 bug 用 systematic-debugging，实施用 test-driven-development，完成前用 verification-before-completion。
4. 先检查 git status，保留并避开用户已有改动。

实施要求：
- 只改 blog-frontend，不改 backend。
- 复用 @repo/ui、@repo/hooks、@repo/api、@repo/icons，先读各包 src/index.ts，禁止 any、裸 fetch、内联 SVG。
- 先写会因旧行为失败的测试并实际运行确认 RED，再写最小实现至 GREEN。
- 实现 @repo/api 的分类图标/封面上传方法与类型。
- 将分类表单中的描述、图标、封面变为真正可选；图标上传 SVG，封面复用文章场景图片预处理；支持预览、更换、移除、编辑回填和清空。
- 创建时空可选字段省略；编辑主动清空时传空字符串；请求永远不提交 blob URL。
- 删除“开发中”占位行为及对应旧断言，但不顺手改标签模块。
- 后端接口按文档契约实现；测试中 mock 网络，不发送真实请求。

验收：
- 三个可选项全空仍能创建分类。
- 上传、替换、移除在新建/编辑均形成正确请求。
- 相关 @repo/api、model、组件、页面测试通过；再跑 typecheck 与 lint。
- 最终只简要报告改动、验证和残余联调风险，不提交代码，除非我另行要求。
```
