import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "卡密系统",
  description: "支持批量生成、在线核销和后台管理的卡密系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link href="/" className="brand">
              卡密系统
            </Link>
            <nav className="nav">
              <Link href="/admin">后台管理</Link>
              <Link href="/redeem">核销页面</Link>
            </nav>
          </header>
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
