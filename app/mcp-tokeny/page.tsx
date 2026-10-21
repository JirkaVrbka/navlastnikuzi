import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { mcpTokens } from "@/lib/db/schema";
import { isMcpEnabled } from "@/lib/mcp/kill-switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateTokenForm } from "./create-token-form";
import { revokeToken, setMcpEnabledAction } from "./actions";

const fmt = new Intl.DateTimeFormat("cs-CZ", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function McpTokensPage() {
  await requireAdmin();
  const mcpEnabled = await isMcpEnabled();
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
    <main className="mx-auto flex w-full max-w-[440px] flex-col gap-5 px-[18px] py-6">
      <header>
        <h1 className="font-display text-[27px] font-semibold">MCP tokeny</h1>
        <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
          Přístup pro connector
        </p>
      </header>

      <p className="text-muted-foreground text-sm">
        Tokeny slouží k autentizaci MCP connectoru (
        <code className="text-gold font-mono">/api/mcp</code>). Posílají se jako{" "}
        <code className="text-gold font-mono">
          Authorization: Bearer &lt;token&gt;
        </code>
        .
      </p>

      <Card>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-display text-lg leading-tight">
              MCP endpoint
            </span>
            <span
              className={
                mcpEnabled
                  ? "text-green text-xs tracking-[0.1em] uppercase"
                  : "text-red text-xs tracking-[0.1em] uppercase"
              }
            >
              {mcpEnabled ? "Zapnuto" : "Vypnuto"}
            </span>
            {mcpEnabled ? null : (
              <span className="text-muted-foreground text-xs">
                Všechny požadavky na /api/mcp teď okamžitě vrací 404.
              </span>
            )}
          </div>
          <form action={setMcpEnabledAction}>
            <input
              type="hidden"
              name="enabled"
              value={(!mcpEnabled).toString()}
            />
            <Button
              type="submit"
              variant={mcpEnabled ? "destructive" : "default"}
              className="min-h-[44px] shrink-0"
            >
              {mcpEnabled ? "Vypnout" : "Zapnout"}
            </Button>
          </form>
        </div>
      </Card>

      {all.length === 0 ? (
        <p className="text-muted-foreground text-sm">Zatím žádné tokeny.</p>
      ) : (
        <Card>
          <ul className="divide-border divide-y">
            {all.map((t) => {
              const revoked = t.revokedAt !== null;
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-display truncate text-lg leading-tight">
                      {t.label}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Vytvořen {fmt.format(t.createdAt)} · Naposledy použit{" "}
                      {t.lastUsedAt ? fmt.format(t.lastUsedAt) : "nikdy"}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={
                        revoked
                          ? "text-muted-foreground text-xs tracking-[0.1em] uppercase"
                          : "text-green text-xs tracking-[0.1em] uppercase"
                      }
                    >
                      {revoked ? "Odvolán" : "Aktivní"}
                    </span>
                    {revoked ? null : (
                      <form action={revokeToken}>
                        <input type="hidden" name="id" value={t.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          className="min-h-[44px]"
                        >
                          Odvolat
                        </Button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <CreateTokenForm />
    </main>
  );
}
