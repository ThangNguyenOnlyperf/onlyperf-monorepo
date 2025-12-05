import type { Metadata } from "next";
import {
  generateBreadcrumbSchema,
  generatePageMetadata,
  JsonLd,
} from "@/lib/seo";
import { ContactHero, ContactInfo, SocialMedia } from "./components";

export const revalidate = false;

export const metadata: Metadata = generatePageMetadata({
  title: "Liên hệ",
  description:
    "Thông tin liên hệ OnlyPerf - Địa chỉ, số điện thoại, email và mạng xã hội. Chúng tôi luôn sẵn sàng hỗ trợ bạn.",
  keywords: [
    "liên hệ OnlyPerf",
    "contact OnlyPerf",
    "địa chỉ OnlyPerf",
    "hotline OnlyPerf",
    "email OnlyPerf",
    "hỗ trợ khách hàng",
    "customer support",
  ],
  path: "/contact",
});

export default function ContactPage() {
  // Breadcrumb structured data
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://onlyperf.com";
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Trang chủ", url: baseUrl },
    { name: "Liên hệ", url: `${baseUrl}/contact` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />

      <div className="min-h-screen ">
        {/* Hero Section */}
        <ContactHero />

        <div className="grid grid-cols-1 md:grid-cols-2">
          <ContactInfo />
          <SocialMedia />
        </div>
      </div>
    </>
  );
}
