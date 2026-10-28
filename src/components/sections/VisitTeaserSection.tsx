import ArrowIcon from "../ui/ArrowIcon";

export default function VisitTeaserSection() {
  return (
    <section className="visit" id="visit" aria-labelledby="visit-title">
      <div className="visit-copy reveal">
        <h2 id="visit-title">
          Your Building.
          <br />
          <i>Your Kitchen.</i>
        </h2>
        <div className="visit-text">
          <p>The best lunch spot might be closer than you think.</p>
          <p>
            Located on the first floor of 1500 CityWest, House of Urja is here
            for the people who make this building their home away from home.
            Come downstairs for something delicious, take a seat, and enjoy a
            little time away from your desk.
          </p>
          <p>
            We look forward to getting to know you, and maybe even your usual
            order.
          </p>
        </div>
        <a
          className="button button-light"
          href="https://maps.google.com/?q=1500+CityWest+Boulevard+Houston+TX"
          target="_blank"
          rel="noreferrer"
        >
          Come See Us <ArrowIcon />
        </a>
      </div>
    </section>
  );
}
