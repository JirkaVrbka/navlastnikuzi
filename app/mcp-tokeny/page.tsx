import Link from "next/link";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { mcpTokens } from "@/lib/db/schema";
import { Button, buttonVariants } from "@/components/ui/button";
import { CreateTokenForm } from "./create-token-form";
import { revokeToken } from "./actions";

const fmt = new Intl.DateTimeFormat("cs-CZ", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function McpTokensPage() {
  await requireAdmin();
  // NOTE: token_hash is a secret — it is intentionally never selected/rendered.
  const all = await db
    .select({
      id: mcpTokens.id,
      label: mcpTokens.label,
      createdAt: mcpTokens.createdAt,
      lastUsedAt: mcpTokens.lastUsedAt,
      revokedAt: mcpTokens.revokedAt,
    })
    .from(mcpTokens)
    .orderBy(desc(mcpTokens.createdAt));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">MCP tokeny</h1>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          Zpět
        </Link>
      </div>

      <p className="text-muted-foreground text-sm">
        Tokeny slouží k autentizaci MCP connectoru (
        <code className="font-mono">/api/mcp</code>). Posílají se jako{" "}
        <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>.
      </p>

      {all.length === 0 ? (
        <p className="text-muted-foreground text-sm">Zatím žádné tokeny.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {all.map((t) => {
            const revoked = t.revokedAt !== null;
            return (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium">{t.label}</span>
                  <span className="text-muted-foreground text-xs">
                    Vytvořen {fmt.format(t.createdAt)} · Naposledy použit{" "}
                    {t.lastUsedAt ? fmt.format(t.lastUsedAt) : "nikdy"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={
                      revoked
                        ? "text-muted-foreground text-sm"
                        : "text-sm text-green-600"
                    }
                  >
                    {revoked ? "Odvolán" : "Aktivní"}
                  </span>
                  {revoked ? null : (
                    <form action={revokeToken}>
                      <input type="hidden" name="id" value={t.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Odvolat
                      </Button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CreateTokenForm />
    </main>
  );
}
