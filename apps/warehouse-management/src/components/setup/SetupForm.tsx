"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { createOwnerAction } from "~/actions/setupActions";
import type { ActionResult } from "~/actions/types";
import { signIn } from "~/lib/auth-client";

const schema = z.object({
  name: z.string().min(2, "Tên quá ngắn"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Ít nhất 8 ký tự"),
});

type Values = z.infer<typeof schema>;

interface SetupFormProps {
  organizationId: string;
  organizationName: string;
}

export default function SetupForm({
  organizationId,
  organizationName,
}: SetupFormProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
    mode: "onBlur", // Validate on blur, not every keystroke
  });

  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    createOwnerAction as (
      prevState: ActionResult,
      formData: FormData
    ) => Promise<ActionResult>,
    { success: false }
  );
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      // After owner created, sign in client-side
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
  }, [state, form]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Thiết lập tài khoản quản trị</CardTitle>
          <CardDescription>
            Tạo tài khoản chủ sở hữu cho tổ chức:{" "}
            <strong className="text-primary">{organizationName}</strong>
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form action={formAction} className="space-y-4">
            {/* Hidden field for organizationId */}
            <input type="hidden" name="organizationId" value={organizationId} />

            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ và tên</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nguyễn Văn A"
                        disabled={isPending}
                        {...field}
                      />
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
                      <Input
                        type="email"
                        placeholder="m@example.com"
                        disabled={isPending}
                        {...field}
                      />
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
                      <Input
                        type="password"
                        placeholder="Tối thiểu 8 ký tự"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending
                  ? "Đang tạo tài khoản..."
                  : "Tạo tài khoản chủ sở hữu"}
              </Button>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
}
