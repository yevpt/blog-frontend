# 文章编辑器:轮播删图 + 移动端呼出修复 设计

日期:2026-07-05
状态:已确认

## 背景与目标

文章编辑页正文的多图轮播([2026-07-03-markdown-image-gallery-design.md](2026-07-03-markdown-image-gallery-design.md))和顶层单图,当前存在两个问题:

1. 没有任何"删除这张图片"的按钮,唯一方式是选中图片节点后按 Backspace/Delete。
2. 轮播翻页箭头、"添加图片"按钮全靠 CSS `opacity-0 group-hover:opacity-100` 呼出,移动端没有 hover,这些按钮永远不可见。

## 一、移动端呼出:`can-hover` 自定义变体

`packages/styles/src/base.css` 已有 `@custom-variant dark {...}` 的先例,新增同类简单变体:

```css
@custom-variant can-hover (@media (hover: hover));
```

所有依赖 hover 呼出的覆盖层按钮,可见性类从

```
opacity-0 group-hover:opacity-100 focus-visible:opacity-100
```

统一改为

```
opacity-100 can-hover:opacity-0 can-hover:group-hover:opacity-100 focus-visible:opacity-100
```

即:支持 hover 的设备保持现有的悬浮呼出效果;不支持 hover 的设备(触屏)默认常显,不需要额外交互发现按钮。`disabled:opacity-0` 等既有规则不受影响。

影响范围:`image-gallery-node-view.tsx` 的翻页箭头 + 删除 + 添加图片按钮,`image-node-view.tsx` 的删除 + 添加图片按钮。

## 二、删除按钮

### 轮播(`image-gallery-node-view.tsx`)

- 在计数徽标(`{index+1}/{count}`)同侧新增一个 `trash` 图标按钮,删除**当前正在查看的这一张**。
- 位置定位:遍历 `node`(gallery)的子节点累加 offset,找到当前 `index` 对应子节点的 `pos`,调用 `editor.commands.deleteRange({ from, to: from + child.nodeSize })`。
- 删到只剩 1 张后,现有的 `imageGalleryNormalize` appendTransaction 插件会自动把 gallery 解组为普通 `image` 节点,无需在删除逻辑里特殊处理这一分支。
- `index` 越界的收尾已有 `useEffect(() => { if (index > count - 1) ... })` 兜底,无需新增逻辑。

### 顶层单图(`image-node-view.tsx`)

- 在现有"添加图片"按钮旁新增同款删除按钮,条件为 `isTopLevelImage && hasRemoteSrc && !isPending`——与 `showAddToGallery`(是否显示添加图片按钮)独立判断,即便 gallery 扩展未注册,删除按钮也照常显示。
- 点击调用 `editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize })`,`pos` 取自 `getPos()`。

### 图标

用 `@repo/icons` 已有的 `trash` 图标(`SvgIcon name="trash"`),不新增图标资源。

## 测试(强制)

- `packages/editor/src/__tests__/image-gallery-node-view.test.tsx`:点击删除按钮移除当前图;两张删到一张时自动解组为普通单图(翻页箭头/计数消失)。
- `packages/editor/src/nodes/image-node-view.test.tsx` 或走 `RichEditor` 集成:点击删除按钮后该图片节点从文档消失。
- CSS 媒体查询可见性差异在 jsdom 中不可断言,不额外测试这部分,只验证功能行为正确。

## 风险

- `can-hover:` 是新增自定义 variant,语法参照已验证可用的 `dark` 变体写法,风险低,但仍需跑一次构建/单测确认 Tailwind v4 编译通过。
- 删除逻辑复用 Tiptap 内置 `deleteRange` 命令,不手写 transaction,降低出错面。
