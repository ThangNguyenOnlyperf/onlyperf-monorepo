"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Store,
  Key,
  Shield,
  TestTube,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Trash2,
  ExternalLink,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

import { z } from "zod";
import {
  updateShopifySettingsAction,
  testShopifyConnectionAction,
  clearShopifySettingsAction,
  type ShopifySettingsFormData,
  type ShopifySettingsResponse,
} from "~/actions/shopifySettingsActions";

// Local form schema for client-side validation
const FormSchema = z.object({
  shopifyEnabled: z.boolean(),
  shopifyStoreDomain: z.string().optional().nullable(),
  shopifyAdminApiAccessToken: z.string().optional().nullable(),
  shopifyApiVersion: z.string(),
  shopifyLocationId: z.string().optional().nullable(),
  shopifyWebhookSecret: z.string().optional().nullable(),
});

type FormData = z.infer<typeof FormSchema>;

interface ShopifySettingsClientUIProps {
  initialSettings: ShopifySettingsResponse | null;
}

export default function ShopifySettingsClientUI({ initialSettings }: ShopifySettingsClientUIProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    shopName?: string;
    plan?: string;
    message?: string;
  } | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      shopifyEnabled: initialSettings?.shopifyEnabled ?? false,
      shopifyStoreDomain: initialSettings?.shopifyStoreDomain ?? "",
      shopifyAdminApiAccessToken: "", // Always empty - user must re-enter to update
      shopifyApiVersion: initialSettings?.shopifyApiVersion ?? "2025-04",
      shopifyLocationId: initialSettings?.shopifyLocationId ?? "",
      shopifyWebhookSecret: "", // Always empty - user must re-enter to update
    },
  });

  const isEnabled = form.watch("shopifyEnabled");

  const handleSubmit = async (data: FormData) => {
    startTransition(async () => {
      // Convert to action format
      const actionData: ShopifySettingsFormData = {
        ...data,
        shopifyApiVersion: data.shopifyApiVersion ?? "2025-04",
      };
      const result = await updateShopifySettingsAction(actionData);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testShopifyConnectionAction();
      if (result.success && result.data) {
        setTestResult({
          success: true,
          shopName: result.data.shopName,
          plan: result.data.plan,
          message: result.message,
        });
        toast.success(result.message);
      } else {
        setTestResult({
          success: false,
          message: result.message,
        });
        toast.error(result.message);
      }
    } catch {
      setTestResult({
        success: false,
        message: "Lỗi không xác định khi kiểm tra kết nối.",
      });
      toast.error("Lỗi không xác định khi kiểm tra kết nối.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearSettings = async () => {
    startTransition(async () => {
      const result = await clearShopifySettingsAction();
      if (result.success) {
        toast.success(result.message);
        setShowClearDialog(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const copyWebhookUrl = () => {
    if (initialSettings?.webhookUrl) {
      navigator.clipboard.writeText(initialSettings.webhookUrl);
      setCopiedWebhook(true);
      toast.success("Đã sao chép URL webhook");
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
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
            Không thể tải cài đặt Shopify. Vui lòng thử lại sau.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Trạng thái tích hợp
              </CardTitle>
              <CardDescription>
                Trạng thái kết nối với Shopify store của bạn
              </CardDescription>
            </div>
            <Badge
              variant={initialSettings.shopifyEnabled ? "default" : "secondary"}
              className={initialSettings.shopifyEnabled ? "bg-emerald-500" : ""}
            >
              {initialSettings.shopifyEnabled ? "Đang hoạt động" : "Chưa kích hoạt"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Store Domain</p>
              <p className="font-medium">
                {initialSettings.shopifyStoreDomain || "Chưa cấu hình"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">API Token</p>
              <p className="font-medium font-mono">
                {initialSettings.hasExistingToken
                  ? initialSettings.shopifyAdminApiAccessTokenMasked
                  : "Chưa cấu hình"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">API Version</p>
              <p className="font-medium">{initialSettings.shopifyApiVersion}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Location ID</p>
              <p className="font-medium">
                {initialSettings.shopifyLocationId || "Tự động"}
              </p>
            </div>
          </div>

          {/* Test Connection Button and Result */}
          {initialSettings.shopifyEnabled && (
            <div className="mt-6 space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Kiểm tra kết nối
                  </>
                )}
              </Button>

              {testResult && (
                <div
                  className={`rounded-lg border p-4 ${
                    testResult.success
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950"
                      : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span
                      className={`font-medium ${
                        testResult.success ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {testResult.success
                        ? `Kết nối thành công: ${testResult.shopName}`
                        : testResult.message}
                    </span>
                  </div>
                  {testResult.success && testResult.plan && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Plan: {testResult.plan}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook URL Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Webhook URL
          </CardTitle>
          <CardDescription>
            Sử dụng URL này để cấu hình webhook trong Shopify Admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={initialSettings.webhookUrl}
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyWebhookUrl}
            >
              {copiedWebhook ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Cấu hình webhook trong Shopify Admin &gt; Settings &gt; Notifications &gt;
            Webhooks với event &quot;Order paid&quot;
          </p>
        </CardContent>
      </Card>

      {/* Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Cấu hình Shopify
          </CardTitle>
          <CardDescription>
            Cập nhật thông tin API để kết nối với Shopify store
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="shopifyEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Kích hoạt tích hợp</FormLabel>
                      <FormDescription>
                        Bật/tắt đồng bộ sản phẩm và đơn hàng với Shopify
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className={isEnabled ? "" : "opacity-50 pointer-events-none"}>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="shopifyStoreDomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store Domain</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="your-store.myshopify.com"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Domain cửa hàng Shopify của bạn
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shopifyApiVersion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Version</FormLabel>
                        <FormControl>
                          <Input placeholder="2025-04" {...field} />
                        </FormControl>
                        <FormDescription>
                          Phiên bản API Shopify (mặc định: 2025-04)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shopifyAdminApiAccessToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Admin API Access Token
                          {initialSettings.hasExistingToken && (
                            <Badge variant="outline" className="ml-2">
                              Đã cấu hình
                            </Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={
                              initialSettings.hasExistingToken
                                ? "Để trống để giữ nguyên"
                                : "shpat_xxxxx"
                            }
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Token từ Shopify Admin &gt; Apps &gt; Develop apps
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shopifyLocationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location ID (tùy chọn)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="gid://shopify/Location/xxxxx"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>
                          ID vị trí kho, để trống để dùng mặc định
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shopifyWebhookSecret"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>
                          Webhook Secret
                          {initialSettings.hasExistingWebhookSecret && (
                            <Badge variant="outline" className="ml-2">
                              Đã cấu hình
                            </Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={
                              initialSettings.hasExistingWebhookSecret
                                ? "Để trống để giữ nguyên"
                                : "whsec_xxxxx"
                            }
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Secret từ Shopify Admin &gt; Settings &gt; Notifications &gt;
                          Webhooks
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowClearDialog(true)}
                  disabled={isPending || !initialSettings.hasExistingToken}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa cấu hình
                </Button>

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

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>Hướng dẫn cấu hình</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <ol className="list-decimal pl-4 space-y-2">
            <li>
              Vào{" "}
              <a
                href="https://admin.shopify.com/store/settings/apps/development"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Shopify Admin &gt; Apps &gt; Develop apps
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>Tạo app mới hoặc chọn app hiện có</li>
            <li>
              Trong &quot;API credentials&quot;, tạo &quot;Admin API access token&quot;
              với các quyền:
              <ul className="list-disc pl-4 mt-1">
                <li>read_products, write_products</li>
                <li>read_inventory, write_inventory</li>
                <li>read_orders</li>
                <li>read_locations</li>
              </ul>
            </li>
            <li>Sao chép token và dán vào form trên</li>
            <li>
              Cấu hình webhook tại Settings &gt; Notifications &gt; Webhooks với event
              &quot;Order paid&quot;
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Clear Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa cấu hình</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa tất cả cấu hình Shopify bao gồm API token và webhook
              secret. Bạn có chắc chắn muốn tiếp tục?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearSettings}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa cấu hình"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
