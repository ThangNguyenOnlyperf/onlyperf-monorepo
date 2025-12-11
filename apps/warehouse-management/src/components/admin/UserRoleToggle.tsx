"use client";

import { useActionState, useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { updateUserRoleActionState } from "~/actions/userActions";
import type { ActionResult } from "~/actions/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const ROLE_LABELS: Record<string, string> = {
  user: "Nhân viên",
  supervisor: "Giám sát viên",
  admin: "Quản trị",
};

export default function UserRoleToggle({ userId, currentRole }: { userId: string; currentRole: string }) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
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
  }, [state, router]);

  // Sync with prop when it changes (e.g., after refresh)
  useEffect(() => {
    setRole(currentRole);
  }, [currentRole]);

  const handleRoleChange = (newRole: string) => {
    if (newRole === role) return;
    setRole(newRole);

    // Submit form programmatically
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("role", newRole);
    formAction(formData);
  };

  return (
    <Select value={role} onValueChange={handleRoleChange} disabled={pending}>
      <SelectTrigger className="h-8 w-[130px] text-xs">
        <SelectValue placeholder="Chọn vai trò" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="user">{ROLE_LABELS.user}</SelectItem>
        <SelectItem value="supervisor">{ROLE_LABELS.supervisor}</SelectItem>
        <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
      </SelectContent>
    </Select>
  );
}
