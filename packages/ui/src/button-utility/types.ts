import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  FC,
  ReactNode,
} from "react";
import type {
  ButtonProps as AriaButtonProps,
  LinkProps as AriaLinkProps,
  Placement,
} from "react-aria-components";

/** 图标按钮的通用 props（button / link 两种形态共享）。 */
export interface CommonProps {
  isDisabled?: boolean;
  size?: "xs" | "sm";
  color?: "secondary" | "tertiary";
  icon?: FC<{ className?: string }> | ReactNode;
  tooltip?: string;
  tooltipPlacement?: Placement;
}

/** 渲染为 `<button>` 时的 props。 */
export interface ButtonUtilityButtonProps
  extends
    CommonProps,
    DetailedHTMLProps<
      Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color" | "slot">,
      HTMLButtonElement
    > {
  slot?: AriaButtonProps["slot"];
  href?: never;
}

/** 渲染为 `<a>` 时的 props。 */
export interface ButtonUtilityLinkProps
  extends
    CommonProps,
    DetailedHTMLProps<Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "color">, HTMLAnchorElement> {
  routerOptions?: AriaLinkProps["routerOptions"];
  href: string;
}

/** `ButtonUtility` 的 props，按是否传 href 在两种形态间二选一。 */
export type ButtonUtilityProps = ButtonUtilityButtonProps | ButtonUtilityLinkProps;
