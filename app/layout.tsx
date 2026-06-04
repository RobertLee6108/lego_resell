import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
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
  title: "레고 가격 비교",
  description: "레고 세트 쇼핑몰별 체감 실구매가 비교",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full bg-white`}>
      <body className="min-h-full bg-white text-zinc-900 antialiased">
        <Header />
        <main className="mx-auto max-w-6xl bg-white px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
