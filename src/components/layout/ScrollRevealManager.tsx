"use client";

import { useEffect } from "react";

export default function ScrollRevealManager() {
  useEffect(() => {
    document.documentElement.classList.add("js-reveal-enabled");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.12 }
    );

    const items = document.querySelectorAll(".reveal");
    items.forEach((item) => observer.observe(item));

    // Safety fallback: ensure all content becomes visible even if observer misses
    const timer = setTimeout(() => {
      items.forEach((item) => item.classList.add("is-visible"));
    }, 1200);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return null;
}
