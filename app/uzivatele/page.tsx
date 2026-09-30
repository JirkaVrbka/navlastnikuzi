import Link from "next/link";
import { asc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { buttonVariants } from "@/components/ui/button";
import { CreateUserForm } from "./create-user-form";

export default async function UsersPage() {
  await requireAdmin();
  const all = await db.select().from(profiles).orderBy(asc(profiles.email));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Uživatelé</h1>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          Zpět
        </Link>
      </div>

      <ul className="divide-y rounded-md border">
        {all.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between gap-3 p-3"
          >
            <span>
              {u.displayName ? `${u.displayName} — ` : ""}
              {u.email}
            </span>
            <span className="text-muted-foreground text-sm">
              {u.role === "admin" ? "administrátor" : "organizátor"}
            </span>
          </li>
        ))}
      </ul>

      <CreateUserForm />
    </main>
  );
}
