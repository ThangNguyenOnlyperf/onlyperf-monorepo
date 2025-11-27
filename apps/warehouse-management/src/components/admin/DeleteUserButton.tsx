"use client";

import { useActionState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { deleteUserActionState } from "~/actions/userActions";
import type { ActionResult } from "~/actions/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { Trash2 } from "lucide-react";

export default function DeleteUserButton({ userId, userEmail }: { userId: string; userEmail: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    deleteUserActionState as any,
    { success: false }
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message || "Đã xóa người dùng");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error || "Không thể xóa người dùng");
    }
  }, [state]);

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" disabled={pending} aria-label="Xóa người dùng" title="Xóa người dùng">
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Xóa người dùng</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa người dùng?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc muốn xóa tài khoản {userEmail}? Hành động này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction}>
          <input type="hidden" name="userId" value={userId} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={pending}>Xác nhận</AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
