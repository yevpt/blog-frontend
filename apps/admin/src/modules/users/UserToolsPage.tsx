import { useNavigate } from "react-router-dom";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AllUsersAvatarTool } from "./components/AvatarNormalizeTool";

export function UserToolsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-4">
      <AdminPageHeader
        title="用户工具"
        description="低频运维操作：全站头像归一化批量处理。"
        action={
          <Button size="sm" variant="ghost" onPress={() => navigate("/users")}>
            <SvgIcon name="arrow-back" size={15} />
            返回用户管理
          </Button>
        }
      />
      <AllUsersAvatarTool />
    </div>
  );
}
