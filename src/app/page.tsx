import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import HeroBanner from "@/components/sections/HeroBanner";
import HeroIntro from "@/components/sections/HeroIntro";
import StorySection from "@/components/sections/StorySection";
import EnergySection from "@/components/sections/EnergySection";
import MenuTeaserSection from "@/components/sections/MenuTeaserSection";
import VisitTeaserSection from "@/components/sections/VisitTeaserSection";
import ScrollRevealManager from "@/components/layout/ScrollRevealManager";
import { getMenu } from "@/lib/menuService";

export const metadata: Metadata = {
  title: {
    absolute: "House of Urja | Contemporary Indian Kitchen in Houston",
  },
  description:
    "Meet House of Urja, your new neighborhood kitchen on the first floor of 1500 CityWest Boulevard, Houston. Fresh chef-prepared meals, Indian flavors, and rotating daily specials.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "House of Urja | Contemporary Indian Kitchen in Houston",
    description:
      "Fresh, chef-prepared meals, an Indian-inspired menu, and rotating daily specials on the first floor of 1500 CityWest Boulevard, Houston.",
    url: "https://houseofurja.us/",
    images: [
      {
        url: "/assets/menu-indian.webp",
        width: 695,
        height: 1800,
        alt: "House of Urja contemporary Indian cuisine",
      },
    ],
  },
};

export default async function HomePage() {
  const menu = await getMenu();
  const specialCategory = menu["Today's Special"];
  const featuredSpecial = specialCategory?.items?.[0];

  return (
    <div className="site-shell page-home">
      <SiteHeader />
      <main>
        <HeroBanner />
        <HeroIntro />
        <StorySection />
        <EnergySection />
        <MenuTeaserSection featuredSpecial={featuredSpecial} />
        <VisitTeaserSection />
      </main>
      <SiteFooter />
      <ScrollRevealManager />
    </div>
  );
}
