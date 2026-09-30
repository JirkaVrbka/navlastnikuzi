import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { signOut } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";

export default async function Home() {
  const profile = await getProfile();
  // Middleware already gates this, but guard here too (and to read the profile).
  if (!profile) redirect("/login");

  const roleLabel = profile.role === "admin" ? "administrátor" : "organizátor";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">NaVlastniKuzi</h1>
      <p className="text-muted-foreground">
        Přihlášen jako <strong>{profile.email}</strong> ({roleLabel}).
      </p>
      <div className="flex flex-wrap gap-3">
        {profile.role === "admin" ? (
          <Link
            href="/uzivatele"
            className={buttonVariants({ variant: "outline" })}
          >
            Uživatelé
          </Link>
        ) : null}
        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Odhlásit se
          </Button>
        </form>
      </div>
    </main>
  );
}
