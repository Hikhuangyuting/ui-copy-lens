import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UI文案优化",
  description:
    "上传 UI 截图，识别文字并按规则优化文案；无需登录，本地预览与后续流程对接。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
