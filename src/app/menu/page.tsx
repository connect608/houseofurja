import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import MenuExplorer from "@/components/menu/MenuExplorer";
import MenuJsonLd from "@/components/seo/MenuJsonLd";
import { getMenu } from "@/lib/menuService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Rooted in the flavors of India and the comforts of America. Explore our lunch menu, daily rotating specials, and refreshing drinks on the first floor of 1500 CityWest.",
  alternates: {
    canonical: "/menu",
  },
  openGraph: {
    title: "Menu | House of Urja",
    description:
      "Rooted in the flavors of India and the comforts of America. Explore our lunch menu, daily rotating specials, and refreshing drinks.",
    url: "https://houseofurja.us/menu",
    images: [
      {
        url: "/assets/menu-indian.webp",
        width: 695,
        height: 1800,
        alt: "House of Urja Lunch Menu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Menu | House of Urja",
    description:
      "Rooted in the flavors of India and the comforts of America. Explore our lunch menu, daily rotating specials, and refreshing drinks.",
    images: ["/assets/menu-indian.webp"],
  },
};

export default async function MenuPage() {
  const menu = await getMenu();

  return (
    <div className="site-shell page-menu">
      <MenuJsonLd menu={menu} />
      <SiteHeader />
      <main>
        <MenuExplorer initialMenu={menu} />
      </main>
      <SiteFooter />
    </div>
  );
}
