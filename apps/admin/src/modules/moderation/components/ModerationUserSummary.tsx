import { Badge } from "@repo/ui";
import type {
  AdminModerationProfileResp,
  ModerationSanctionState,
  ModerationTrustLevel,
} from "@repo/api";

const SANCTION_VARIANT: Record<ModerationSanctionState, "success" | "warning" | "error"> = {
  active: "success",
  muted: "warning",
  banned: "error",
};

const SANCTION_LABEL: Record<ModerationSanctionState, string> = {
  active: "正常",
  muted: "禁言",
  banned: "封禁",
};

const TRUST_LABEL: Record<ModerationTrustLevel, string> = {
  new: "新人",
  normal: "普通",
  trusted: "受信",
  restricted: "受限",
};

export function ModerationUserSummary({ profile }: { profile: AdminModerationProfileResp }) {
  return (
    <section className="grid gap-3 rounded-lg border border-border/70 bg-muted/15 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">用户 #{profile.user_id}</Badge>
        <Badge variant="secondary">信任：{TRUST_LABEL[profile.trust_level]}</Badge>
        <Badge variant="outline">来源：{profile.trust_source === "auto" ? "自动" : "手工"}</Badge>
        <Badge variant={SANCTION_VARIANT[profile.sanction_state]}>
          处罚：{SANCTION_LABEL[profile.sanction_state]}
        </Badge>
        {profile.manual_trust_locked ? <Badge variant="warning">信任已锁定</Badge> : null}
      </div>
      <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <dt>连续通过：{profile.clean_approval_streak}</dt>
        <dt>修正次数：{profile.corrected_count}</dt>
        <dt>驳回次数：{profile.rejected_count}</dt>
        <dt>高风险次数：{profile.high_risk_count}</dt>
        <dt>违规分：{profile.violation_score}</dt>
        <dt>最近违规：{profile.last_violation_at ?? "—"}</dt>
        <dt>处罚到期：{profile.sanction_until ?? "—"}</dt>
        <dt>处罚原因：{profile.sanction_reason ?? "—"}</dt>
        <dt>受限到期：{profile.restricted_until ?? "—"}</dt>
        <dt>注册时间：{profile.created_at}</dt>
      </dl>
    </section>
  );
}
