"use client";

import { useActionState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { updateUserRoleActionState } from "~/actions/userActions";
import type { ActionResult } from "~/actions/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Shield, ShieldOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

export default function UserRoleToggle({ userId, currentRole }: { userId: string; currentRole: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateUserRoleActionState as any,
    { success: false }
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message || "Đã cập nhật vai trò");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error || "Không thể cập nhật vai trò");
    }
  }, [state]);

  const nextRole = currentRole === "admin" ? "user" : "admin";
  const label = currentRole === "admin" ? "Chuyển thành Nhân viên" : "Chuyển thành Quản trị";

  return (
    <form action={formAction} className="inline-block">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value={nextRole} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="submit"
            variant="outline"
            size="icon"
            disabled={pending}
            aria-label={label}
            title={label}
          >
            {currentRole === "admin" ? <ShieldOff /> : <Shield />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </form>
  );
}
