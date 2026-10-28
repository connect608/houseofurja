import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import VisitExplorer from "@/components/visit/VisitExplorer";
import ScrollRevealManager from "@/components/layout/ScrollRevealManager";

export const metadata: Metadata = {
  title: "Visit",
  description:
    "Good food is just downstairs. Visit House of Urja on the first floor of 1500 CityWest Boulevard, Houston, TX. Open Monday–Friday, 7:00 AM–2:00 PM.",
  alternates: {
    canonical: "/visit",
  },
  openGraph: {
    title: "Visit | House of Urja",
    description:
      "Good food is just downstairs. Visit House of Urja on the first floor of 1500 CityWest Boulevard, Houston, TX. Open Monday–Friday, 7:00 AM–2:00 PM.",
    url: "https://houseofurja.us/visit",
    images: [
      {
        url: "/assets/home-visit-bg.webp",
        width: 1920,
        height: 1080,
        alt: "Visit House of Urja at 1500 CityWest",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Visit | House of Urja",
    description:
      "Good food is just downstairs. Visit House of Urja on the first floor of 1500 CityWest Boulevard, Houston, TX.",
    images: ["/assets/home-visit-bg.webp"],
  },
};

export default function VisitPage() {
  return (
    <div className="site-shell page-visit">
      <SiteHeader />
      <main>
        <VisitExplorer />
      </main>
      <SiteFooter />
      <ScrollRevealManager />
    </div>
  );
}
