"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

const TABS = [
  { href: "/", label: "Domů", icon: "🏠" },
  { href: "/itinerar", label: "Itinerář", icon: "📅" },
  { href: "/hraci", label: "Hráči", icon: "👥" },
  { href: "/stul", label: "Stůl", icon: "🪑" },
  { href: "/hlasovani", label: "Hlasování", icon: "🗳", adminOnly: true },
  { href: "/konklave", label: "Konkláve", icon: "🚪" },
  { href: "/zpovedi", label: "Zpověď", icon: "🕯", adminOnly: true },
  { href: "/banka", label: "Banka", icon: "💰" },
] as const;

// Row split — derived by href membership from the single TABS array above so the
// tab data is never duplicated. Admin-only tabs are still filtered separately.
const PRIMARY_HREFS: string[] = ["/", "/itinerar", "/hraci", "/stul"];
const SECONDARY_HREFS: string[] = [
  "/hlasovani",
  "/konklave",
  "/zpovedi",
  "/banka",
];

function isActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

// Mobile-first bottom tab bar shown on every screen except /login. Two rows: row
// one holds the primary tabs plus a toggle; row two holds the secondary tabs and
// collapses. Admin-only tabs (Hlasování, Zpověď) are filtered out for organizers;
// this is cosmetic — the real enforcement is each page's requireAdmin + guards.
export function BottomTabNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  const visibleTabs = TABS.filter((tab) => isAdmin || !("adminOnly" in tab));
  const primary = visibleTabs.filter((tab) => PRIMARY_HREFS.includes(tab.href));
  const secondary = visibleTabs.filter((tab) =>
    SECONDARY_HREFS.includes(tab.href),
  );

  // Start expanded when the active tab lives in row two, so it is never hidden.
  const activeIsSecondary = secondary.some((tab) =>
    isActive(pathname, tab.href),
  );
  const [open, setOpen] = useState(activeIsSecondary);

  // Re-open if the route changes into a secondary tab; a manual toggle otherwise
  // stands (we never force-close here). Adjusting state during render on a change
  // of the derived value is React's recommended alternative to a setState effect.
  const [wasSecondary, setWasSecondary] = useState(activeIsSecondary);
  if (activeIsSecondary !== wasSecondary) {
    setWasSecondary(activeIsSecondary);
    if (activeIsSecondary) setOpen(true);
  }

  const navRef = useRef<HTMLElement | null>(null);
  const hidden = pathname === "/login";

  // Publish the nav's live rendered height to the global --nav-h variable so the
  // root layout can reserve exactly the right bottom clearance in every state
  // (collapsed, expanded, mid expand/collapse animation). The measured height
  // already includes the nav's own padding + env(safe-area-inset-bottom), so the
  // layout must not add the inset again. On /login the nav isn't rendered, so
  // reset the variable to 0px to avoid leaving a stale reserve behind.
  useEffect(() => {
    const root = document.documentElement;
    if (hidden) {
      root.style.setProperty("--nav-h", "0px");
      return;
    }
    const el = navRef.current;
    if (!el) return;
    const publish = () =>
      root.style.setProperty(
        "--nav-h",
        `${el.getBoundingClientRect().height}px`,
      );
    publish();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, [hidden]);

  // Login has no navigation chrome.
  if (hidden) return null;

  const renderTab = (tab: (typeof TABS)[number]) => {
    const active = isActive(pathname, tab.href);

    return (
      <Link
        key={tab.href}
        href={tab.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "border-border relative flex min-h-[68px] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border text-[12px] transition-colors",
          active
            ? "bg-gold/10 text-gold-bright"
            : "bg-muted text-muted-foreground hover:text-foreground",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "text-[27px] leading-none transition-[filter]",
            !active && "opacity-70 grayscale",
          )}
        >
          {tab.icon}
        </span>
        <span className="w-full truncate text-center">{tab.label}</span>
        {active && (
          <span className="bg-gold absolute top-[7px] h-0.5 w-[22px] rounded-sm shadow-[0_0_10px_var(--gold)]" />
        )}
      </Link>
    );
  };

  return (
    <nav
      ref={navRef}
      className="border-border from-background/40 to-background/95 fixed inset-x-0 bottom-0 z-50 flex justify-center border-t bg-gradient-to-b px-3 pt-2.5 backdrop-blur-xl"
      style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex w-full max-w-[440px] flex-col gap-2">
        {/* Row 1: primary tabs + expand/collapse toggle */}
        <div className="flex gap-2">
          {primary.map(renderTab)}
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Skrýt sekce" : "Zobrazit další sekce"}
            onClick={() => setOpen((prev) => !prev)}
            className="border-border bg-muted text-gold flex min-h-[68px] flex-[0_0_56px] flex-col items-center justify-center gap-1.5 rounded-2xl border transition-colors"
          >
            <span
              aria-hidden
              className={cn(
                "text-[20px] leading-none transition-transform",
                open && "rotate-180",
              )}
            >
              ▾
            </span>
            <span className="text-[10px] tracking-wide uppercase">Víc</span>
          </button>
        </div>

        {/* Row 2: secondary tabs — collapsible via the grid-rows trick. The 8px
            gap above also collapses (negative margin cancels the parent gap). */}
        <div
          className={cn(
            "grid transition-[grid-template-rows,margin-top] duration-300",
            open ? "mt-0 grid-rows-[1fr]" : "-mt-2 grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="flex gap-2">{secondary.map(renderTab)}</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
