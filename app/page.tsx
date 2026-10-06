import Link from "next/link";
import { redirect } from "next/navigation";
import { cn } from "cn";
import { getProfile } from "@/lib/auth";
import { getDaysWithEvents, getUsersForPicker } from "@/lib/db/itinerary";
import { selectMyUpcomingAgenda } from "@/lib/domain/agenda";
import { signOut } from "./actions";
import { MyAgenda } from "./my-agenda";
import { Button, buttonVariants } from "@/components/ui/button";

export default async function Home() {
  const profile = await getProfile();
  // Middleware already gates this, but guard here too (and to read the profile).
  if (!profile) redirect("/login");

  const roleLabel = profile.role === "admin" ? "administrátor" : "organizátor";

  const [days, users] = await Promise.all([
    getDaysWithEvents(),
    getUsersForPicker(),
  ]);
  const groups = selectMyUpcomingAgenda(days, profile.id, new Date());

  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px]">
      <header className="px-0.5 pt-[18px] pb-3 text-center">
        <h1 className="font-display-italic text-foreground text-[38px] leading-none font-semibold [text-shadow:0_0_26px_rgba(201,162,100,0.18)]">
          Na Vlastní Kůži
        </h1>
      </header>

      <h2 className="font-display mt-1.5 text-[27px] leading-tight font-semibold tracking-[0.01em]">
        Moje události
      </h2>
      <p className="text-muted-foreground/80 mb-[18px] text-xs tracking-[0.16em] uppercase">
        Osobní přehled
      </p>

      <div className="border-border bg-secondary text-muted-foreground mb-[18px] flex flex-wrap items-center gap-2 rounded-full border px-3.5 py-2 text-xs">
        <span>Přihlášen jako</span>
        <span className="text-foreground">
          {profile.displayName ?? profile.email}
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span className="text-gold tracking-[0.06em]">{roleLabel}</span>
      </div>

      <MyAgenda groups={groups} users={users} />

      <Link
        href="/itinerar"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-4 flex min-h-[46px] w-full",
        )}
      >
        Zobrazit celý itinerář →
      </Link>

      {profile.role === "admin" ? (
        <div className="border-border mt-6 flex flex-col gap-2 border-t pt-5">
          <Link
            href="/uzivatele"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex min-h-[46px] w-full",
            )}
          >
            Uživatelé
          </Link>
          <Link
            href="/mcp-tokeny"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex min-h-[46px] w-full",
            )}
          >
            MCP tokeny
          </Link>
        </div>
      ) : null}

      <form
        action={signOut}
        className={cn(profile.role === "admin" ? "mt-2" : "mt-6")}
      >
        <Button type="submit" variant="ghost" className="min-h-[46px] w-full">
          Odhlásit se
        </Button>
      </form>
    </main>
  );
}
