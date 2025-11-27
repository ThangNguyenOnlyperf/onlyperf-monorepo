"use client";

import { CreditCard, LogOut, MapPin, Package, Shield, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { PendingCheckoutSession } from "@/actions/checkout";
import { AddressesSection } from "@/components/account/AddressesSection";
import { OrdersSection } from "@/components/account/OrdersSection";
import { PendingPaymentsSection } from "@/components/account/PendingPaymentsSection";
import { ProductsSection } from "@/components/account/ProductsSection";
import { ProfileSection } from "@/components/account/ProfileSection";
import { Button } from "@/components/ui/button";
import type {
  CustomerAddress,
  CustomerOrder,
  CustomerProfile,
} from "@/lib/shopify/customer-account-api";

// ShipmentItem with joined product data (from warehouse schema)
interface ShipmentItemWithProduct {
  id: string;
  qrCode: string;
  productId: string;
  deliveredAt: Date | null;
  warrantyMonths: number;
  warrantyStatus: string; // "pending" | "active" | "expired" | "void"
  isAuthentic: boolean;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    brand: string;
    model: string;
    color?: { name: string; hex: string } | null;
    brand_relation?: { name: string } | null;
  } | null;
}

interface AccountPageClientProps {
  profile: CustomerProfile;
  orders: CustomerOrder[];
  addresses: CustomerAddress[];
  products: ShipmentItemWithProduct[];
  pendingSessions: PendingCheckoutSession[];
  initialSection?: string;
  saveAddress: (address: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    address1: string | null;
    address2?: string | null;
    city: string | null;
    province?: string | null;
    country: string | null;
    zip: string | null;
    company?: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
}

type Section = "profile" | "products" | "orders" | "payments" | "addresses";

const navigationItems: Array<{
  id: Section;
  label: string;
  icon: typeof User;
}> = [
  { id: "profile", label: "Hồ sơ", icon: User },
  { id: "products", label: "Sản phẩm", icon: Shield },
  { id: "payments", label: "Thanh toán", icon: CreditCard },
  { id: "orders", label: "Đơn hàng", icon: Package },
  { id: "addresses", label: "Địa chỉ", icon: MapPin },
];

export function AccountPageClient({
  profile,
  orders,
  addresses,
  products,
  pendingSessions,
  initialSection = "profile",
  saveAddress,
}: AccountPageClientProps) {
  const [activeSection, setActiveSection] = useState<Section>(
    (initialSection as Section) || "profile",
  );

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container-max mx-auto px-4">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900">Tài khoản</h1>
          <Button variant="outline" asChild className="h-12">
            <Link href="/logout">
              <LogOut className="w-5 h-5 mr-2" />
              Đăng xuất
            </Link>
          </Button>
        </div>

        {/* Sidebar + Content Layout */}
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden">
              <nav className="flex flex-col">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`flex items-center gap-3 px-6 py-4 text-base font-medium transition-all border-l-4 ${
                        isActive
                          ? "border-primary bg-primary/5 text-zinc-900"
                          : "border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                      {item.id === "payments" && pendingSessions.length > 0 && (
                        <span
                          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isActive
                              ? "bg-amber-600 text-white"
                              : "bg-amber-500 text-white animate-pulse"
                          }`}
                        >
                          {pendingSessions.length}
                        </span>
                      )}
                      {item.id === "products" && products.length > 0 && (
                        <span
                          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-zinc-200 text-zinc-700"
                          }`}
                        >
                          {products.length}
                        </span>
                      )}
                      {item.id === "orders" && orders.length > 0 && (
                        <span
                          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-zinc-200 text-zinc-700"
                          }`}
                        >
                          {orders.length}
                        </span>
                      )}
                      {item.id === "addresses" && addresses.length > 0 && (
                        <span
                          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-zinc-200 text-zinc-700"
                          }`}
                        >
                          {addresses.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {activeSection === "profile" && (
              <ProfileSection profile={profile} />
            )}
            {activeSection === "products" && (
              <ProductsSection products={products} />
            )}
            {activeSection === "payments" && (
              <PendingPaymentsSection sessions={pendingSessions} />
            )}
            {activeSection === "orders" && <OrdersSection orders={orders} />}
            {activeSection === "addresses" && (
              <AddressesSection
                addresses={addresses}
                saveAddress={saveAddress}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
