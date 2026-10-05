import Link from "next/link";
import { redirect } from "next/navigation";
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">NaVlastniKuzi</h1>
      <p className="text-muted-foreground">
        Přihlášen jako <strong>{profile.email}</strong> ({roleLabel}).
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/itinerar"
          className={buttonVariants({ variant: "outline" })}
        >
          Itinerář
        </Link>
        <Link href="/hraci" className={buttonVariants({ variant: "outline" })}>
          Hráči
        </Link>
        <Link
          href="/hlasovani"
          className={buttonVariants({ variant: "outline" })}
        >
          Hlasování
        </Link>
        {profile.role === "admin" ? (
          <Link
            href="/uzivatele"
            className={buttonVariants({ variant: "outline" })}
          >
            Uživatelé
          </Link>
        ) : null}
        {profile.role === "admin" ? (
          <Link
            href="/mcp-tokeny"
            className={buttonVariants({ variant: "outline" })}
          >
            MCP tokeny
          </Link>
        ) : null}
        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Odhlásit se
          </Button>
        </form>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Moje události</h2>
        <MyAgenda groups={groups} users={users} />
      </section>
    </main>
  );
}
