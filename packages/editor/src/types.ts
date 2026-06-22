/**
 * ================================================================
 * @repo/editor — 公共类型定义
 * ================================================================
 *
 * 设计原则：RichEditor 不感知"数据从哪里来"。
 * InsertHandlers 中的每个 handler 接收一个 insert 回调，
 * 调用方决定如何获取数据，然后调用 insert() 将内容插入编辑器。
 *
 * 评论场景：handler 打开 URL 对话框 → 用户填写 → 调用 insert()
 * 文章编辑器场景（未来）：handler 打开文件选择 → 上传到 OSS → 调用 insert()
 * ================================================================
 */

/**
 * 图片、链接、代码块的插入行为注入接口。
 * 三者均为可选：未提供时，对应工具栏按钮不渲染。
 */
export interface InsertHandlers {
  /**
   * 工具栏点击图片按钮时触发。
   * @param insert 将图片插入编辑器的函数，url 必填，alt 可选
   * @example
   * onInsertImage={(insert) => {
   *   openImageDialog((url, alt) => insert(url, alt));
   * }}
   */
  onInsertImage?: (insert: (url: string, alt?: string) => void) => void;

  /**
   * 工具栏点击链接按钮时触发。
   * @param insert 将链接插入编辑器的函数，url 必填，title 可选
   */
  onInsertLink?: (insert: (url: string, title?: string) => void) => void;

  /**
   * 工具栏点击代码块按钮时触发。
   * @param insert 将代码块插入编辑器的函数，code 必填，lang 必填（纯文本传 "plaintext"）
   */
  onInsertCode?: (insert: (code: string, lang: string) => void) => void;
}

/**
 * @提及候选项。
 * 由调用方传入；后端用户搜索 API 就绪后用真实数据替换。
 */
export interface MentionItem {
  /** 用户唯一标识，存储在 ProseMirror 节点的 data-id 属性中 */
  id: string;
  /** 显示名称：下拉列表展示，序列化为 @label */
  label: string;
}

/** RichEditor 组件完整 props */
export interface RichEditorProps extends InsertHandlers {
  /** 渲染在编辑区上方（容器内部）的自定义内容，常用于回复指示条 */
  header?: React.ReactNode;

  /** 编辑器实例首次创建完成时触发；弹窗等需要依据编辑器真实高度重测布局的场景使用 */
  onReady?: () => void;

  /** 变化时触发编辑器 focus，适用于切换回复对象后自动聚焦 */
  focusTrigger?: unknown;

  /**
   * 受控 Markdown 字符串。
   * 仅在 editor 首次创建时作为初始内容读取；
   * 后续变更通过 onChange 通知父组件，父组件不需要将更新后的值再传回。
   */
  value: string;

  /** 每次编辑器内容变化时触发，参数为当前 Markdown 字符串 */
  onChange: (markdown: string) => void;

  placeholder?: string;

  /** 禁用编辑器（如提交中）时传 true */
  disabled?: boolean;

  /**
   * @提及候选列表。
   * 当前为空（等待后端 /users/search API）；
   * 有数据时自动展示下拉列表。
   */
  mentionSuggestions?: MentionItem[];

  /** 工具栏发送按钮点击回调 */
  onSubmit?: () => void;

  /** 发送中状态，传 true 时发送按钮显示 loading 并禁用 */
  isSubmitting?: boolean;

  /** 业务层额外的提交禁用条件（如内容超出字数上限）；传 true 时禁用发送按钮 */
  submitDisabled?: boolean;

  /**
   * 当前用户是否已登录。
   * - 未提供时（undefined）：向后兼容，按已登录处理
   * - false：提交按钮替换为「请先登录」，点击触发 onLoginRequired
   */
  isLoggedIn?: boolean;

  /** 用户未登录时点击提交按钮的回调，通常用于打开登录弹窗 */
  onLoginRequired?: () => void;

  className?: string;
}
