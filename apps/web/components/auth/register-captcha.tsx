"use client";

import { type PointerEvent, useRef } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, Modal, cn } from "@repo/ui";
import type { CaptchaChallenge } from "@/hooks/use-register-form";

const THUMB_W = 44;

interface SliderProps {
  value: number;
  max: number;
  disabled?: boolean;
  onChange: (x: number) => void;
  onRelease: (x: number) => void;
}

function CaptchaSlider({ value, max, disabled, onChange, onRelease }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  function calcValue(clientX: number) {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const usable = rect.width - THUMB_W;
    if (usable <= 0) return 0;
    const raw = (clientX - rect.left - THUMB_W / 2) / usable;
    return Math.max(0, Math.min(max, Math.round(raw * max)));
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    isDragging.current = true;
    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    onChange(calcValue(e.clientX));
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!isDragging.current || disabled) return;
    onChange(calcValue(e.clientX));
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (e.currentTarget.releasePointerCapture) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const x = calcValue(e.clientX);
    onChange(x);
    onRelease(x);
  }

  const fraction = max > 0 ? value / max : 0;
  const fillW = `calc(${fraction * 100}% + ${THUMB_W * (1 - fraction)}px)`;
  const thumbLeft = `calc(${fraction * 100}% - ${fraction * THUMB_W}px)`;

  return (
    <div
      ref={trackRef}
      data-testid="captcha-track"
      className={cn(
        "relative w-full h-[44px] rounded-lg select-none touch-none overflow-hidden",
        "bg-foreground/[0.06]",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="absolute inset-y-0 left-0 bg-primary/[0.12] pointer-events-none"
        style={{ width: fillW }}
      />
      {fraction < 0.08 && !disabled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[12px] text-muted-foreground/40 pl-14 select-none">
            向右拖动完成验证
          </span>
        </div>
      )}
      <div
        className={cn(
          "absolute top-[4px] bottom-[4px] flex items-center justify-center pointer-events-none",
          "rounded-[9px] bg-white dark:bg-zinc-100 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.18)]",
        )}
        style={{ width: THUMB_W, left: thumbLeft }}
      >
        {disabled ? (
          <div className="w-[18px] h-[18px] border-[2.5px] border-gray-200 border-t-primary rounded-full animate-spin" />
        ) : (
          <div className="flex items-center gap-[3px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-[3px] h-[13px] rounded-full bg-gray-300" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export interface RegisterCaptchaProps {
  challenge: CaptchaChallenge | null;
  captchaX: number;
  captchaOpen: boolean;
  captchaLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onCaptchaXChange: (x: number) => void;
  onVerify: (x: number) => void;
  onClose: () => void;
}

export function RegisterCaptcha({
  challenge,
  captchaX,
  captchaOpen,
  captchaLoading,
  onOpenChange,
  onCaptchaXChange,
  onVerify,
  onClose,
}: RegisterCaptchaProps) {
  if (!challenge) {
    return null;
  }

  return (
    <Modal
      isOpen={captchaOpen}
      onOpenChange={onOpenChange}
      isDismissable
      aria-label="图形验证码"
      size="sm"
      overlayClassName="z-[520] bg-black/45 backdrop-blur-md"
      modalClassName="max-w-[360px]"
      dialogClassName="p-5"
    >
      {() => (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-bold text-foreground">请拖动滑块完成拼图</h3>
            <Button
              type="button"
              aria-label="关闭图形验证码"
              variant="ghost"
              onPress={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg p-0 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
            >
              <SvgIcon name="close" size={14} />
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <div
              className="relative mx-auto overflow-hidden bg-foreground/[0.03]"
              style={{
                width: challenge.image_width,
                height: challenge.image_height,
                maxWidth: "100%",
              }}
            >
              <img
                src={challenge.master_image}
                alt=""
                className="h-full w-full select-none object-cover"
                draggable={false}
              />
              <img
                src={challenge.tile_image}
                alt=""
                className="absolute select-none drop-shadow-lg"
                draggable={false}
                style={{
                  width: challenge.tile_width,
                  height: challenge.tile_height,
                  left: captchaX,
                  top: challenge.tile_y,
                }}
              />
              {captchaLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                  <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="border-t border-border/50 p-3">
              <CaptchaSlider
                value={captchaX}
                max={Math.max(0, challenge.image_width - challenge.tile_width)}
                disabled={captchaLoading}
                onChange={onCaptchaXChange}
                onRelease={onVerify}
              />
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
