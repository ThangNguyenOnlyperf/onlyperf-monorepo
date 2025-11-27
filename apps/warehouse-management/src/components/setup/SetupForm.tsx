"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { createAdminAction } from "~/actions/setupActions";
import type { ActionResult } from "~/actions/types";
import { signIn } from "~/lib/auth-client";

const schema = z.object({
  name: z.string().min(2, "Tên quá ngắn"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Ít nhất 6 ký tự"),
});

type Values = z.infer<typeof schema>;

export default function SetupForm() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(createAdminAction as any, { success: false });
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      // After admin created, sign in client-side
      (async () => {
        const vals = form.getValues();
        const { error } = await signIn.email({
          email: vals.email,
          password: vals.password,
          callbackURL: "/dashboard",
        });
        if (error) {
          setError(error.message ?? "Đăng nhập thất bại");
        }
      })();
    } else if (state.error) {
      setError(state.error);
    }
  }, [state]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Thiết lập tài khoản quản trị</CardTitle>
          <CardDescription>Tạo admin cho lần sử dụng đầu tiên</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form action={formAction} className="space-y-4">
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ và tên</FormLabel>
                    <FormControl>
                      <Input placeholder="Nguyễn Văn A" disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="m@example.com" disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Tối thiểu 6 ký tự" disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Đang tạo tài khoản..." : "Tạo tài khoản quản trị"}
              </Button>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
}
