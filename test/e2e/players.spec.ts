import { test, expect, type Page, type Locator } from "@playwright/test";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@navlastnikuzi.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";

// Playwright runs with the project root as cwd; setInputFiles resolves from it.
const AVATAR = "test/e2e/fixtures/avatar.png";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Heslo").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await expect(page).toHaveURL(/\/$/);
}

// Read the "pořadí #N" drop-out rank shown in a locator, or null if absent.
// The rank is derived across ALL players in the (shared, never-truncated) test
// DB, so the test asserts the rank RELATION (B = A + 1, revive renumbers down)
// rather than absolute #1/#2, which would depend on leftover eliminated rows.
async function rankOf(locator: Locator): Promise<number | null> {
  const txt = (await locator.textContent()) ?? "";
  const m = txt.match(/pořadí #(\d+)/);
  return m ? Number(m[1]) : null;
}

test("players: create (with photo + notes), eliminate order, revive renumbers", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept()); // auto-accept delete confirm()

  await login(page);
  await page.getByRole("link", { name: "Hráči" }).click();
  await expect(page).toHaveURL(/\/hraci$/);

  const dialog = page.getByRole("dialog");
  const stamp = Date.now();
  const nameA = `Hráč A ${stamp}`;
  const nameB = `Hráč B ${stamp}`;

  // ── Create player A with a real photo upload. ──────────────────────────────
  await page.getByRole("button", { name: /Přidat hráče/ }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Jméno").fill(nameA);
  await dialog.getByLabel("Přezdívka").fill("Alfa");
  await dialog.locator('input[type="file"]').setInputFiles(AVATAR);
  // Two notes added in order A then B — must render in that entry order.
  await dialog.getByPlaceholder(/Přidat poznámku/).fill("Poznámka A");
  await dialog.getByRole("button", { name: "Přidat", exact: true }).click();
  await dialog.getByPlaceholder(/Přidat poznámku/).fill("Poznámka B");
  await dialog.getByRole("button", { name: "Přidat", exact: true }).click();
  await dialog.getByRole("button", { name: "Vytvořit" }).click();
  await expect(dialog).toBeHidden();

  const cardA = page.locator("[data-slot=card]", { hasText: nameA });
  await expect(cardA).toBeVisible();
  await expect(cardA).toContainText("Ve hře");

  // Notes render in entry order (A before B) — guards the stable-ordering fix.
  const noteItems = cardA.locator("li", { hasText: /Poznámka/ });
  await expect(noteItems).toHaveText([/Poznámka A/, /Poznámka B/]);

  // The photo renders from the local Storage bucket (public /object/public/...).
  const img = cardA.locator("img");
  await expect(img).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/public\/player-photos\//,
  );
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);

  // ── Add a note via edit → it shows on the card. ────────────────────────────
  await cardA.getByText(nameA).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Upravit" }).click();
  await dialog.getByPlaceholder(/Přidat poznámku/).fill("Velmi podezřelý");
  await dialog.getByRole("button", { name: "Přidat", exact: true }).click();
  await dialog.getByRole("button", { name: "Uložit" }).click();
  await expect(dialog).toBeHidden();
  await expect(cardA).toContainText("Velmi podezřelý");

  // ── Eliminate A (voted out) → out with a drop-out rank. ────────────────────
  await cardA.getByText(nameA).click();
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Důvod vyřazení").selectOption("voted_out");
  await dialog.getByRole("button", { name: "Vyřadit" }).click();
  await expect(dialog.getByText(/pořadí #\d+/)).toBeVisible();
  const rankA = await rankOf(dialog);
  expect(rankA).not.toBeNull();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(cardA).toContainText("Vyřazen");
  await expect(cardA).toContainText(`pořadí #${rankA}`);

  // ── Create player B and eliminate (killed) → ranked right after A. ─────────
  await page.getByRole("button", { name: /Přidat hráče/ }).click();
  await dialog.getByLabel("Jméno").fill(nameB);
  await dialog.getByRole("button", { name: "Vytvořit" }).click();
  await expect(dialog).toBeHidden();

  const cardB = page.locator("[data-slot=card]", { hasText: nameB });
  await expect(cardB).toBeVisible();
  await cardB.getByText(nameB).click();
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Důvod vyřazení").selectOption("killed");
  await dialog.getByRole("button", { name: "Vyřadit" }).click();
  // B eliminated after A → exactly one rank behind A.
  await expect(dialog.getByText(`pořadí #${rankA! + 1}`)).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(cardB).toContainText(`pořadí #${rankA! + 1}`);

  // ── Revive A → A's rank clears, B moves up by one. ─────────────────────────
  await cardA.getByText(nameA).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Vrátit do hry" }).click();
  await expect(dialog.getByText("Ve hře")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await expect(cardA).toContainText("Ve hře");
  await expect(cardA).not.toContainText("pořadí");
  await expect(cardB).toContainText(`pořadí #${rankA}`);
});
