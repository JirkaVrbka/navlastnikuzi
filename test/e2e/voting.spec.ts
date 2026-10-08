import { test, expect, type Page, type Locator } from "@playwright/test";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@navlastnikuzi.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Heslo").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await expect(page).toHaveURL(/\/$/);
}

// Create an in-game player via the Players UI and return its (unique) name.
async function createPlayer(page: Page, name: string) {
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: /Přidat hráče/ }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Jméno").fill(name);
  await dialog.getByRole("button", { name: "Vytvořit" }).click();
  await expect(dialog).toBeHidden();
}

// Only one voting may be open at a time. An aborted prior run can leave a stray
// active voting that would block "Nové hlasování", so end any open one first
// (eliminating nobody) before starting a fresh round.
async function startFreshVoting(page: Page) {
  await page.goto("/hlasovani");
  const endBtn = page.getByRole("button", { name: "Ukončit hlasování" });
  if (await endBtn.isVisible().catch(() => false)) {
    await endBtn.click();
    const d = page.getByRole("dialog");
    await expect(d).toBeVisible();
    await d.getByText("Nikoho").click();
    await d.getByRole("button", { name: "Ukončit", exact: true }).click();
    await expect(d).toBeHidden();
  }
  await page.getByRole("button", { name: "Nové hlasování" }).click();
  await expect(
    page.getByRole("heading", { name: "Aktivní hlasování" }),
  ).toBeVisible();
}

// Read the "pořadí #N" drop-out rank shown in a locator, or null if absent. The
// rank is derived across ALL players in the (shared, never-reset) test DB, so
// assertions compare ranks relationally rather than relying on absolute values.
async function rankOf(locator: Locator): Promise<number | null> {
  const txt = (await locator.textContent()) ?? "";
  const m = txt.match(/pořadí #(\d+)/);
  return m ? Number(m[1]) : null;
}

test("voting: create round, vote (optimistic), sort, end + eliminate", async ({
  page,
}) => {
  await login(page);

  // ── Two fresh in-game players (names unique; the test DB is never reset). ───
  await page.getByRole("link", { name: "Hráči" }).click();
  await expect(page).toHaveURL(/\/hraci$/);
  const stamp = Date.now();
  const nameA = `Hlasovací A ${stamp}`;
  const nameB = `Hlasovací B ${stamp}`;
  await createPlayer(page, nameA);
  await createPlayer(page, nameB);

  // ── Start a new voting from /hlasovani. ────────────────────────────────────
  await startFreshVoting(page);

  const rowA = page.locator("[data-candidate]", { hasText: nameA });
  const rowB = page.locator("[data-candidate]", { hasText: nameB });
  await expect(rowA).toBeVisible();
  await expect(rowB).toBeVisible();

  // Both candidates start at 0 votes.
  await expect(rowA.locator("[data-slot=votes]")).toHaveText("0");
  await expect(rowB.locator("[data-slot=votes]")).toHaveText("0");

  // ── +1 on A → optimistic bump shows 1 (single client; asserts the optimism,
  //    which Realtime then reconciles to the same value). ─────────────────────
  await rowA.getByRole("button", { name: `Přidat hlas ${nameA}` }).click();
  await expect(rowA.locator("[data-slot=votes]")).toHaveText("1");

  // ── Sort by votes → A (1 vote) comes before B (0). ─────────────────────────
  await page.getByRole("button", { name: "počtu hlasů" }).click();
  const rows = page.locator("[data-candidate]");
  await expect(rows.first()).toContainText(nameA);

  // ── End the voting, eliminating A (default top-voted). ─────────────────────
  await page.getByRole("button", { name: "Ukončit hlasování" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // The default selection is the top-voted candidate (A).
  await expect(dialog.getByLabel("Koho vyřadit")).toContainText(nameA);
  await dialog.getByRole("button", { name: "Ukončit", exact: true }).click();
  await expect(dialog).toBeHidden();

  // Voting archived: no active tally (the "Aktivní hlasování" heading is gone)…
  await expect(
    page.getByRole("heading", { name: "Aktivní hlasování" }),
  ).toHaveCount(0);
  // …and the history (once expanded) shows A eliminated.
  await page.getByRole("button", { name: "Historie hlasování" }).click();
  const historyCard = page
    .locator("[data-slot=card]", { hasText: `Vyřazen:` })
    .filter({ hasText: nameA })
    .first();
  await expect(historyCard).toBeVisible();

  // ── /hraci confirms A is out with reason voted-out. ────────────────────────
  await page.goto("/hraci");
  const cardA = page.locator("[data-slot=card]", { hasText: nameA });
  await expect(cardA).toContainText("Vyřazen");
  await expect(cardA).toContainText("Vyřazen(a) hlasováním");
  // B stayed in the game.
  const cardB = page.locator("[data-slot=card]", { hasText: nameB });
  await expect(cardB).toContainText("Ve hře");
});

test("voting: a player murdered mid-round is not offered and end eliminates only the pick", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept()); // auto-accept any confirm()
  await login(page);

  // ── Two fresh in-game players. ─────────────────────────────────────────────
  await page.getByRole("link", { name: "Hráči" }).click();
  await expect(page).toHaveURL(/\/hraci$/);
  const stamp = Date.now();
  const nameA = `Mord A ${stamp}`;
  const nameB = `Mord B ${stamp}`;
  await createPlayer(page, nameA);
  await createPlayer(page, nameB);

  // ── Start a new voting (snapshots both as candidates). ─────────────────────
  await startFreshVoting(page);
  await expect(
    page.locator("[data-candidate]", { hasText: nameB }),
  ).toBeVisible();

  // ── MURDER B via /hraci (reason killed) while the round is still open. ─────
  await page.goto("/hraci");
  const dialog = page.getByRole("dialog");
  const cardB = page.locator("[data-slot=card]", { hasText: nameB });
  await cardB.getByText(nameB).click();
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Důvod vyřazení").selectOption("killed");
  await dialog.getByRole("button", { name: "Vyřadit" }).click();
  await expect(dialog.getByText(/pořadí #\d+/)).toBeVisible();
  const rankBAfterMurder = await rankOf(dialog);
  expect(rankBAfterMurder).not.toBeNull();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(cardB).toContainText("Zavražděn(a) traitory");

  // ── Back to /hlasovani → end: B must NOT be offered as an eliminee. ────────
  await page.goto("/hlasovani");
  await page.getByRole("button", { name: "Ukončit hlasování" }).click();
  const endDialog = page.getByRole("dialog");
  await expect(endDialog).toBeVisible();
  const picker = endDialog.getByLabel("Koho vyřadit");
  await expect(picker).toContainText(nameA);
  await expect(picker).not.toContainText(nameB);

  // Eliminate A (select its radio option in the custom radiogroup) → voted out.
  await picker.getByText(nameA).click();
  await endDialog.getByRole("button", { name: "Ukončit", exact: true }).click();
  await expect(endDialog).toBeHidden();

  // ── /hraci: A voted out, B still killed (reason unchanged), order intact. ──
  await page.goto("/hraci");
  const cardA = page.locator("[data-slot=card]", { hasText: nameA });
  await expect(cardA).toContainText("Vyřazen(a) hlasováním");
  // B's reason is untouched by the vote-out and its rank did not shift (A was
  // eliminated AFTER B, so A ranks one behind B — the order was not corrupted).
  await expect(cardB).toContainText("Zavražděn(a) traitory");
  const rankBNow = await rankOf(cardB);
  const rankANow = await rankOf(cardA);
  expect(rankBNow).toBe(rankBAfterMurder);
  expect(rankANow).toBe(rankBAfterMurder! + 1);
});
