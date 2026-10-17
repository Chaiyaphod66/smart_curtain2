import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Curtain",
  description: "เว็บแอปสำหรับดูสถานะเซ็นเซอร์และควบคุมม่านอัจฉริยะ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
