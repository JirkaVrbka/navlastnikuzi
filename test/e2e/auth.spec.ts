import { test, expect } from "@playwright/test";

// These flows assume local Supabase is up, migrations are applied, and the admin
// has been seeded (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env.local via
// `npm run seed:admin`).
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@navlastnikuzi.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";

async function login(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill(password);
  await page.getByRole("button", { name: "Přihlásit se" }).click();
}

test("unauthenticated visit to / is redirected to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Přihlášení" })).toBeVisible();
});

test("wrong credentials show a Czech error", async ({ page }) => {
  await login(page, ADMIN_EMAIL, "definitely-wrong");
  await expect(page.getByText("Nesprávný e-mail nebo heslo.")).toBeVisible();
});

test("admin can log in and reach the users page", async ({ page }) => {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(ADMIN_EMAIL)).toBeVisible();

  await page.getByRole("link", { name: "Uživatelé" }).click();
  await expect(page).toHaveURL(/\/uzivatele$/);
  await expect(page.getByRole("heading", { name: "Uživatelé" })).toBeVisible();
});

test("admin creates an organizer; the organizer can log in but cannot open /uzivatele", async ({
  page,
}) => {
  const orgEmail = `org-${Date.now()}@navlastnikuzi.local`;
  const orgPassword = "organizer123";

  // Admin creates an organizer via the UI.
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.getByRole("link", { name: "Uživatelé" }).click();
  await page.getByLabel("E-mail").fill(orgEmail);
  await page.getByLabel("Heslo (min. 8 znaků)").fill(orgPassword);
  await page.getByRole("button", { name: "Vytvořit uživatele" }).click();
  await expect(page.getByText("Uživatel byl vytvořen.")).toBeVisible();
  await expect(page.getByText(orgEmail)).toBeVisible();

  // Sign out.
  await page.getByRole("link", { name: "Zpět" }).click();
  await page.getByRole("button", { name: "Odhlásit se" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // The organizer can log in...
  await login(page, orgEmail, orgPassword);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(orgEmail)).toBeVisible();
  // ...but has no admin link...
  await expect(page.getByRole("link", { name: "Uživatelé" })).toHaveCount(0);
  // ...and is redirected away from /uzivatele.
  await page.goto("/uzivatele");
  await expect(page).toHaveURL(/\/$/);
});
