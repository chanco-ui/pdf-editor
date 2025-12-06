import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF編集ツール",
  description: "Plus One社内向けPDF編集Webアプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

