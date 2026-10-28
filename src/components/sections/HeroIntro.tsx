import ArrowIcon from "../ui/ArrowIcon";

export default function HeroIntro() {
  return (
    <section className="hero-intro" aria-labelledby="hero-title">
      <div className="hero-intro-inner reveal">
        <div className="hero-intro-copy">
          <h1 className="hero-title" id="hero-title">
            Lunch Worth
            <i>Coming Downstairs For</i>
          </h1>
          <p className="hero-description">
            Meet House of Urja, your new neighborhood kitchen on the first floor
            of 1500 CityWest. With fresh, chef-prepared meals, an Indian-inspired
            menu, and rotating daily specials from around the world, we&apos;re
            bringing something to look forward to in your workday.
          </p>
          <div className="hero-location-callout">
            <span>1500 CityWest Boulevard · First Floor</span>
            <span>Monday–Friday · 7:00 AM–2:00 PM</span>
          </div>
          <a className="button hero-button" href="#menu">
            Explore Our Menu <ArrowIcon />
          </a>
        </div>
      </div>
    </section>
  );
}
