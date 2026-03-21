import { test, expect } from "@playwright/test";

// Seed Capacitor Preferences and the localStorage fallback so the app
// considers setup complete and renders the quiz home screen.
async function seedSetupDone(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    // Capacitor Preferences on the web stores items as "CapacitorStorage.{key}"
    localStorage.setItem("CapacitorStorage.deviceId", "test-device-id");
    localStorage.setItem("CapacitorStorage.deviceToken", "test-token");
    localStorage.setItem("CapacitorStorage.teacherCode", "ABC123");
    // Fallback used when Capacitor.Preferences throws in the browser
    localStorage.setItem("player_name", "Алексей");
  });
}

test.describe("Player Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await seedSetupDone(page);
    // Abort all API calls — we only care about the UI
    await page.route("http://localhost:3000/**", (route) => route.abort());
  });

  test('shows app title and "Выберите квиз для начала"', async ({ page }) => {
    await page.goto("/");
    // App should redirect to /home after detecting setup is done
    await expect(page).toHaveURL(/\/home/, { timeout: 8_000 });
    await expect(page.getByText("Konstruktor")).toBeVisible();
    await expect(page.getByText("Выберите квиз для начала")).toBeVisible();
  });

  test('shows "Мои квизы" section header', async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByText("Мои квизы")).toBeVisible();
  });

  test("shows empty state when no quiz packs are available", async ({
    page,
  }) => {
    await page.goto("/home");
    // Filesystem.readdir will fail in test environment → packs = []
    await expect(
      page.getByText("Нет квизов. Нажмите «Обновить», чтобы скачать."),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('shows "Обновить" button', async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByRole("button", { name: "Обновить" })).toBeVisible();
  });

  test('shows "Сменить учителя" link', async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByText("Сменить учителя")).toBeVisible();
  });

  test("Обновить button shows loading state while refreshing", async ({
    page,
  }) => {
    // Delay the sync response so we can observe "Обновление…" text
    await page.unroute("http://localhost:3000/**");
    await page.route("http://localhost:3000/**", async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.abort();
    });
    await page.goto("/home");
    await page.getByRole("button", { name: "Обновить" }).click();
    await expect(
      page.getByRole("button", { name: "Обновление…" }),
    ).toBeDisabled();
  });

  test("Обновить shows error message when code is missing", async ({
    page,
  }) => {
    // Remove teacherCode from Preferences so refresh can't find it
    await page.addInitScript(() => {
      localStorage.removeItem("CapacitorStorage.teacherCode");
    });
    await page.goto("/home");
    await page.getByRole("button", { name: "Обновить" }).click();
    await expect(page.getByText(/Код учителя не найден/i)).toBeVisible({
      timeout: 8_000,
    });
  });
});
