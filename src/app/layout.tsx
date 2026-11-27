import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TanNhienExport-CRM — Quản lý Kinh doanh Xuất khẩu",
  description:
    "Hệ thống quản lý khách hàng xuất khẩu (CRM Pipeline), danh mục sản phẩm, đơn hàng và báo cáo doanh thu.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#F3F6FA] text-slate-800 font-sans">
        {children}
      </body>
    </html>
  );
}
