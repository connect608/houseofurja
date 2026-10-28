"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ArrowIcon from "@/components/ui/ArrowIcon";

interface MenuTeaserSectionProps {
  featuredSpecial?: {
    name: string;
    description: string;
    price?: string;
  };
}

export default function MenuTeaserSection({
  featuredSpecial,
}: MenuTeaserSectionProps = {}) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!sectionRef.current || reduceMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        sectionRef.current,
        { "--parallax-y": "-60px" },
        {
          "--parallax-y": "60px",
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      className="menu-section section"
      id="menu"
      aria-labelledby="menu-title"
    >
      <div className="container">
        <div className="menu-intro reveal" ref={sectionRef}>
          <div className="menu-intro-content">
            <div>
              <h2 id="menu-title">
                Something New{" "}
                <span className="menu-title-is">
                  Is{" "}
                  <span className="menu-title-always-mobile">Always</span>
                </span>
                <i>
                  <span className="menu-title-always-desktop">Always </span>
                  Cooking.
                </i>
              </h2>
            </div>
            <div className="menu-copy">
              <p>
                Your favorites will always have a place on our menu, but we&apos;ve
                made room for curiosity, too.
              </p>
              <p>
                Our rotating daily special brings something different to the
                table, with chef-curated dishes inspired by flavors beyond our
                Indian roots. Check the menu to see what we&apos;re serving this
                week.
              </p>
            </div>
            <div className="menu-featured">
              <p className="eyebrow eyebrow-light">Featured Daily Special</p>
              <h3>
                {featuredSpecial?.name || (
                  <>
                    Butter <i>Chicken.</i>
                  </>
                )}
              </h3>
              <p>
                {featuredSpecial?.description ||
                  "Tender chicken in a velvety tomato sauce with cultured butter, fenugreek, and warming spice, served alongside fragrant basmati rice and finished with fresh cilantro."}
              </p>
              <Link className="button button-light" href="/menu">
                View Today’s Menu <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
