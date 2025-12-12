"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Globe,
  QrCode,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

import { z } from "zod";
import {
  updateQRDomainSettingsAction,
  type QRDomainSettingsFormData,
  type QRDomainSettingsResponse,
} from "~/actions/qrDomainSettingsActions";

// Local form schema for client-side validation
const FormSchema = z.object({
  qrCodeDomain: z.string().url("Domain phải là URL hợp lệ (https://...)").optional().or(z.literal("")),
  qrCodePath: z.string().min(1, "Path không được để trống"),
});

type FormData = z.infer<typeof FormSchema>;

interface QRDomainSettingsClientUIProps {
  initialSettings: QRDomainSettingsResponse | null;
}

export default function QRDomainSettingsClientUI({ initialSettings }: QRDomainSettingsClientUIProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      qrCodeDomain: initialSettings?.qrCodeDomain ?? "",
      qrCodePath: initialSettings?.qrCodePath ?? "/p",
    },
  });

  const watchedDomain = form.watch("qrCodeDomain");
  const watchedPath = form.watch("qrCodePath");

  // Generate preview URL
  const previewDomain = watchedDomain || process.env.NEXT_PUBLIC_BASE_URL || "https://onlyperf.com";
  const previewPath = watchedPath || "/p";
  const previewUrl = `${previewDomain}${previewPath}/X7KM9PQ2NR`;

  const handleSubmit = async (data: FormData) => {
    startTransition(async () => {
      const actionData: QRDomainSettingsFormData = {
        qrCodeDomain: data.qrCodeDomain || null,
        qrCodePath: data.qrCodePath || "/p",
      };
      const result = await updateQRDomainSettingsAction(actionData);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  if (!initialSettings) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Lỗi
          </CardTitle>
          <CardDescription>
            Không thể tải cài đặt domain QR. Vui lòng thử lại sau.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Domain hiện tại
              </CardTitle>
              <CardDescription>
                Domain đang được sử dụng cho mã QR
              </CardDescription>
            </div>
            <Badge variant={initialSettings.qrCodeDomain ? "default" : "secondary"}>
              {initialSettings.qrCodeDomain ? "Đã cấu hình" : "Mặc định"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Domain</p>
                <p className="font-medium font-mono">
                  {initialSettings.qrCodeDomain || "(sử dụng mặc định)"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Path</p>
                <p className="font-medium font-mono">{initialSettings.qrCodePath}</p>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground mb-2">URL mẫu:</p>
              <code className="text-sm font-mono break-all">
                {initialSettings.previewUrl}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Cấu hình Domain
          </CardTitle>
          <CardDescription>
            Cập nhật domain sẽ ảnh hưởng đến tất cả mã QR được tạo mới
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="qrCodeDomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://btsport.com"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Domain đầy đủ bao gồm https:// (để trống để sử dụng domain mặc định)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="qrCodePath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Path</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="/p"
                        {...field}
                        value={field.value ?? "/p"}
                      />
                    </FormControl>
                    <FormDescription>
                      Đường dẫn URL sau domain (mặc định: /p)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Live Preview */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-primary">Preview URL</p>
                </div>
                <code className="text-sm font-mono break-all">
                  {previewUrl}
                </code>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu cài đặt"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Lưu ý quan trọng</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <ul className="list-disc pl-4 space-y-2 text-sm text-muted-foreground">
            <li>
              Thay đổi domain chỉ ảnh hưởng đến <strong>mã QR mới</strong> được tạo sau khi lưu.
            </li>
            <li>
              Mã QR đã in trước đó sẽ <strong>không bị ảnh hưởng</strong> vì URL đã được mã hóa trong QR.
            </li>
            <li>
              Đảm bảo domain mới có thể xử lý các request đến path <code>{watchedPath || "/p"}/[code]</code>.
            </li>
            <li>
              Nếu bạn thay đổi domain, hãy đảm bảo cấu hình redirect hoặc proxy phù hợp.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
