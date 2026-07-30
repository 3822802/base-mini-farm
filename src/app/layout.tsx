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

// Публичные токены верификации (видны в исходнике страницы, не секреты):
// base:app_id — подтверждение домена на Base.dev;
// talentapp:project_verification — подтверждение проекта на Talent Protocol.
const BASE_APP_ID = "6a6b243c093428c69105ba2b";
const TALENT_VERIFICATION =
  "4fe45090a176b77cae5edad29f4b908f06c4a23b554da69240020a1abedc2cdc227044a9aaca6e6f0a2b1b1a4040d71ceb34cf1c3023005ddbec6140e63a39d7";

export const metadata: Metadata = {
  title: "Base Mini Farm",
  description: "Ретро-мини-апка на Base: купить токен, получить NFT.",
  other: {
    "base:app_id": BASE_APP_ID,
    "talentapp:project_verification": TALENT_VERIFICATION,
  },
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
