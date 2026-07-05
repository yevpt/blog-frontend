# 碎语详情页 设计

日期:2026-07-05
状态:已确认

## 背景与目标

碎语目前只有列表页 `/moments`,没有单条详情路由。导致两处深链无法定位到具体内容:

- 消息通知([notification-target.ts](../../../apps/web/components/notifications/notification-target.ts)):`root_type === "moment"` 时跳转目标固定为 `/moments`。
- 个人主页「赞过」列表([liked-content-format.ts](../../../apps/web/app/users/[id]/_components/profile-likes-tab/liked-content-format.ts)):`kind === "moment"` 或评论/回复的 `root.kind === "moment"` 时,同样只能跳回 `/moments`。

目标:新增 `/moments/[id]` 详情页,并修正上述两处跳转,指向具体碎语。

后端已支持 `GET /moments/{id}`,返回结构与列表用的 `MomentItemResp` 完全一致(图片、点赞数、评论数、审核视图),不需要新类型;404/401/500 语义与文章详情一致。

## 一、路由与数据获取

新增 `apps/web/app/moments/[id]/page.tsx`,Server Component,照抄 `articles/[id]/page.tsx` 的取数/404 模式:

```ts
const api = await createServerApiClient();
let moment;
try {
  moment = await api.moments.getDetail(momentId);
} catch {
  notFound();
}
```

`packages/api/src/client.ts` 的 `moments` 里新增:

```ts
/** 查询单条碎语详情，未登录可访问，登录态返回 is_liked */
getDetail: (id: number) => fetchOptionalAuth<MomentItemResp>(`/moments/${id}`, { method: "GET" }),
```

位置紧邻现有 `view` 方法,风格与 `articles.getDetail` 对称。

`page.tsx` 用 `PageContainer size="narrow"`(680px,与评论区宽度接近),内部渲染 `MomentDetail` + `MomentComments`。

不新增 `moments.view` 阅读上报调用:该接口后端已存在,但 `articles.view` 目前在前端也没有任何调用方,说明阅读数由后端 GET 时自行处理,本次不额外画蛇添足。

## 二、Metadata / SEO

`generateMetadata` 对齐文章详情页:

- `title`:碎语正文截取前 30 字(超出加 `"…"`)+ `" | Yevpt's Blog"`;正文为空(纯图片)时用 `"碎语 | Yevpt's Blog"`。
- `description`:正文原文(过长交给 description 自然截断,不用手动 slice)。
- `canonical`:`getCanonicalUrl(`/moments/${moment.id}`)`。
- `openGraph`:`images` 取 `moment.images[0]?.access_url`(仅当 `display_mode === "original"` 时使用,避免把模糊预览图/占位图当封面)。
- `getDetail` 抛错时返回兜底 `{ title: "碎语 | Yevpt's Blog" }`,与文章一致。

## 三、展示层:复用 MomentCard,不新建卡片样式

新增 `components/moments/moment-detail.tsx`("use client"),职责:

- 接收 SSR 传入的 `initialMoment: MomentItemResp`
- 用新 hook `useMomentDetail(initialMoment)` 管理点赞/编辑/置顶/删除
- 渲染 `<MomentCard moment={moment} layout="standalone" onLike={...} onEdit={...} onToggleTop={...} onDelete={...} onComment={scrollToComments} />`
- `scrollToComments`:`document.getElementById("moment-detail-comments")?.scrollIntoView({ behavior: "smooth" })`,让评论按钮在详情页里从"打开弹窗"变成"跳到下方评论区",而不是无反应的死按钮

`MomentCard` 本身不用改一行——审核占位、图片查看器、编辑器回显都已经是通用逻辑。

### `useMomentDetail` hook(新建 `hooks/use-moment-detail.ts`)

是 `use-moment-list.ts` 里 `toggleLike/updateMoment/toggleTop/deleteMoment` 四个函数的单条目版本:状态从"数组 + pendingIds Set"简化成"单个 moment + 一个 pending 布尔值"。四个函数调用的 BFF 路由(`/api/moments/{id}/like`、`/top`、`/moments` POST、DELETE)、错误提示文案、401 兜底弹登录框逻辑与列表版保持一致。

