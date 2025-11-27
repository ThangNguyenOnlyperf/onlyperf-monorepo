import "~/styles/globals.css";

import { type Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "~/components/ui/sonner";
import LayoutContent from "~/components/layout/LayoutContent";
import { SearchProvider } from "~/providers/SearchProvider";
import ReactQueryProvider from "~/providers/ReactQueryProvider";

export const metadata: Metadata = {
  title: "Warehouse Management System",
  description: "Hệ thống quản lý kho hàng",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const inter = localFont({
  src: [
    {
      path: '../../public/fonts/Inter-VariableFont_opsz,wght.ttf',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Inter-Italic-VariableFont_opsz,wght.ttf',
      style: 'italic',
    },
  ],
  variable: "--font-inter",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${inter.variable}`}>
      <body className="font-sans">
        <ReactQueryProvider>
          <SearchProvider>
            <LayoutContent>
              {children}
            </LayoutContent>
            <Toaster />
          </SearchProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
