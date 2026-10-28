import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import RestaurantJsonLd from "@/components/seo/RestaurantJsonLd";
import "./globals.css";

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://houseofurja.us";

export const viewport: Viewport = {
  themeColor: "#2e1c18",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "House of Urja | Contemporary Indian Kitchen in Houston",
    template: "%s | House of Urja",
  },
  description:
    "Meet House of Urja, your new neighborhood kitchen on the first floor of 1500 CityWest Boulevard, Houston. Fresh chef-prepared meals, an Indian-inspired menu, and rotating daily specials.",
  applicationName: "House of Urja",
  keywords: [
    "House of Urja",
    "Houston Indian restaurant",
    "1500 CityWest lunch",
    "contemporary Indian kitchen",
    "Houston lunch specials",
    "CityWest Boulevard food",
  ],
  authors: [{ name: "House of Urja" }],
  creator: "House of Urja",
  publisher: "House of Urja",
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "House of Urja",
    title: "House of Urja | Contemporary Indian Kitchen in Houston",
    description:
      "Fresh, chef-prepared meals, an Indian-inspired menu, and rotating daily specials on the first floor of 1500 CityWest Boulevard, Houston.",
    images: [
      {
        url: "/assets/menu-indian.webp",
        width: 695,
        height: 1800,
        alt: "House of Urja contemporary Indian cuisine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "House of Urja | Contemporary Indian Kitchen in Houston",
    description:
      "Fresh, chef-prepared meals, an Indian-inspired menu, and rotating daily specials on the first floor of 1500 CityWest Boulevard, Houston.",
    images: ["/assets/menu-indian.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${cormorantGaramond.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RestaurantJsonLd />
        {children}
      </body>
    </html>
  );
}

