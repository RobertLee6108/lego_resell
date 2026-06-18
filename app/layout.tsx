import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { getAuthUser } from "@/lib/auth/getUser";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthUser();

  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full bg-white`}>
      <body className="min-h-full bg-white text-zinc-900 antialiased">
        <Header userEmail={user?.email} />
        <main className="mx-auto max-w-6xl bg-white px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
