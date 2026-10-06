import { asc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { CreateUserForm } from "./create-user-form";

export default async function UsersPage() {
  await requireAdmin();
  const all = await db.select().from(profiles).orderBy(asc(profiles.email));

  return (
    <main className="mx-auto flex w-full max-w-[440px] flex-col gap-5 px-[18px] py-6">
      <header>
        <h1 className="font-display text-[27px] font-semibold">Uživatelé</h1>
        <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
          Správa přístupů
        </p>
      </header>

      <Card>
        <ul className="divide-border divide-y">
          {all.map((u) => (
            <li
              key={u.id}
              className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-display truncate text-lg leading-tight">
                  {u.displayName ?? u.email}
                </span>
                {u.displayName ? (
                  <span className="text-muted-foreground truncate text-xs">
                    {u.email}
                  </span>
                ) : null}
              </div>
              <span
                className={
                  u.role === "admin"
                    ? "border-gold/40 text-gold bg-gold/10 shrink-0 rounded-full border px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase"
                    : "border-border text-muted-foreground shrink-0 rounded-full border px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase"
                }
              >
                {u.role === "admin" ? "administrátor" : "organizátor"}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <CreateUserForm />
    </main>
  );
}