不强行让它和 `use-moment-list.ts` 共用同一个 hook:两边状态形状(数组+Set vs 单值+布尔)差异大,硬拆共享层反而多一层抽象成本。但把两边都要用到的"图片数组打包成 FormData"这段(`use-moment-list.ts` 现有 `updateMoment` 里那段 `images.forEach(...)` 循环)提取成共享纯函数 `packMomentImagesFormData(form, images)`(新建 `components/moments/pack-moment-images-form-data.ts`),避免这段逻辑复制两遍。`use-moment-list.ts` 里同步改成调用这个新函数。

删除成功后 `useMomentDetail` 调用 `router.push("/moments")`(用 `next/navigation` 的 `useRouter`),因为详情页对应的内容已经不存在了。

编辑走复用现有全局 `useMomentModal`(`store/use-moment-modal.ts`),和列表页 `openEdit` 的写法一致。

## 四、评论区:内联展示

新增 `components/moments/moment-comments.tsx`,结构照抄 `article-detail/article-comments.tsx`:

```tsx
<section id="moment-detail-comments" className="mx-auto max-w-[680px] border-t border-border px-2 pb-20 pt-10 md:px-0">
  <h2>评论 {commentCount} 条</h2>
  <InlineComments targetType="moment" targetId={momentId} expectedCommentCount={commentCount} onCommentAdded={...} />
</section>
```

`InlineComments` 已经原生支持 `targetType: "moment"`,评论列表、回复、点赞评论都不用新开发。

`id="moment-detail-comments"` 与上面 `MomentDetail` 的 `scrollToComments` 锚点对应。

## 五、修正两处跳转

**[notification-target.ts](../../../apps/web/components/notifications/notification-target.ts)**:

```ts
if (item.root_type === "moment") {
  return `/moments/${item.root_id}`;
}
```

**[liked-content-format.ts](../../../apps/web/app/users/[id]/_components/profile-likes-tab/liked-content-format.ts)** 的 `getLikedContentRootHref`:

```ts
if (item.kind === "moment") {
  if (item.content.deleted) return null;
  return `/moments/${item.content.id}`;
}
...
if (root.kind === "moment") {
  return `/moments/${root.id}${buildCommentAnchor(item.content.id)}`;
}
```

后一处(评论/回复的根是碎语)沿用和文章分支相同的 `#comment-{id}` 锚点写法,即便当前评论系统还不支持锚点自动滚动定位——这是评论系统本身的既有缺口,文章那边现在也是同样状况,不在本次范围内一起修。

## 测试(强制)

- `apps/web/app/moments/[id]/page.test.tsx`:仿 `articles/[id]/page.test.tsx`,mock `createServerApiClient`,验证正常渲染、`getDetail` 抛错时 `notFound()` 被调用、metadata 生成(含无正文纯图片场景的 title 兜底)。
- `apps/web/components/moments/moment-detail.test.tsx`:点赞/编辑/置顶/删除交互正确调用 hook;点击评论按钮触发 `scrollIntoView`。
- `apps/web/hooks/use-moment-detail.test.ts`:四个操作的成功/失败分支(401 弹登录框、其它错误 toast、删除成功后 `router.push`)。
- `apps/web/components/moments/moment-comments.test.tsx`:透传 `targetType="moment"` 和 `targetId` 给 `InlineComments`,评论数增加时计数联动。
- `apps/web/components/moments/pack-moment-images-form-data.test.ts`:本地文件 + 远程图片混合场景打包正确。
- `packages/api/src/client.test.ts`:新增 `moments.getDetail` 用例。
- 更新 `notification-target.test.ts`、`liked-content-format.test.ts` 里 moment 相关断言的期望路径。

## 风险

- `getDetail` 复用 `fetchOptionalAuth`,和文章一致,风险低。
- `useMomentDetail` 与 `use-moment-list.ts` 存在结构相似但不共享的重复代码(点赞/置顶/删除三段 try/catch),这是有意为之的取舍(见上文),不是遗漏。
- 评论锚点跳转不会真正滚动定位,是继承自现有评论系统的已知缺口,非本次引入。
