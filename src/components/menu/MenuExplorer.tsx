"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import ArrowIcon from "@/components/ui/ArrowIcon";
import { menuCategories as defaultCategories, MenuCategory, Dish } from "@/data/menuData";

interface MenuExplorerProps {
  initialMenu?: Record<string, MenuCategory>;
}

function MenuItemArticle({
  dish,
  activeCategory,
  isExpanded,
  onToggle,
}: {
  dish: Dish;
  activeCategory: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const dishKey = `${activeCategory}-${dish.name}`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isClampable, setIsClampable] = useState(false);
  const twoLinesHeightRef = useRef<number>(48);

  // Check if text exceeds 2 lines
  useEffect(() => {
    const p = textRef.current;
    if (!p) return;

    const measureOverflow = () => {
      const computedLineHeight =
        parseFloat(window.getComputedStyle(p).lineHeight) || 24;
      const expectedTwoLines = Math.round(computedLineHeight * 2);
      twoLinesHeightRef.current = expectedTwoLines;

      const hasOverflow = p.scrollHeight > expectedTwoLines + 2;
      setIsClampable(hasOverflow);
    };

    measureOverflow();
    window.addEventListener("resize", measureOverflow);
    return () => window.removeEventListener("resize", measureOverflow);
  }, [dish.description]);

  // Smooth slide down on expand / slide up on collapse
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const p = textRef.current;
    if (!wrapper || !p) return;

    if (!isClampable) {
      wrapper.style.height = "auto";
      return;
    }

    const twoLinesHeight = twoLinesHeightRef.current;

    if (isExpanded) {
      p.classList.remove("line-clamp-2");
      p.classList.add("line-clamp-none");
      wrapper.style.height = `${twoLinesHeight}px`;
      void wrapper.offsetHeight;
      const fullHeight = p.scrollHeight;
      wrapper.style.height = `${fullHeight}px`;

      const timer = setTimeout(() => {
        if (wrapper.style.height === `${fullHeight}px`) {
          wrapper.style.height = "auto";
        }
      }, 330);
      return () => clearTimeout(timer);
    } else {
      p.classList.remove("line-clamp-2");
      p.classList.add("line-clamp-none");
      const currentHeight = p.offsetHeight;
      wrapper.style.height = `${currentHeight}px`;
      void wrapper.offsetHeight;
      wrapper.style.height = `${twoLinesHeight}px`;

      const timer = setTimeout(() => {
        p.classList.remove("line-clamp-none");
        p.classList.add("line-clamp-2");
      }, 330);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, isClampable]);

  return (
    <article
      data-dish-key={dishKey}
      onClick={() => {
        if (isClampable) {
          onToggle();
        }
      }}
      className={isClampable ? "menu-item-interactive" : ""}
      style={{ cursor: isClampable ? "pointer" : "default" }}
      role={isClampable ? "button" : undefined}
      tabIndex={isClampable ? 0 : undefined}
      aria-expanded={isClampable ? isExpanded : undefined}
      title={
        isClampable
          ? isExpanded
            ? "Click to collapse"
            : "Click to read full description"
          : undefined
      }
      onKeyDown={(e) => {
        if (isClampable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="menu-item-mark"
        src="/assets/menu-item-mark.png"
        alt=""
        aria-hidden="true"
        width={82}
        height={240}
        loading="lazy"
        decoding="async"
      />
      <div>
        <div className="menu-item-heading">
          <h3>{dish.name}</h3>
          <strong>{dish.price}</strong>
        </div>
        <div
          ref={wrapperRef}
          className={`menu-item-desc-wrapper ${isClampable ? "is-clampable" : ""}`}
        >
          <p
            ref={textRef}
            className={`menu-item-desc ${isExpanded ? "line-clamp-none" : "line-clamp-2"}`}
          >
            {dish.description}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function MenuExplorer({
  initialMenu = defaultCategories,
}: MenuExplorerProps) {
  const categoryNames = Object.keys(initialMenu);
  const [activeCategory, setActiveCategory] = useState(categoryNames[0] || "");
  const [expandedDish, setExpandedDish] = useState<string | null>(null);
  const activeMenu =
    initialMenu[activeCategory] || initialMenu[categoryNames[0]];

  const tabsRef = useRef<HTMLDivElement>(null);

  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [categoryNames.length]);

  // Close expanded description when clicking anywhere outside
  useEffect(() => {
    if (!expandedDish) return;

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest(`[data-dish-key="${expandedDish}"]`)) {
        setExpandedDish(null);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [expandedDish]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = tabsRef.current;
    if (!el) return;
    isMouseDownRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = tabsRef.current;
    if (!isMouseDownRef.current || !el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
  };

  if (!activeMenu) return null;

  return (
    <section
      className="menu-page-layout"
      id="menu"
      aria-labelledby="menu-page-title"
    >
      <div className="menu-page-panel">
        <div className="menu-page-heading">
          <h1 id="menu-page-title">
            See What&apos;s
            <br />
            <i>Cooking.</i>
          </h1>
          <p>
            From Indian favorites and American cuisine to something new each day,
            our menu keeps things interesting. We thoughtfully curate every dish
            and prepare it fresh, bringing big flavor and good energy to your
            lunch break.
          </p>
        </div>

        {/* Categories Tab Strip with Smooth Scroll & Swipe */}
        <div className="menu-page-tabs-wrapper">
          <div
            ref={tabsRef}
            className="menu-page-tabs"
            role="tablist"
            aria-label="Menu categories"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {categoryNames.map((name, index) => (
              <button
                key={name}
                className={activeCategory === name ? "active" : ""}
                type="button"
                role="tab"
                id={`menu-tab-${index}`}
                aria-controls="menu-category-panel"
                aria-selected={activeCategory === name}
                onClick={(e) => {
                  if (hasMovedRef.current) return;
                  setActiveCategory(name);
                  setExpandedDish(null);
                  e.currentTarget.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "center",
                  });
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeCategory}-content`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="menu-category-copy">
              <h2>{activeMenu.title}</h2>
              {activeMenu.description.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div
              className="menu-page-list"
              id="menu-category-panel"
              role="tabpanel"
              aria-labelledby={`menu-tab-${categoryNames.indexOf(activeCategory)}`}
            >
              {activeMenu.items.map((dish) => (
                <MenuItemArticle
                  key={`${activeCategory}-${dish.name}`}
                  dish={dish}
                  activeCategory={activeCategory}
                  isExpanded={expandedDish === `${activeCategory}-${dish.name}`}
                  onToggle={() => {
                    const key = `${activeCategory}-${dish.name}`;
                    setExpandedDish((prev) => (prev === key ? null : key));
                  }}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="menu-page-fresh">
          <h2>Made Fresh. Made for Your Day.</h2>
          <p>
            Our kitchen prepares food fresh daily, so selections may vary based
            on availability. Stop by for a meal made with the care you&apos;ll
            taste in every bite.
          </p>
          <div className="menu-page-actions">
            <Link className="button button-light" href="/visit">
              Visit House of Urja <ArrowIcon />
            </Link>
            <button className="button button-outline" type="button">
              Order Online <ArrowIcon />
            </button>
          </div>
        </div>
      </div>

      <aside className="menu-page-visual">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeCategory}
            src={activeMenu.image}
            alt={activeMenu.imageAlt}
            loading="eager"
            decoding="async"
            initial={{ opacity: 0.4, scale: 1.025 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.4 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          />
        </AnimatePresence>
      </aside>
    </section>
  );
}
