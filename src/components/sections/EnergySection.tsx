const energySlides = [
  "/assets/energy-cardamom.webp",
  "/assets/energy-cucumber.webp",
  "/assets/energy-peppers.webp",
  "/assets/story-spices.webp",
  "/assets/story-dish.webp",
  "/assets/story-dough.webp",
  "/assets/energy-ginger.webp",
];

export default function EnergySection() {
  return (
    <section className="energy" id="energy" aria-labelledby="energy-title">
      <div
        className="energy-image reveal"
        role="img"
        aria-label="Fresh ingredients, colorful dishes, and hands preparing food"
      >
        {energySlides.map((slide, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="energy-slide"
            src={slide}
            alt=""
            aria-hidden="true"
            key={slide}
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
          />
        ))}
      </div>
      <div className="energy-copy reveal">
        <h2 id="energy-title">
          Good Food.
          <br />
          <i>Good Energy.</i>
        </h2>
        <div className="energy-text">
          <p>
            Urja means energy, and we believe a good lunch should give you
            plenty.
          </p>
          <p>
            That philosophy starts with quality ingredients, vibrant spices, and
            food made fresh every day. We craft our meals to satisfy your
            appetite without leaving you weighed down, so you can enjoy every
            bite and still have plenty of energy for the afternoon ahead.
          </p>
          <p>
            When lunch is this good, the rest of your day feels a little better,
            too.
          </p>
        </div>
      </div>
    </section>
  );
}
