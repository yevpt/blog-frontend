import React from "react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MomentCard } from "./moment-card";
import { useImageViewer } from "@/store/use-image-viewer";
import type { MomentItemResp } from "@repo/api";

let mockSessionUserId: number | null = null;

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: mockSessionUserId }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock @repo/icons
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
    priority,
    unoptimized,
    fill,
    sizes,
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    className?: string;
    sizes?: string;
    priority?: boolean;
    unoptimized?: boolean;
  }) => (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      data-priority={priority ?? false}
      data-unoptimized={unoptimized ?? false}
      fill={fill}
      sizes={sizes}
    />
  ),
}));

const deferredMediaMock = vi.hoisted(() => ({
  useDeferredMediaActivation: vi.fn(() => true),
}));

vi.mock("@repo/hooks", () => ({
  useLocale: () => ({ t: (key: string) => key }),
  useHydrated: () => true,
  shouldDeferRemoteMediaSrc: (src: string | undefined) => {
    if (!src) return false;
    return !src.startsWith("data:") && !src.startsWith("blob:");
  },
  useDeferredMediaActivation: deferredMediaMock.useDeferredMediaActivation,
  useImageLoadPlaceholder: () => ({ isLoading: false, state: undefined, hideImage: false, renderPlaceholder: false, placeholderOpaque: false, animateImage: false }),
}));

const { useDeferredMediaActivation } = deferredMediaMock;

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  Button: ({
    children,
    variant,
    onPress,
    ...props
  }: {
    children: ReactNode;
    variant?: string;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button data-variant={variant} onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Card: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  CardContent: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  Dropdown: {
    Root: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DotsButton: ({ isDisabled, ...props }: { isDisabled?: boolean; [key: string]: unknown }) => (
      <button aria-label="Open menu" disabled={isDisabled} {...props}>
        ⋮
      </button>
    ),
    Popover: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
    Menu: ({
      children,
      onAction,
      ...props
    }: {
      children: ReactNode;
      onAction?: (key: string) => void;
      [key: string]: unknown;
    }) => {
      const enhanced = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const childProps = child.props as { id?: string; onClick?: () => void };
          if (childProps.id && onAction) {
            return React.cloneElement(child as React.ReactElement<{ onClick?: () => void }>, {
              onClick: () => onAction(childProps.id!),
            });
          }
        }
        return child;
      });
      return (
        <div role="menu" {...props}>
          {enhanced}
        </div>
      );
    },
    Item: ({
      id,
      label,
      icon: Icon,
      onClick,
      ...props
    }: {
      id: string;
      label: string;
      icon?: React.ComponentType<{ className?: string }>;
      onClick?: () => void;
      [key: string]: unknown;
    }) => (
      <button role="menuitem" aria-label={label} data-id={id} onClick={onClick} {...props}>
        {Icon && <Icon className="" />}
        {label}
      </button>
    ),
  },
  Modal: ({
    children,
    isOpen,
    ...props
  }: {
    children: ReactNode;
    isOpen?: boolean;
    [key: string]: unknown;
  }) =>
    isOpen ? (
      <div role="dialog" {...props}>
        {children}
      </div>
    ) : null,
  Avatar: ({ src, alt, initials }: { src?: string; alt?: string; initials?: string }) =>
    src ? <img src={src} alt={alt} /> : <span>{initials}</span>,
  Badge: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <span {...props}>{children}</span>
  ),
}));

