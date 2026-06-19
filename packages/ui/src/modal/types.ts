import type { CSSProperties, ReactNode, Ref } from "react";
import type {
  DialogProps,
  DialogRenderProps,
  ModalOverlayProps as AriaModalOverlayProps,
} from "react-aria-components/Modal";

/** 弹窗呈现位置。 */
export type ModalPlacement = "center" | "sheet" | "fullscreen-mobile";
/** 弹窗尺寸档位。 */
export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

/** `Modal` 的 props，提供多个节点级 className slot。 */
export interface ModalProps
  extends
    Omit<AriaModalOverlayProps, "children" | "className" | "style">,
    Pick<DialogProps, "aria-label" | "aria-labelledby" | "role"> {
  children: ReactNode | ((opts: DialogRenderProps) => ReactNode);
  placement?: ModalPlacement;
  size?: ModalSize;
  overlayClassName?: string;
  positionerClassName?: string;
  modalClassName?: string;
  modalRef?: Ref<HTMLDivElement>;
  dialogClassName?: string;
  overlayStyle?: CSSProperties;
  modalStyle?: CSSProperties;
  onBackdropPress?: () => void;
}
