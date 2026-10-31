import Link from "next/link";
import ArrowIcon from "@/components/ui/ArrowIcon";

export default function VisitExplorer() {
  return (
    <section className="visit-page" aria-labelledby="visit-page-title">
      <div className="visit-page-content">
        <header className="visit-page-intro reveal">
          <h1 id="visit-page-title">
            Good Food Is
            <i>Just Downstairs.</i>
          </h1>
          <p>
            Your next great lunch is closer than you think. Take a break, sit
            down, and enjoy a meal at House of Urja.
          </p>
        </header>

        <div className="visit-page-grid">
          <div className="visit-page-column reveal">
            <section aria-labelledby="visit-find-title">
              <h2 id="visit-find-title">Find Us</h2>
              <p className="visit-place-name">House of Urja</p>
              <address>
                1500 CityWest Boulevard, First Floor
                <br />
                Houston, TX 77042
              </address>
              <p>
                We&apos;re right where your workday happens. Just head downstairs
                and follow your appetite.
              </p>
              <a
                className="button button-light"
                href="https://maps.google.com/?q=1500+CityWest+Boulevard+Houston+TX+77042"
                target="_blank"
                rel="noreferrer"
              >
                Get Directions <ArrowIcon />
              </a>
            </section>

            <section aria-labelledby="visit-stay-title">
              <h2 id="visit-stay-title">
                Stay a While
                <i>There&apos;s Room for You.</i>
              </h2>
              <p>
                Seating is available inside House of Urja and in the
                building&apos;s first-floor lounge. Eat, catch up with
                colleagues, or take a moment for yourself. You&apos;re always
                welcome to take your food back upstairs, too.
              </p>
            </section>
          </div>

          <div className="visit-page-column reveal">
            <section aria-labelledby="visit-hours-title">
              <h2 id="visit-hours-title">Hours &amp; Information</h2>
              <dl className="visit-hours-list">
                <div>
                  <dt>Monday–Friday</dt>
                  <dd>7:00 AM–2:00 PM</dd>
                </div>
                <div>
                  <dt>Saturday–Sunday</dt>
                  <dd>Closed</dd>
                </div>
              </dl>
            </section>

            <section
              className="visit-contact-section"
              aria-labelledby="visit-contact-title"
            >
              <h2 id="visit-contact-title">We&apos;d Love to Hear From You</h2>
              <p>
                Questions about the menu or today&apos;s special? We&apos;re
                happy to help—or stop by and say hello.
              </p>
              <dl className="visit-contact-list">
                <div>
                  <dt>Email</dt>
                  <dd>Email Address</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>Phone Number</dd>
                </div>
              </dl>
              <Link className="button button-light" href="/menu">
                Explore Our Menu <ArrowIcon />
              </Link>
            </section>
          </div>
        </div>
      </div>

      <div className="visit-dish-stage" aria-hidden="true">
        <div className="visit-spinning-dish">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/visit-kofta2.webp"
            alt=""
            width={1408}
            height={1408}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}
