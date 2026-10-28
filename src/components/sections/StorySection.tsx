import Link from "next/link";
import ArrowIcon from "../ui/ArrowIcon";

export default function StorySection() {
  return (
    <section className="story section" id="story" aria-labelledby="story-title">
      <div className="container story-layout">
        <div className="story-intro">
          <div className="story-copy">
            <div className="story-title reveal">
              <h2 id="story-title">
                <span>Rooted in</span>{" "}
                <span className="story-title-flavor">
                  <i>Indian Flavor.</i>
                </span>
                <i>
                  There&apos;s Something Special About a Meal Made With Care,
                  Especially When It&apos;s Just Downstairs.
                </i>
              </h2>
            </div>
            <div className="story-body reveal">
              <p>
                At House of Urja, our menu is grounded in the bold spices and
                comforting flavors of Indian cuisine, alongside American cuisine
                and dishes, with familiar favorites from both traditions that
                you&apos;ll come back for. But we&apos;re not afraid to explore. Each
                day, our kitchen introduces a new special inspired by cuisines
                from around the world, giving you another reason to see what&apos;s
                cooking.
              </p>
              <p>
                Every dish is thoughtfully curated by a professional chef and
                prepared fresh daily, bringing the attention and craftsmanship of a
                restaurant kitchen to your everyday lunch.
              </p>
              <Link className="button" href="/menu">
                See What&apos;s Cooking <ArrowIcon />
              </Link>
            </div>
          </div>
          <div className="story-feature-image reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/story-chef-new.webp"
              alt="House of Urja chef carefully plating a dish"
              width={1273}
              height={1080}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
