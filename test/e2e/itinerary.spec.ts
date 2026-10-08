import { test, expect, type Page, type Locator } from "@playwright/test";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@navlastnikuzi.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";

// The itinerary only renders a day's section while it still has upcoming events
// (or it is empty AND dated today-or-later); a day whose events are all in the
// past folds into the top "Uplynulé události" collapsible. So every spec here
// books its events on a far-future date to keep the day's section — and its
// add/edit affordances — on screen.
const FUTURE_DATE = "2035-10-12";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Heslo").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await expect(page).toHaveURL(/\/$/);
}

// Create a day via the "Nový den" dialog; returns its (unique-label) <section>.
// The open is retried so a click that lands before hydration does not wedge it.
async function createDay(page: Page, label: string, date = FUTURE_DATE) {
  await expect(async () => {
    await page.getByRole("button", { name: "Nový den" }).click();
    await expect(page.getByLabel("Datum")).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
  await page.getByLabel("Datum").fill(date);
  await page.getByLabel("Název dne").fill(label);
  await page.getByRole("button", { name: "Vytvořit den" }).click();
  const section = page.locator("section", { hasText: label });
  await expect(section).toBeVisible();
  return section;
}

// Open the day's settings cog, then its "+ Přidat událost" view. Returns the
// (non-dismissable) dialog, now showing the event form.
async function openAddEvent(page: Page, section: Locator) {
  await section.getByRole("button", { name: "Nastavení dne" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Přidat událost/ }).click();
  return dialog;
}

// The clickable timeline row for an event. The row shows the title twice (chip +
// heading), so a plain getByText is ambiguous — scope to the row's trigger button.
function eventTrigger(section: Locator, title: string) {
  return section.getByRole("button").filter({ hasText: title });
}

test("event: time inputs, pills, field errors, non-dismissable dialog, CRUD", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept()); // auto-accept delete confirm()

  await login(page);
  // Nav link (bottom tab) — scope to the nav so it doesn't also match the home
  // page's "Zobrazit celý itinerář →" link.
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Itinerář" })
    .click();
  await expect(page).toHaveURL(/\/itinerar$/);

  const dayLabel = `Den ${Date.now()}`;
  const section = await createDay(page, dayLabel);
  const dialog = page.getByRole("dialog");

  // Open the add-event view; neither Escape nor an outside click may close it.
  await section.getByRole("button", { name: "Nastavení dne" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Přidat událost/ }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5); // click outside the dialog
  await expect(dialog).toBeVisible();

  // Základ tab: title + time-only inputs.
  await dialog.getByLabel("Název").fill("Snídaně");
  await dialog.getByLabel("startTime-hour").selectOption("08");
  await dialog.getByLabel("startTime-minute").selectOption("00");
  await dialog.getByLabel("endTime-hour").selectOption("09");
  await dialog.getByLabel("endTime-minute").selectOption("00");

  // Detaily tab: an item pill, a free-text organizer pill, and a document link.
  await dialog.getByRole("tab", { name: /Detaily/ }).click();
  await dialog.getByPlaceholder(/Hledat rekvizitu/).fill("mapa");
  await dialog.getByPlaceholder(/Hledat rekvizitu/).press("Enter");
  await expect(dialog.getByText("mapa")).toBeVisible();
  await dialog.getByPlaceholder(/Hledat uživatele/).fill("Petr");
  await dialog.getByPlaceholder(/Hledat uživatele/).press("Enter");
  await expect(dialog.getByText("Petr")).toBeVisible();
  await dialog.getByLabel("Odkaz na dokument").fill("https://example.com/doc");

  // Invalid submit: clear the title → a field error (the form jumps back to the
  // Základ tab to show it), and every other value is kept.
  await dialog.getByRole("tab", { name: /Základ/ }).click();
  await dialog.getByLabel("Název").fill("");
  await dialog.getByRole("button", { name: "Vytvořit" }).click();
  await expect(dialog.getByText("Zadejte název události")).toBeVisible();
  await expect(dialog.getByLabel("startTime-hour")).toHaveValue("08");
  await expect(dialog.getByLabel("startTime-minute")).toHaveValue("00");
  // The item pill survived the failed submit (it lives on the Detaily tab).
  await dialog.getByRole("tab", { name: /Detaily/ }).click();
  await expect(dialog.getByText("mapa")).toBeVisible();

  // Fix and submit.
  await dialog.getByRole("tab", { name: /Základ/ }).click();
  await dialog.getByLabel("Název").fill("Snídaně");
  await dialog.getByRole("button", { name: "Vytvořit" }).click();
  await expect(dialog).toBeHidden();
  await expect(eventTrigger(section, "Snídaně")).toBeVisible();

  // Reopen → READ-ONLY view first (no form inputs), with the data + link rendered.
  await eventTrigger(section, "Snídaně").click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Název")).toHaveCount(0); // no form inputs
  await expect(dialog.getByText("mapa")).toBeVisible();
  await expect(dialog.getByText("Petr")).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "https://example.com/doc" }),
  ).toBeVisible();

  // Upravit → form appears with values preserved; edit the title.
  await dialog.getByRole("button", { name: "Upravit" }).click();
  await expect(dialog.getByLabel("startTime-hour")).toHaveValue("08");
  await expect(dialog.getByLabel("startTime-minute")).toHaveValue("00");
  await dialog.getByLabel("Název").fill("Snídaně (upraveno)");
  await dialog.getByRole("button", { name: "Uložit" }).click();
  await expect(dialog).toBeHidden();
  await expect(eventTrigger(section, "Snídaně (upraveno)")).toBeVisible();

  // Delete: open (read-only) → Upravit → Smazat.
  await eventTrigger(section, "Snídaně (upraveno)").click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Upravit" }).click();
  await dialog.getByRole("button", { name: "Smazat" }).click();
  await expect(dialog).toBeHidden();
  await expect(eventTrigger(section, "Snídaně (upraveno)")).toHaveCount(0);
});

