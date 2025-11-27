"use client";

import { useActionState, useEffect, useState } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { createUserActionState } from "~/actions/userActions";
import type { ActionResult } from "~/actions/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CreateUserForm() {
  const router = useRouter();
  const [role, setRole] = useState<string>("user");
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createUserActionState as any, {
    success: false,
  });

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message || "Tạo tài khoản thành công");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error || "Không thể tạo tài khoản");
    }
  }, [state]);

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <Input
        name="name"
        placeholder="Họ và tên"
        required
        disabled={pending}
        className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <Input
        type="email"
        name="email"
        placeholder="Email"
        required
        disabled={pending}
        className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <Input
        type="password"
        name="password"
        placeholder="Mật khẩu tạm"
        required
        disabled={pending}
        className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <div className="flex gap-2 items-center">
        <input type="hidden" name="role" value={role} />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="h-10 w-[140px] border-2 hover:border-primary/30">
            <SelectValue placeholder="Chọn vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Nhân viên</SelectItem>
            <SelectItem value="admin">Quản trị</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="submit"
          disabled={pending}
          className="btn-primary h-10"
        >
          {pending ? "Đang tạo..." : "Tạo"}
        </Button>
      </div>
    </form>
  );
}
