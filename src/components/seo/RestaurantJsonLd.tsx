export default function RestaurantJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://houseofurja.us/#website",
        "url": "https://houseofurja.us",
        "name": "House of Urja",
        "description":
          "Contemporary Indian kitchen on the first floor of 1500 CityWest Boulevard, Houston, TX.",
        "inLanguage": "en-US",
      },
      {
        "@type": ["Restaurant", "FoodEstablishment"],
        "@id": "https://houseofurja.us/#restaurant",
        "name": "House of Urja",
        "url": "https://houseofurja.us",
        "description":
          "Fresh, chef-prepared meals, an Indian-inspired menu, and rotating daily specials on the first floor of 1500 CityWest Boulevard, Houston.",
        "image": "https://houseofurja.us/assets/menu-indian.webp",
        "servesCuisine": ["Indian", "Contemporary Indian", "American"],
        "priceRange": "$$",
        "hasMenu": "https://houseofurja.us/menu",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "1500 CityWest Boulevard, First Floor",
          "addressLocality": "Houston",
          "addressRegion": "TX",
          "postalCode": "77042",
          "addressCountry": "US",
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 29.7402,
          "longitude": -95.5684,
        },
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
            ],
            "opens": "07:00",
            "closes": "14:00",
          },
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Saturday", "Sunday"],
            "opens": "00:00",
            "closes": "00:00",
          },
        ],
      },
    ],
  };

  const safeJson = JSON.stringify(schema).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  );
}

