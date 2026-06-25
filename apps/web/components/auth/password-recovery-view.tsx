"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { isValidEmail } from "@/hooks/use-register-form";
import { PasswordRecoveryForm } from "./password-recovery-form";

interface PasswordRecoveryViewProps {
  /** 登录页带入的 identifier，合法邮箱时预填 */
  initialEmail?: string;
  onBack: () => void;
}

/** 登录弹窗内的找回密码视图 */
export function PasswordRecoveryView({ initialEmail = "", onBack }: PasswordRecoveryViewProps) {
  const [email, setEmail] = useState(() =>
    initialEmail && isValidEmail(initialEmail) ? initialEmail : "",
  );

  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-[5px]">
          <h2 className="text-[22px] font-extrabold tracking-tight text-foreground">找回密码</h2>
          <Button
            type="button"
            variant="ghost"
            onPress={onBack}
            className="inline-flex items-center gap-[3px] rounded-full px-[11px] py-[5px] text-[11.5px] font-semibold text-muted-foreground bg-foreground/[0.04] border border-foreground/[0.07] transition-colors hover:text-primary hover:bg-primary/10 hover:border-primary/25 whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            <SvgIcon name="chevron-left" size={9} />
            登录
          </Button>
        </div>
        <p className="text-[12.5px] text-muted-foreground">
          请输入账号绑定的已验证邮箱，验证码将发送至该邮箱
        </p>
      </div>

      <PasswordRecoveryForm
        email={email}
        onEmailChange={setEmail}
        emailReadOnly={false}
        emailLabel="邮箱"
        onDone={onBack}
      />
    </div>
  );
}
