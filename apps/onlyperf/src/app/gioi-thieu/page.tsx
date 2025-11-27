import type { Metadata } from "next";
import {
  generateBreadcrumbSchema,
  generatePageMetadata,
  JsonLd,
} from "@/lib/seo";
import { AboutHero } from "./components/AboutHero";
import { Achievements } from "./components/Achievements";
import { BrandStory } from "./components/BrandStory";
import { MissionValues } from "./components/MissionValues";
import { TeamSection } from "./components/TeamSection";

export const revalidate = false;

export const metadata: Metadata = generatePageMetadata({
  title: "Giới Thiệu",
  description:
    "Tìm hiểu về OnlyPerf - thương hiệu thời trang thể thao cao cấp tại Việt Nam. Câu chuyện, sứ mệnh và đội ngũ đứng sau những sản phẩm chất lượng.",
  keywords: [
    "giới thiệu OnlyPerf",
    "về chúng tôi",
    "thương hiệu thể thao Việt Nam",
    "câu chuyện OnlyPerf",
    "sứ mệnh OnlyPerf",
    "đội ngũ OnlyPerf",
  ],
  path: "/gioi-thieu",
});

export default function AboutPage() {
  // Breadcrumb structured data
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://onlyperf.com";
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Trang chủ", url: baseUrl },
    { name: "Giới thiệu", url: `${baseUrl}/gioi-thieu` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />

      {/* Hero Section */}
      <AboutHero />

      {/* Brand Story */}
      <BrandStory />

      {/* Mission & Values */}
      <MissionValues />

      {/* Achievements */}
      <Achievements />

      {/* Team Section */}
      <TeamSection />

      {/* Optional: Add a CTA section at the bottom */}
      <section className="bg-gradient-to-br from-emerald-600 to-emerald-700 py-16 text-white">
        <div className="container-page text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Sẵn Sàng Trải Nghiệm OnlyPerf?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-emerald-100">
            Khám phá bộ sưu tập sản phẩm thể thao cao cấp và bắt đầu hành trình
            thể thao của bạn cùng chúng tôi
          </p>
          <a
            href="/collections"
            className="inline-block rounded-full bg-white px-8 py-3 font-semibold text-emerald-600 transition-transform hover:scale-105 hover:shadow-xl"
          >
            Khám Phá Sản Phẩm
          </a>
        </div>
      </section>
    </>
  );
}
