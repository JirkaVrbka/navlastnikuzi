import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@navlastnikuzi.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Heslo").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("event: time inputs, pills, field errors, non-dismissable dialog, CRUD", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept()); // auto-accept delete confirm()

  await login(page);
  await page.getByRole("link", { name: "Itinerář" }).click();
  await expect(page).toHaveURL(/\/itinerar$/);

  const dayLabel = `Den ${Date.now()}`;
  const dialog = page.getByRole("dialog");

  // Create a day.
  await page.getByLabel("Datum").fill("2024-10-12");
  await page.getByLabel("Název dne").fill(dayLabel);
  await page.getByRole("button", { name: "Vytvořit den" }).click();
  const daySection = page.locator("section", { hasText: dayLabel });
  await expect(daySection).toBeVisible();

  // Open the add-event dialog; neither Escape nor an outside click may close it.
  await daySection.getByRole("button", { name: /Přidat událost/ }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5); // click outside the dialog
  await expect(dialog).toBeVisible();

  // Time-only inputs, an item pill, and a free-text organizer pill.
  await dialog.getByLabel("Název").fill("Snídaně");
  await dialog.getByLabel("Začátek").fill("08:00");
  await dialog.getByLabel("Konec").fill("09:00");
  await dialog.getByPlaceholder(/Přidat položku/).fill("mapa");
  await dialog.getByRole("button", { name: "Přidat", exact: true }).click();
  await expect(dialog.getByText("mapa")).toBeVisible();
  await dialog.getByPlaceholder(/Hledat uživatele/).fill("Petr");
  await dialog.getByPlaceholder(/Hledat uživatele/).press("Enter");
  await expect(dialog.getByText("Petr")).toBeVisible();

  // Invalid submit: clear the title → field error shown, other values kept.
  await dialog.getByLabel("Název").fill("");
  await dialog.getByRole("button", { name: "Vytvořit" }).click();
  await expect(dialog.getByText("Zadejte název události")).toBeVisible();
  await expect(dialog.getByLabel("Začátek")).toHaveValue("08:00");
  await expect(dialog.getByText("mapa")).toBeVisible();

  // Fix and submit.
  await dialog.getByLabel("Název").fill("Snídaně");
  await dialog.getByRole("button", { name: "Vytvořit" }).click();
  await expect(dialog).toBeHidden();
  await expect(daySection.getByText("Snídaně", { exact: true })).toBeVisible();

  // Reopen: time + pills round-tripped through the DB.
  await daySection.getByText("Snídaně", { exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Začátek")).toHaveValue("08:00");
  await expect(dialog.getByText("mapa")).toBeVisible();
  await expect(dialog.getByText("Petr")).toBeVisible();

  // Edit the title.
  await dialog.getByLabel("Název").fill("Snídaně (upraveno)");
  await dialog.getByRole("button", { name: "Uložit" }).click();
  await expect(dialog).toBeHidden();
  await expect(daySection.getByText("Snídaně (upraveno)")).toBeVisible();

  // Delete.
  await daySection.getByText("Snídaně (upraveno)").click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Smazat" }).click();
  await expect(dialog).toBeHidden();
  await expect(daySection.getByText("Snídaně (upraveno)")).toHaveCount(0);
});

test("create a day and edit its label", async ({ page }) => {
  await login(page);
  await page.goto("/itinerar");

  const label = `Editovat ${Date.now()}`;
  await page.getByLabel("Datum").fill("2024-10-13");
  await page.getByLabel("Název dne").fill(label);
  await page.getByRole("button", { name: "Vytvořit den" }).click();
  const section = page.locator("section", { hasText: label });
  await expect(section).toBeVisible();

  const dialog = page.getByRole("dialog");
  await section.getByRole("button", { name: "Upravit" }).click();
  await expect(dialog).toBeVisible();
  const newLabel = `${label} UPRAVENO`;
  await dialog.getByLabel("Název dne").fill(newLabel);
  await dialog.getByRole("button", { name: "Uložit" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("section", { hasText: newLabel })).toBeVisible();
});