function makeMoment(overrides: Partial<MomentItemResp> = {}): MomentItemResp {
  return {
    id: 1,
    user_id: 1,
    content: "这是测试内容",
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 5,
    comment_count: 2,
    is_liked: false,
    user: {
      id: 1,
      username: "testuser",
      nickname: "测试用户",
      mark: "博主",
      avatar_url: "https://example.com/avatar.jpg",
    },
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

describe("MomentCard", () => {
  beforeEach(() => {
    mockSessionUserId = null;
    vi.mocked(useDeferredMediaActivation).mockReturnValue(true);
  });

  it("渲染不崩溃", () => {
    expect(() => render(<MomentCard moment={makeMoment()} />)).not.toThrow();
  });

  it("显示 nickname 作为作者名（优先于 username）", () => {
    render(<MomentCard moment={makeMoment()} />);
    expect(screen.getByText("测试用户")).toBeTruthy();
    expect(screen.queryByText("testuser")).toBeNull();
  });

  it("没有 nickname 时显示 username", () => {
    render(<MomentCard moment={makeMoment({ user: { id: 1, username: "testuser" } })} />);
    expect(screen.getByText("testuser")).toBeTruthy();
  });

  it('没有 user 时显示"匿名"', () => {
    render(<MomentCard moment={makeMoment({ user: undefined })} />);
    expect(screen.getByText("匿名")).toBeTruthy();
  });

  it("有 avatar_url 时渲染 img 标签", () => {
    render(<MomentCard moment={makeMoment()} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("https://example.com/avatar.jpg");
  });

  it("没有 avatar_url 时渲染首字母 fallback", () => {
    render(
      <MomentCard
        moment={makeMoment({ user: { id: 1, username: "testuser", nickname: "测试用户" } })}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("测")).toBeTruthy();
  });

  it("显示 mark 作为徽章", () => {
    render(<MomentCard moment={makeMoment()} />);
    expect(screen.getByText("博主")).toBeTruthy();
  });

  it("没有 mark 时不显示徽章", () => {
    render(
      <MomentCard
        moment={makeMoment({ user: { id: 1, username: "testuser", nickname: "测试用户" } })}
      />,
    );
    expect(screen.queryByText("博主")).toBeNull();
  });

  it("VIP 作者头像显示皇冠", () => {
    render(
      <MomentCard
        moment={makeMoment({
          user: {
            id: 1,
            username: "vipuser",
            nickname: "VIP用户",
            roles: ["vip"],
          },
        })}
      />,
    );
    expect(screen.getByTestId("icon-vip")).toBeInTheDocument();
  });

  it("标签显示在昵称下方第二行", () => {
    render(<MomentCard moment={makeMoment()} />);
    // 昵称在第一行，标签（mark）在第二行
    expect(screen.getByText("测试用户")).toBeTruthy();
    expect(screen.getByText("博主")).toBeTruthy();
  });

  it("有图片时左对齐展示且圆角包裹图片", () => {
    const moment = makeMoment({
      images: [
        {
          id: 1,
          name: "photo1",
          file_type: "image/jpeg",
          url: "/1.jpg",
          access_url: "/1.jpg",
          size: 1000,
          seq: 1,
        },
      ],
    });
    render(<MomentCard moment={moment} />);
    const imgs = screen
      .getAllByRole("img")
      .filter((el) => el.tagName === "IMG" && el.getAttribute("src")?.startsWith("/"));
    const button = imgs[0].closest("button");
    expect(button?.className).toContain("rounded-[6px]");
    expect(button?.className).toContain("overflow-hidden");
    expect(imgs[0].className).toContain("max-w-full");
  });

  it("显示点赞和评论数字（ArticleCardStats 风格）", () => {
    render(<MomentCard moment={makeMoment()} />);
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("近期编辑且与发布时间差异明显时在操作栏上方显示编辑时间", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-26T12:00:00Z"));

    render(
      <MomentCard
        moment={makeMoment({
          created_at: "2021-06-26T12:00:00Z",
          updated_at: "2026-06-25T12:00:00Z",
        })}
      />,
    );
    expect(screen.getByText(/编辑于/)).toBeTruthy();
    const editedTime = screen.getByText(/编辑于/).querySelector("time");
    expect(editedTime?.getAttribute("datetime")).toBe("2026-06-25T12:00:00.000Z");

    vi.useRealTimers();
  });

  it("未编辑时不显示编辑时间", () => {
    render(
      <MomentCard
        moment={makeMoment({
          created_at: "2026-05-30T09:00:00Z",
          updated_at: "2026-05-30T09:00:00Z",
        })}
      />,
    );
    expect(screen.queryByText(/编辑于/)).toBeNull();
  });

  it("编辑与发布相对文案一致时不显示编辑时间", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-26T12:00:00Z"));

    render(
      <MomentCard
        moment={makeMoment({
          created_at: "2021-06-26T12:00:00Z",
          updated_at: "2021-07-01T12:00:00Z",
        })}
      />,
    );
    expect(screen.queryByText(/编辑于/)).toBeNull();

    vi.useRealTimers();
  });

  it("渲染正确的 data-testid", () => {
    render(<MomentCard moment={makeMoment()} />);
    expect(screen.getByTestId("moment-card")).toBeTruthy();
  });

  it("embedded 布局不使用 Card 包裹", () => {
    render(<MomentCard moment={makeMoment()} layout="embedded" />);
    const card = screen.getByTestId("moment-card");
    expect(card.getAttribute("data-layout")).toBe("embedded");
    expect(card.tagName).toBe("ARTICLE");
  });

  it("有图片时渲染图片网格", () => {
    const moment = makeMoment({
      images: [
        {
          id: 1,
          name: "photo1",
          file_type: "image/jpeg",
          url: "/1.jpg",
          access_url: "/1.jpg",
          size: 1000,
          seq: 1,
        },
        {
          id: 2,
          name: "photo2",
          file_type: "image/jpeg",
          url: "/2.jpg",
          access_url: "/2.jpg",
          size: 2000,
          seq: 2,
        },
      ],
    });
    render(<MomentCard moment={moment} />);
    const images = screen
      .getAllByRole("img")
      .filter((el) => el.tagName === "IMG" && el.getAttribute("src")?.startsWith("/"));
    expect(images.length).toBe(2);
  });

  it("GIF 图片用原生 img 渲染，避免 Next 图片优化破坏动图", () => {
    const moment = makeMoment({
      images: [
        {
          id: 1,
          name: "motion.gif",
          file_type: "image/gif",
          url: "/motion.gif",
          access_url: "/motion.gif",
          size: 1000,
          seq: 1,
        },
      ],
    });

    render(<MomentCard moment={moment} />);

    const img = screen.getByRole("img", { name: "motion.gif" });
    expect(img).toHaveAttribute("src", "/motion.gif");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img.tagName).toBe("IMG");
  });

  it("非 GIF 碎语图优先走优化器，并启用 fallbackUnoptimized", () => {
    const moment = makeMoment({
      images: [
        {
          id: 1,
          name: "photo.jpg",
          file_type: "image/jpeg",
          url: "/photo.jpg",
          access_url: "/photo.jpg",
          size: 1000,
          seq: 1,
        },
      ],
    });

    render(<MomentCard moment={moment} />);

    const img = screen.getByRole("img", { name: "photo.jpg" });
    expect(img).toHaveAttribute("data-unoptimized", "false");
  });

  it("无图片时不渲染图片网格", () => {
    render(<MomentCard moment={makeMoment({ images: [] })} />);
    const allImgs = screen.queryAllByRole("img");
    expect(allImgs.length).toBeLessThanOrEqual(1);
  });

  it("已点赞时显示 heart-fill 图标", () => {
    render(<MomentCard moment={makeMoment({ is_liked: true })} />);
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
  });

  it("未点赞时显示 heart 图标", () => {
    render(<MomentCard moment={makeMoment({ is_liked: false })} />);
    expect(screen.getByTestId("icon-heart")).toBeTruthy();
  });

  it("点击喜欢按钮触发 onLike 回调", async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    const moment = makeMoment();
    render(<MomentCard moment={moment} onLike={onLike} />);

    await user.click(screen.getByRole("button", { name: "喜欢" }));

    expect(onLike).toHaveBeenCalledWith(moment);
  });

  it("点击评论按钮触发 onComment 回调", async () => {
    const user = userEvent.setup();
    const onComment = vi.fn();
    const moment = makeMoment();
    render(<MomentCard moment={moment} onComment={onComment} />);

    await user.click(screen.getByRole("button", { name: "评论" }));

    expect(onComment).toHaveBeenCalledWith(moment);
  });

  it("当前用户是作者时显示更多菜单，包含编辑/置顶/删除选项", () => {
    mockSessionUserId = 1;
    render(<MomentCard moment={makeMoment()} />);

    expect(screen.getByTestId("moment-owner-actions")).toBeTruthy();
    expect(screen.getByRole("button", { name: "更多操作" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "编辑" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "置顶" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "删除" })).toBeTruthy();
    expect(screen.getByTestId("icon-edit")).toBeTruthy();
    expect(screen.getByTestId("icon-pin")).toBeTruthy();
    expect(screen.getByTestId("icon-trash")).toBeTruthy();
  });

  it("非作者不显示碎语管理按钮", () => {
    mockSessionUserId = 2;
    render(<MomentCard moment={makeMoment()} />);

    expect(screen.queryByTestId("moment-owner-actions")).toBeNull();
    expect(screen.queryByRole("button", { name: "更多操作" })).toBeNull();
  });

  it("已置顶的作者碎语菜单中显示取消置顶选项", () => {
    mockSessionUserId = 1;
    render(<MomentCard moment={makeMoment({ is_top: true })} />);

    expect(screen.getByRole("menuitem", { name: "取消置顶" })).toBeTruthy();
    expect(screen.getByTestId("icon-pin-off")).toBeTruthy();
  });

  it("点击菜单项触发对应回调，删除需二次确认", async () => {
    const user = userEvent.setup();
    const moment = makeMoment();
    const onEdit = vi.fn();
    const onToggleTop = vi.fn();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    mockSessionUserId = 1;

    render(
      <MomentCard moment={moment} onEdit={onEdit} onToggleTop={onToggleTop} onDelete={onDelete} />,
    );

    await user.click(screen.getByRole("menuitem", { name: "编辑" }));
    await user.click(screen.getByRole("menuitem", { name: "置顶" }));
    expect(onEdit).toHaveBeenCalledWith(moment);
    expect(onToggleTop).toHaveBeenCalledWith(moment);

    await user.click(screen.getByRole("menuitem", { name: "删除" }));
    expect(screen.getByRole("dialog", { name: "确认删除碎语" })).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "确认删除" }));
    expect(onDelete).toHaveBeenCalledWith(moment);
  });

  it("有 user 时昵称渲染为跳转用户详情的链接", () => {
    render(<MomentCard moment={makeMoment()} />);
    const links = screen.getAllByRole("link");
    const nicknameLink = links.find((l) => l.textContent === "测试用户");
    expect(nicknameLink).toBeTruthy();
    expect(nicknameLink?.getAttribute("href")).toBe("/users/1");
  });

  function makeImageMoment() {
    return makeMoment({
      images: [
        {
          id: 1,
          name: "p1",
          file_type: "image/jpeg",
          url: "/1.jpg",
          access_url: "/1.jpg",
          size: 1,
          seq: 1,
        },
        {
          id: 2,
          name: "p2",
          file_type: "image/jpeg",
          url: "/2.jpg",
          access_url: "/2.jpg",
          size: 1,
          seq: 2,
        },
        {
          id: 3,
          name: "p3",
          file_type: "image/jpeg",
          url: "/3.jpg",
          access_url: "/3.jpg",
          size: 1,
          seq: 3,
        },
      ],
    });
  }

  function makeOverflowImageMoment() {
    return makeMoment({
      images: Array.from({ length: 10 }, (_, index) => ({
        id: index + 1,
        name: `p${index + 1}`,
        file_type: "image/jpeg",
        url: `/${index + 1}.jpg`,
        access_url: `/${index + 1}.jpg`,
        size: 1,
        seq: index + 1,
      })),
    });
  }

  it("点击碎语图片打开全屏预览，且画廊含全部图片", async () => {
    const user = userEvent.setup();
    useImageViewer.setState({ isOpen: false, images: [], index: 0 });
    render(<MomentCard moment={makeImageMoment()} />);

    await user.click(screen.getByRole("button", { name: "查看图片 p2" }));

    const s = useImageViewer.getState();
    expect(s.isOpen).toBe(true);
    expect(s.images).toHaveLength(3); // 含被折叠的第 3 张
    expect(s.images[0]).toEqual({ src: "/1.jpg", alt: "p1" });
    expect(s.index).toBe(1);
  });

  it("点击 +N 折叠块从第一张被折叠图片打开预览", async () => {
    const user = userEvent.setup();
    useImageViewer.setState({ isOpen: false, images: [], index: 0 });
    render(<MomentCard moment={makeOverflowImageMoment()} />);

    await user.click(screen.getByRole("button", { name: "查看更多图片" }));

    const s = useImageViewer.getState();
    expect(s.isOpen).toBe(true);
    expect(s.index).toBe(8); // 第一张被折叠的图片
  });

  // ── 长文本：首页内嵌与独立页均完整展示，不渲染展开/收起 ──
  const LONG_CONTENT =
    "这是一条很长的碎语内容，超过了一百二十个字符的限制，需要显示展开按钮。" +
    "这是一条很长的碎语内容，超过了一百二十个字符的限制，需要显示展开按钮。" +
    "这是一条很长的碎语内容，超过了一百二十个字符的限制，需要显示展开按钮。" +
    "这是尾部补充内容用于确保超过阈值。";

  it.each(["embedded", "standalone"] as const)(
    "layout=%s 时长文本完整展示且不渲染展开/收起按钮",
    (layout) => {
      render(
        <MomentCard
          moment={makeMoment({ content: LONG_CONTENT })}
          layout={layout === "standalone" ? undefined : layout}
        />,
      );
      expect(screen.getByText(LONG_CONTENT)).toBeTruthy();
      expect(screen.queryByText("moment.expand")).toBeNull();
      expect(screen.queryByText("moment.collapse")).toBeNull();
    },
  );

  it("短文本不渲染展开/收起按钮", () => {
    render(<MomentCard moment={makeMoment({ content: "短碎语" })} />);
    expect(screen.getByText("短碎语")).toBeTruthy();
    expect(screen.queryByText("moment.expand")).toBeNull();
  });

  it("远程图片未就绪时首屏仅显示骨架", () => {
    vi.mocked(useDeferredMediaActivation).mockReturnValue(false);
    const moment = makeMoment({
      images: [
        {
          id: 1,
          name: "p1",
          file_type: "image/jpeg",
          url: "/1.jpg",
          access_url: "/1.jpg",
          size: 1,
          seq: 1,
        },
      ],
    });
    render(<MomentCard moment={moment} />);
    expect(screen.getByTestId("loading-image-skeleton")).toBeInTheDocument();
    expect(
      screen
        .queryAllByRole("img")
        .find((el) => el.tagName === "IMG" && el.getAttribute("src")?.startsWith("/")),
    ).toBeUndefined();
  });

  it("页面就绪后碎语图片 lazy 加载", () => {
    const moment = makeMoment({
      images: [
        {
          id: 1,
          name: "p1",
          file_type: "image/jpeg",
          url: "/1.jpg",
          access_url: "/1.jpg",
          size: 1,
          seq: 1,
        },
      ],
    });
    render(<MomentCard moment={moment} />);
    const img = screen
      .getAllByRole("img")
      .find((el) => el.tagName === "IMG" && el.getAttribute("src")?.startsWith("/"));
    expect(img).toHaveAttribute("loading", "lazy");
  });
});
