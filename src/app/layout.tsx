import type { Metadata, Viewport } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const press = Press_Start_2P({
  weight: "400",
  subsets: ["latin", "cyrillic"],
  variable: "--font-press",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Base Mini Farm",
  description: "Ретро-мини-апка на Base: купить токен, получить NFT.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#5c94fc",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${press.variable} h-full`}>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
