import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { CloudBaseAuthBootstrap } from "@/components/cloudbase-auth-bootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 音乐社区",
  description: "原创生成、翻唱创作、音乐广场和榜单的一体化 AI 音乐社区。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <CloudBaseAuthBootstrap />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
