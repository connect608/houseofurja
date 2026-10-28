import { menuCategories as defaultCategories, MenuCategory } from "@/data/menuData";

interface MenuJsonLdProps {
  menu?: Record<string, MenuCategory>;
}

export default function MenuJsonLd({
  menu = defaultCategories,
}: MenuJsonLdProps) {
  const menuSections = Object.entries(menu).map(
    ([name, category]) => ({
      "@type": "MenuSection",
      name: name,
      description: category.description.join(" "),
      hasMenuItem: category.items.map((item) => ({
        "@type": "MenuItem",
        name: item.name,
        description: item.description,
        offers: {
          "@type": "Offer",
          price: item.price.replace(/[^0-9.]/g, ""),
          priceCurrency: "USD",
        },
      })),
    })
  );

  const schema = {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": "https://houseofurja.us/menu#menu",
    name: "House of Urja Lunch Menu",
    url: "https://houseofurja.us/menu",
    mainEntityOfPage: "https://houseofurja.us/menu",
    inLanguage: "en-US",
    hasMenuSection: menuSections,
  };

  const safeJson = JSON.stringify(schema).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  );
}

