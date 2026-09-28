import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteChrome } from "@/components/site-chrome";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Mustang Atlética — Medicina Veterinária Anhanguera",
    template: "%s | Mustang Atlética",
  },
  description:
    "Loja oficial da Mustang Atlética: produtos oficiais da atlética de Medicina Veterinária da Anhanguera. Vista sua paixão pela veterinária.",
  applicationName: "Mustang Atlética",
  keywords: [
    "Mustang Atlética",
    "Medicina Veterinária",
    "Anhanguera",
    "produtos oficiais",
    "atlética veterinária",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: APP_URL,
    siteName: "Mustang Atlética",
    title: "Mustang Atlética — Medicina Veterinária Anhanguera",
    description:
      "Produtos oficiais da Mustang Atlética. Vista sua paixão pela Medicina Veterinária.",
    images: [{ url: "/brand-reference.png", width: 1024, height: 1024, alt: "Mustang Atlética" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mustang Atlética — Medicina Veterinária Anhanguera",
    description: "Produtos oficiais da Mustang Atlética.",
    images: ["/brand-reference.png"],
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/brand-reference.png",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0B1F17",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
