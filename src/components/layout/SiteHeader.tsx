"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "../ui/BrandMark";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "Visit", href: "/visit" },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerSolid, setHeaderSolid] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.body.classList.toggle("menu-is-open", menuOpen);
    return () => {
      document.body.classList.remove("menu-is-open");
    };
  }, [menuOpen]);

  useEffect(() => {
    const updateHeader = () => setHeaderSolid(window.scrollY > 24);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  const isHome = pathname === "/";

  return (
    <header
      className={`site-header${
        headerSolid || !isHome ? " header-solid" : ""
      }`}
    >
      <div className="header-inner">
        <BrandMark />
        <nav
          className={`main-nav${menuOpen ? " nav-open" : ""}`}
          aria-label="Main navigation"
        >
          {navItems.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={isActive ? "active" : ""}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