test("delaying an event shifts it and later events; removing reverts", async ({
  page,
}) => {
  await login(page);
  await page.goto("/itinerar");

  const dayLabel = `Zpozdit ${Date.now()}`;
  const dialog = page.getByRole("dialog");
  const section = await createDay(page, dayLabel);

  async function addEvent(title: string, s: string, e: string) {
    await openAddEvent(page, section);
    await dialog.getByLabel("Název").fill(title);
    const [sh, sm] = s.split(":");
    const [eh, em] = e.split(":");
    await dialog.getByLabel("startTime-hour").selectOption(sh);
    await dialog.getByLabel("startTime-minute").selectOption(sm);
    await dialog.getByLabel("endTime-hour").selectOption(eh);
    await dialog.getByLabel("endTime-minute").selectOption(em);
    await dialog.getByRole("button", { name: "Vytvořit" }).click();
    await expect(dialog).toBeHidden();
  }

  await addEvent("Snídaně", "08:00", "09:00");
  await addEvent("Mise 1", "10:00", "11:00");

  const rowA = section.locator("li", { hasText: "Snídaně" });
  const rowB = section.locator("li", { hasText: "Mise 1" });
  // The timeline row shows the start over the end as two separate values.
  await expect(rowB).toContainText("10:00");
  await expect(rowB).toContainText("11:00");

  // Delay A by 15 min via its delay control (lives in the event's detail view).
  // The detail dialog is scoped by its title so it isn't confused with the
  // base-ui popover (which also has role="dialog").
  await eventTrigger(section, "Snídaně").click();
  const detail = page.getByRole("dialog", { name: "Snídaně" });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: /Zpoždění/ }).click();
  await page.getByRole("button", { name: "+15", exact: true }).click();
  await page.keyboard.press("Escape"); // close the delay popover
  await detail.getByRole("button", { name: "Close" }).click();
  await expect(detail).toBeHidden();
  await expect(rowA).toContainText("08:00"); // A's start unchanged
  await expect(rowA).toContainText("09:15"); // A's end extended
  await expect(rowB).toContainText("10:15"); // B shifted
  await expect(rowB).toContainText("11:15");

  // Remove the delay → reverts.
  await eventTrigger(section, "Snídaně").click();
  const detail2 = page.getByRole("dialog", { name: "Snídaně" });
  await expect(detail2).toBeVisible();
  await detail2.getByRole("button", { name: /Zpoždění/ }).click();
  await page.getByRole("button", { name: /Odebrat zpoždění/ }).click();
  await page.keyboard.press("Escape");
  await detail2.getByRole("button", { name: "Close" }).click();
  await expect(detail2).toBeHidden();
  await expect(rowA).toContainText("08:00");
  await expect(rowA).toContainText("09:00");
  await expect(rowB).toContainText("10:00");
  await expect(rowB).toContainText("11:00");
});

