import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="container-max px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-5 lg:gap-12">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-white">
              CÔNG TY CỔ PHẦN ONLYPERF
            </h3>
            <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <p>MST: 1234567890</p>
              <p>
                Địa chỉ: Số 123, phố Nguyễn Văn A, phường Hoàn Kiếm, TP Hà Nội
              </p>
              <p>SĐT: xxxx.xxx.xxx</p>
              <p>
                Giấy chứng nhận đăng ký doanh nghiệp số 0123456789 do Sở Kế
                hoạch
              </p>
              <p>Đầu tư Hà Nội cấp lần đầu vào ngày 31/12/2025</p>
            </div>
            <div className="mt-4">
              <Image
                src="/images/PERF-logo-black.png"
                alt="Đã thông báo Bộ Công Thương"
                width={120}
                height={45}
                className="h-auto"
              />
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
              Liên hệ
            </h3>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <p className="font-medium">Tổng đài CSKH</p>
                <a
                  href="tel:0918635365"
                  className="hover:text-zinc-900 dark:hover:text-white"
                >
                  xxxx.xxx.xxx
                </a>
              </li>
              <li>
                <p className="font-medium">Phòng kinh doanh</p>
                <a
                  href="mailto:business@perf.com"
                  className="hover:text-zinc-900 dark:hover:text-white"
                >
                  business@perf.com
                </a>
              </li>
            </ul>
          </div>

          {/* About Perf */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
              Về Perf
            </h3>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <Link
                  href="/about"
                  className="hover:text-zinc-900 dark:hover:text-white"
                >
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link
                  href="/team"
                  className="hover:text-zinc-900 dark:hover:text-white"
                >
                  Đội ngũ
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="hover:text-zinc-900 dark:hover:text-white"
                >
                  Tuyển dụng
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-zinc-900 dark:hover:text-white"
                >
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-zinc-900 dark:hover:text-white"
                >
                  Điều khoản sử dụng
                </Link>
              </li>
            </ul>
          </div>

          {/* Product Categories & Pickleball Knowledge Combined */}
          <div>
            <div className="mb-6">
              <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
                Danh mục sản phẩm
              </h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>
                  <Link
                    href="/collections?category=rackets"
                    className="hover:text-zinc-900 dark:hover:text-white"
                  >
                    Vợt Pickleball
                  </Link>
                </li>
                <li>
                  <Link
                    href="/collections?category=apparel"
                    className="hover:text-zinc-900 dark:hover:text-white"
                  >
                    Quần áo
                  </Link>
                </li>
                <li>
                  <Link
                    href="/collections?category=balls"
                    className="hover:text-zinc-900 dark:hover:text-white"
                  >
                    Bóng
                  </Link>
                </li>
                <li>
                  <Link
                    href="/collections?category=accessories"
                    className="hover:text-zinc-900 dark:hover:text-white"
                  >
                    Phụ kiện
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
                Kiến thức Pickleball
              </h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>
                  <Link
                    href="/rules"
                    className="hover:text-zinc-900 dark:hover:text-white"
                  >
                    Luật chơi
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tournaments"
                    className="hover:text-zinc-900 dark:hover:text-white"
                  >
                    Giải đấu
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tips"
                    className="hover:text-zinc-900 dark:hover:text-white"
                  >
                    Tips
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
            Copyright © 2025 - Perf. All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
