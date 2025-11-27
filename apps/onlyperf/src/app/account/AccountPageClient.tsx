"use client";

import {
  Calendar,
  CreditCard,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  CustomerAddress,
  CustomerOrder,
  CustomerProfile,
} from "@/lib/shopify/customer-account-api";

interface AccountPageClientProps {
  profile: CustomerProfile;
  orders: CustomerOrder[];
  addresses: CustomerAddress[];
  updateProfile: (formData: FormData) => Promise<void>;
  initialTab?: string;
  error?: string;
  success?: string;
}

function getInitials(
  firstName: string | null,
  lastName: string | null,
): string {
  const first = firstName?.trim().charAt(0).toUpperCase() || "";
  const last = lastName?.trim().charAt(0).toUpperCase() || "";
  return first + last || "U";
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPrice(amount: string, currencyCode: string): string {
  const value = parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(value);
}

function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower.includes("paid") || statusLower.includes("fulfilled")) {
    return "bg-green-100 text-green-800 border-green-200";
  }
  if (statusLower.includes("pending") || statusLower.includes("partial")) {
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }
  if (statusLower.includes("refund") || statusLower.includes("cancel")) {
    return "bg-red-100 text-red-800 border-red-200";
  }
  return "bg-gray-100 text-gray-800 border-gray-200";
}

export function AccountPageClient({
  profile,
  orders,
  addresses,
  updateProfile,
  initialTab = "overview",
  error,
  success,
}: AccountPageClientProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const initials = getInitials(profile.firstName, profile.lastName);
  const displayName =
    profile.firstName && profile.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile.firstName || profile.lastName || "Người dùng";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container-max mx-auto px-4 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
                {initials}
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{displayName}</h1>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href="/logout">
                <LogOut />
                Đăng xuất
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container-max mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-8 w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">
              <User />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Package />
              Đơn hàng
              {orders.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {orders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="addresses">
              <MapPin />
              Địa chỉ
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings />
              Cài đặt
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Profile Card */}
              <div className="rounded-lg border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold">
                  Thông tin cá nhân
                </h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Họ và tên</p>
                      <p className="text-sm text-muted-foreground">
                        {displayName}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">
                        {profile.email}
                      </p>
                    </div>
                  </div>
                  {profile.phone && (
                    <>
                      <Separator />
                      <div className="flex items-start gap-3">
                        <Phone className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Số điện thoại</p>
                          <p className="text-sm text-muted-foreground">
                            {profile.phone}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => setActiveTab("settings")}
                >
                  Chỉnh sửa hồ sơ
                </Button>
              </div>

              {/* Recent Orders Card */}
              <div className="rounded-lg border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Đơn hàng gần đây</h2>
                  {orders.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("orders")}
                    >
                      Xem tất cả
                    </Button>
                  )}
                </div>
                {orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Package className="mb-2 size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Chưa có đơn hàng
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 3).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            Order #{order.number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(order.processedAt)}
                          </p>
                        </div>
                        <p className="text-sm font-medium">
                          {formatPrice(
                            order.totalPrice.amount,
                            order.totalPrice.currencyCode,
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div>
              <h2 className="mb-4 text-xl font-semibold">Đơn hàng của bạn</h2>
              {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
                  <Package className="mb-4 size-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-medium">Chưa có đơn hàng</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Bắt đầu mua sắm để xem đơn hàng của bạn tại đây
                  </p>
                  <Button asChild>
                    <Link href="/collections">Xem sản phẩm</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-lg border bg-card p-6 transition-shadow hover:shadow-md"
                    >
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            Order #{order.number}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {formatDate(order.processedAt)}
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <CreditCard className="size-3" />
                              {formatPrice(
                                order.totalPrice.amount,
                                order.totalPrice.currencyCode,
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={getStatusColor(order.financialStatus)}
                          >
                            {order.financialStatus.replace("_", " ")}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={getStatusColor(order.fulfillmentStatus)}
                          >
                            {order.fulfillmentStatus.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>

                      {/* Order Items */}
                      {order.lineItems.nodes.length > 0 && (
                        <>
                          <Separator className="my-4" />
                          <div className="space-y-3">
                            {order.lineItems.nodes.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-4"
                              >
                                {item.image && (
                                  <img
                                    src={item.image.url}
                                    alt={item.image.altText || item.title}
                                    className="size-16 rounded-md border object-cover"
                                  />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {item.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Quantity: {item.quantity}
                                  </p>
                                </div>
                                <p className="text-sm font-medium">
                                  {formatPrice(
                                    item.price.amount,
                                    item.price.currencyCode,
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-6">
            <div>
              <h2 className="mb-4 text-xl font-semibold">Địa chỉ của bạn</h2>
              {addresses.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
                  <MapPin className="mb-4 size-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-medium">
                    Chưa có địa chỉ nào
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Thêm địa chỉ khi thanh toán
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className="rounded-lg border bg-card p-6"
                    >
                      <div className="mb-2 flex items-start gap-2">
                        <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          {(address.firstName || address.lastName) && (
                            <p className="font-medium">
                              {[address.firstName, address.lastName]
                                .filter(Boolean)
                                .join(" ")}
                            </p>
                          )}
                          {address.company && (
                            <p className="text-sm text-muted-foreground">
                              {address.company}
                            </p>
                          )}
                          {address.address1 && (
                            <p className="text-sm">{address.address1}</p>
                          )}
                          {address.address2 && (
                            <p className="text-sm">{address.address2}</p>
                          )}
                          <p className="text-sm">
                            {[address.city, address.province, address.zip]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          {address.country && (
                            <p className="text-sm">{address.country}</p>
                          )}
                          {address.phoneNumber && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {address.phoneNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="mx-auto max-w-2xl">
              <h2 className="mb-6 text-xl font-semibold">Cài đặt tài khoản</h2>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  {decodeURIComponent(error)}
                </div>
              )}

              {success && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  Cập nhật hồ sơ thành công!
                </div>
              )}

              <div className="rounded-lg border bg-card p-6">
                <form action={updateProfile} className="space-y-4">
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium"
                      htmlFor="firstName"
                    >
                      Tên
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      defaultValue={profile.firstName ?? ""}
                      placeholder="Nhập tên của bạn"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <div>
                    <label
                      className="mb-2 block text-sm font-medium"
                      htmlFor="lastName"
                    >
                      Họ
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      defaultValue={profile.lastName ?? ""}
                      placeholder="Nhập họ của bạn"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <div>
                    <label
                      className="mb-2 block text-sm font-medium"
                      htmlFor="phone"
                    >
                      Số điện thoại
                      <span className="ml-1 text-xs text-muted-foreground">
                        (tùy chọn)
                      </span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      defaultValue={profile.phone ?? ""}
                      placeholder="+84 (912) 345-678"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <Separator className="my-6" />

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Email
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {profile.email}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Liên hệ hỗ trợ để thay đổi địa chỉ email của bạn
                    </p>
                  </div>

                  <Separator className="my-6" />

                  <Button type="submit" className="w-full">
                    Lưu thay đổi
                  </Button>
                </form>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
