import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Suspense } from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "SpoilerHub — สปอยล์ anime manga manhwa ตอนล่าสุด",
    template: "%s | SpoilerHub",
  },
  description:
    "อ่านสปอยล์ anime manga manhwa manhua novel ตอนล่าสุด พร้อมสรุปเนื้อเรื่อง",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="dark">
      <body className={inter.className}>
        <Suspense fallback={<header className="border-b border-border bg-background sticky top-0 z-50 h-14" />}>
          <Navbar />
        </Suspense>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
