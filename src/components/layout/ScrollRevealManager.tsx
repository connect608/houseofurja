"use client";

import { useEffect } from "react";

export default function ScrollRevealManager() {
  useEffect(() => {
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

    return () => observer.disconnect();
  }, []);

  return null;
}
