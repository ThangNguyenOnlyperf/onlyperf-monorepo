"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { setUserPasswordActionState } from "~/actions/userActions";
import type { ActionResult } from "~/actions/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

export default function ChangePasswordModal({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    setUserPasswordActionState as any,
    { success: false }
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message || "Đã đổi mật khẩu");
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error || "Không thể đổi mật khẩu");
    }
  }, [state]);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label="Đổi mật khẩu"
            title="Đổi mật khẩu"
          >
            <KeyRound />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Đổi mật khẩu</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu cho {userEmail}</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="userId" value={userId} />
            <div className="space-y-2">
              <label className="text-sm font-medium">Mật khẩu mới</label>
              <Input
                type="password"
                name="newPassword"
                placeholder="Ít nhất 6 ký tự"
                disabled={pending}
                required
                className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Xác nhận mật khẩu</label>
              <Input
                type="password"
                name="confirmPassword"
                placeholder="Nhập lại mật khẩu"
                disabled={pending}
                required
                className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="btn-secondary"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="btn-primary"
              >
                {pending ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
