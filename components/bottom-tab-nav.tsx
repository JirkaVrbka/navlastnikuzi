"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const TABS = [
  { href: "/", label: "Domů", icon: "🏠" },
  { href: "/itinerar", label: "Itinerář", icon: "📅" },
  { href: "/hraci", label: "Hráči", icon: "👥" },
  { href: "/hlasovani", label: "Hlasování", icon: "🗳" },
  { href: "/konklave", label: "Konkláve", icon: "🚪" },
  { href: "/zpovedi", label: "Zpověď", icon: "🕯" },
  { href: "/banka", label: "Banka", icon: "💰" },
] as const;

// Mobile-first bottom tab bar shown on every screen except /login.
export function BottomTabNav() {
  const pathname = usePathname();

  // Login has no navigation chrome.
  if (pathname === "/login") return null;

  return (
    <nav
      className="border-border from-background/40 to-background/95 fixed inset-x-0 bottom-0 z-50 flex justify-center border-t bg-gradient-to-b px-3 pt-2.5 backdrop-blur-xl"
      style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex w-full max-w-[440px] gap-1">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] tracking-wide transition-colors",
                active
                  ? "bg-gold/10 text-gold-bright"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "text-[19px] leading-none transition-[filter]",
                  !active && "opacity-70 grayscale",
                )}
              >
                {tab.icon}
              </span>
              <span className="w-full truncate text-center">{tab.label}</span>
              {active && (
                <span className="bg-gold absolute top-1.5 h-0.5 w-5 rounded-sm shadow-[0_0_10px_var(--gold)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