test("rekvizity checklist: ticking a prop persists across reload", async ({
  page,
}) => {
  await login(page);
  await page.goto("/itinerar");

  const dayLabel = `Checklist ${Date.now()}`;
  const dialog = page.getByRole("dialog");
  const section = await createDay(page, dayLabel, "2035-10-14");

  // Create an event with one prop (on the Detaily tab).
  await openAddEvent(page, section);
  await dialog.getByLabel("Název").fill("Výprava");
  await dialog.getByLabel("startTime-hour").selectOption("08");
  await dialog.getByLabel("startTime-minute").selectOption("00");
  await dialog.getByLabel("endTime-hour").selectOption("09");
  await dialog.getByLabel("endTime-minute").selectOption("00");
  await dialog.getByRole("tab", { name: /Detaily/ }).click();
  await dialog.getByPlaceholder(/Hledat rekvizitu/).fill("baterka");
  await dialog.getByPlaceholder(/Hledat rekvizitu/).press("Enter");
  await expect(dialog.getByText("baterka")).toBeVisible();
  await dialog.getByRole("button", { name: "Vytvořit" }).click();
  await expect(dialog).toBeHidden();

  // Reopen read-only → the prop now has a checkbox; tick it via its label and
  // wait for the toggle to persist before dropping client state.
  await eventTrigger(section, "Výprava").click();
  await expect(dialog).toBeVisible();
  const checkbox = dialog.getByRole("checkbox");
  await expect(checkbox).not.toBeChecked();
  const persisted = page.waitForResponse(
    (r) => r.request().method() === "POST" && r.url().includes("/itinerar"),
  );
  await dialog.getByText("baterka").click();
  await expect(checkbox).toBeChecked();
  await persisted;

  // Reload the whole page (drops all client state) → reopen → still ticked.
  await page.reload();
  const section2 = page.locator("section", { hasText: dayLabel });
  await eventTrigger(section2, "Výprava").click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("checkbox")).toBeChecked();
});

test("rekvizity picker: links a catalog prop and adds a free-text item", async ({
  page,
}) => {
  // The "není v katalogu" chip is intentionally hidden (commit 487cf1f); this spec verifies picker linking only.
  await login(page);

  // Create a catalog prop (unique name — the TEST stack is never reset).
  const propName = `Pohár ${Date.now()}`;
  await page.goto("/rekvizity");
  await page.getByRole("button", { name: /Přidat rekvizitu/ }).click();
  const propDialog = page.getByRole("dialog");
  await propDialog.getByLabel("Název").fill(propName);
  await propDialog.getByRole("button", { name: "Vytvořit" }).click();
  await expect(propDialog).toBeHidden();
  await expect(page.getByText(propName)).toBeVisible();

  // Build an event with one catalog-linked item + one free-text item.
  await page.goto("/itinerar");
  const dayLabel = `Chip ${Date.now()}`;
  const dialog = page.getByRole("dialog");
  const section = await createDay(page, dayLabel, "2035-10-16");

  await openAddEvent(page, section);
  await dialog.getByLabel("Název").fill("Rituál");
  await dialog.getByLabel("startTime-hour").selectOption("08");
  await dialog.getByLabel("startTime-minute").selectOption("00");
  await dialog.getByLabel("endTime-hour").selectOption("09");
  await dialog.getByLabel("endTime-minute").selectOption("00");

  // Pick the catalog prop from the popover (exact name → only the linked option).
  await dialog.getByRole("tab", { name: /Detaily/ }).click();
  const picker = dialog.getByPlaceholder(/Hledat rekvizitu/);
  await picker.fill(propName);
  await dialog.getByRole("button", { name: propName }).click();
  await expect(dialog.getByText(propName)).toBeVisible();

  // Add a free-text (un-catalogued) item.
  const freeText = `koště ${Date.now()}`;
  await picker.fill(freeText);
  await picker.press("Enter");
  await expect(dialog.getByText(freeText)).toBeVisible();

  await dialog.getByRole("button", { name: "Vytvořit" }).click();
  await expect(dialog).toBeHidden();

  // Open read-only detail → both items (linked and free-text) are listed in the checklist.
  await eventTrigger(section, "Rituál").click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(propName)).toBeVisible();
  await expect(dialog.getByText(freeText)).toBeVisible();
});

test("create a day and edit its label", async ({ page }) => {
  await login(page);
  await page.goto("/itinerar");

  const label = `Editovat ${Date.now()}`;
  const section = await createDay(page, label, "2035-10-13");

  const dialog = page.getByRole("dialog");
  await section.getByRole("button", { name: "Nastavení dne" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Upravit den" }).click();
  const newLabel = `${label} UPRAVENO`;
  await dialog.getByLabel("Název dne").fill(newLabel);
  await dialog.getByRole("button", { name: "Uložit" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("section", { hasText: newLabel })).toBeVisible();
});
