import type { Metadata, Viewport } from "next";
import { MARKA_ADI } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: MARKA_ADI,
    template: `%s | ${MARKA_ADI}`,
  },
  description: `${MARKA_ADI}: yazılım projeleri, sunucular, alan adları, lisanslar ve bayi süreçleri için yönetim platformu.`,
  robots: { index: false, follow: false }, // Yönetim paneli arama motorlarına kapalı
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
