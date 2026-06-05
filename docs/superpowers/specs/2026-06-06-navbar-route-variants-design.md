# Navbar Route Variants 设计规格

**日期**：2026-06-06  
**涉及文件**：`apps/web/components/navbar/site-navbar.tsx`、`navbar-mobile-header.tsx`、`navbar-route-config.ts`、`use-navbar-context.ts`、`apps/web/components/article-detail/article-comments.tsx`

---

## 一、目标

本次导航改造解决两个问题：

- 桌面端导航切换为胶囊态过晚，透明导航已开始压到正文内容
- 移动端所有页面共用同一套头部结构，无法为文章详情页和普通内页提供更高密度的专属导航

本次设计要求优先保证**后续可理解、可追溯、可扩展**，避免把页面判断散落在多个组件中。

---

## 二、核心决策

### 1. 桌面端胶囊阈值固定缩短

当前 `SiteNavbar` 通过顶部哨兵高度控制何时进入 glass/capsule 态。默认阈值由现状的 `60px` 改为 **`24px`**。

这次不做按页面区分阈值，也不做“轻微滚动立即切换”。原因：

- `24px` 足够早，能明显减少透明导航压到正文的时间窗口
- 规则单一，后续排查行为时不需要再问“当前页面是否用了特殊阈值”
- 实现仍然沿用现有 `IntersectionObserver + sentinel` 机制，风险最低

### 2. 移动端导航改为三种显式变体

移动端头部只保留 3 种命名变体：

- `home`：首页，保持现状
- `article`：文章详情页
- `default`：除首页、文章详情页外的普通内页

不做 slot 化自由拼装，不支持页面在调用处随意传 left/center/right 片段。这样能保证“看到变体名就知道页面长什么样”，避免灵活性反过来伤害可维护性。

### 3. 页面归类统一走显式路由配置表

新增 `navbar-route-config.ts` 作为唯一入口，集中声明：

- 哪些 pathname 属于 `home`
- 哪些 pathname 模式属于 `article`
- 哪些 pathname 属于 `default`
- `default` 页面对应的移动端标题

首批普通页配置：

- `/snippets` → `碎语`
- `/guestbook` → `留言`
- `/friends` → `友邻`
- `/circle` → `圈子`

后续新增需要专属移动端导航的页面，也必须先在这份配置表中登记。

---

## 三、组件结构

### 1. `navbar-route-config.ts`

职责：只描述路由与导航场景的映射关系，不写渲染逻辑。

建议导出：

- `MOBILE_NAVBAR_ROUTES`
- `matchNavbarRoute(pathname)`

输出应是语义化结果，例如：

- `kind: "home" | "article" | "default"`
- `title?: string`

### 2. `use-navbar-context.ts`

职责：读取当前 pathname，并把配置解析为统一的 `navbarContext`。

建议包含字段：

- `mobileVariant`
- `title`
- `showHomeBack`
- `showArticleActions`
- `desktopCapsuleThreshold`

这里的价值不在“多一层 hook”，而在于把“路由判断”与“渲染组件”解耦。后续任何人如果要追踪某个页面的 navbar 来源，可以先看 route config，再看 context，再看具体组件。

### 3. `NavbarMobileHeader`

新增一个独立的移动端头部组件，专门负责三种变体的渲染：

- `home`
- `article`
- `default`

`SiteNavbar` 继续作为总装配组件，负责：

- 胶囊态/玻璃态状态
- 菜单开关
- 桌面端结构
- 把 `navbarContext` 传给移动端头部

这样移动端专属改动不会继续堆积到 `SiteNavbar` 单文件内部。

---

## 四、移动端三种结构

### 1. 首页 `home`

保持现有结构与交互，不调整信息架构。

### 2. 文章详情页 `article`

结构：

- 左侧：返回首页按钮
- 中间：留空
- 右侧：点赞按钮、评论按钮、`menu` 按钮

其中点赞与评论按钮都不是角标徽标，而是**按钮本体内的图标 + 数字**：

- 图标在左
- 数字在右
- 数字是可点击区域的一部分
- 计数超过 `99` 显示 `99+`

按钮顺序固定为：`点赞` → `评论` → `menu`

交互：

- 返回按钮：固定跳转首页 `/`
- 点赞按钮：复用文章详情现有点赞能力
- 评论按钮：不打开弹层，平滑滚动到页面评论区
- `menu`：继续打开现有移动端抽屉

### 3. 普通内页 `default`

结构：

- 左侧：返回首页按钮
- 中间：页面标题
- 右侧：`menu` 按钮

交互：

- 返回按钮：固定跳转首页 `/`
- 页面标题：来自 `navbar-route-config.ts` 显式配置，不从页面 DOM 或 metadata 自动猜测
- `menu`：继续打开现有移动端抽屉

---

## 五、文章详情页动作与数据来源

### 1. 点赞按钮

移动端文章详情页头部的点赞按钮应与正文浮动点赞状态保持一致，展示当前点赞数，并复用现有点赞请求逻辑。

如果现有 `ArticleFloatActions` 内部状态无法直接复用，本次允许先抽出更薄的文章交互状态来源，但范围只限于“让顶部按钮和文章页点赞状态一致”，不扩展成全局文章交互系统。

### 2. 评论按钮

评论按钮只负责滚动，不负责打开评论弹层。

评论区根节点新增稳定锚点，例如 `id="article-comments"`。导航层只依赖这个显式锚点进行滚动，避免通过 className、文案或深层 DOM 查找目标。

### 3. 计数展示规则

统一格式化规则：

- `0-99`：显示真实数字
- `>99`：显示 `99+`

建议抽成纯函数，供点赞/评论两个按钮共用，避免分别写展示逻辑。

---

## 六、非功能性约束

### 1. 可追溯性优先

以后排查某个页面为什么显示某种导航，只需要两步：

- 查看 `navbar-route-config.ts`，确认它被归到哪种导航场景
- 查看对应变体组件，确认该场景的渲染结构

不允许在页面组件、layout 或菜单组件中额外塞入一套隐藏判断，破坏这条追踪链路。

### 2. 不引入自由拼装 API

本次不设计类似：

- `leftSlot`
- `rightSlot`
- `renderCenter`

这类 API 虽然灵活，但会让“页面实际长什么样”变得分散，后期读代码时需要来回追 props，违背本次目标。

### 3. 桌面端保持最小改动

桌面端除了把默认阈值改为 `24px` 外，不重做信息架构，不同步引入页面级特化布局，避免让这次改造同时承担两套复杂变化。

---

## 七、测试要求

需要同步补充或更新导航相关测试：

- `SiteNavbar`
  - 默认哨兵阈值从 `60px` 更新为 `24px`
  - 非首页轻微滚动后更早进入 glass/capsule 态
- `NavbarMobileHeader`
  - `home` 变体保持现有移动端结构
  - `article` 变体渲染返回首页、点赞数字按钮、评论数字按钮、menu
  - `default` 变体渲染返回首页、标题、menu
- 路由配置解析
  - `/` 命中 `home`
  - `/articles/[id]` 命中 `article`
  - `/snippets`、`/guestbook`、`/friends`、`/circle` 命中 `default` 且返回正确标题
- 文章评论区锚点
  - 评论区根节点存在稳定 `id`
  - 评论按钮点击时触发滚动到该锚点

本次不要求为未来不存在的页面类型预留测试，只覆盖这三种明确场景。

---

## 八、不在本次范围内

- 移动端 `menu` 抽屉内容重构
- 普通内页标题自动从 metadata 推导
- 桌面端按页面类型定制导航结构
- 评论按钮重新引入弹层交互
- 全站统一的文章交互状态管理重构
