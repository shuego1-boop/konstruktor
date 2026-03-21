import { test, expect } from "@playwright/test";

// The Player app shows SetupPage when localStorage has no 'player_name' key
// (App.tsx falls back to localStorage when Capacitor.Preferences throws in web mode)

test.describe("Player Setup Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Clear all storage so setup is triggered
    await page.addInitScript(() => {
      localStorage.clear();
    });
    // Mock API calls so network issues don't affect UI tests
    await page.route("http://localhost:3000/**", (route) => route.abort());
  });

  test("shows name step on first launch", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Привет! 👋")).toBeVisible();
    await expect(page.getByText("Как тебя зовут?")).toBeVisible();
    await expect(page.getByPlaceholder("Имя ученика")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Продолжить/ }),
    ).toBeVisible();
  });

  test("Продолжить button advances to avatar step", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Продолжить/ }).click();
    await expect(page.getByText("Выбери аватар")).toBeVisible();
    await expect(
      page.getByText("Он будет виден на доске результатов"),
    ).toBeVisible();
  });

  test("name is carried over after filling it in", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Имя ученика").fill("Алексей");
    await page.getByRole("button", { name: /Продолжить/ }).click();
    // On avatar step — can go back and see name preserved
    await page.getByRole("button", { name: /← Назад/ }).click();
    await expect(page.getByPlaceholder("Имя ученика")).toHaveValue("Алексей");
  });

  test("Enter key in name field advances to avatar step", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Имя ученика").press("Enter");
    await expect(page.getByText("Выбери аватар")).toBeVisible();
  });

  test("avatar step shows 8 avatar buttons", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Продолжить/ }).click();
    const avatarButtons = page.getByRole("button", { name: /Аватар/ });
    await expect(avatarButtons).toHaveCount(8);
  });

  test("selecting an avatar highlights it with a checkmark", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Продолжить/ }).click();
    // Click the second avatar
    const avatarButtons = page.getByRole("button", { name: /Аватар/ });
    await avatarButtons.nth(1).click();
    // The selected avatar shows a ✓ indicator
    await expect(avatarButtons.nth(1).getByText("✓")).toBeVisible();
  });

  test("Готово button on avatar step advances to code step", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Продолжить/ }).click();
    await page.getByRole("button", { name: /Готово/ }).click();
    await expect(page.getByText("Код учителя")).toBeVisible();
    await expect(page.getByPlaceholder("ABC123")).toBeVisible();
  });

  test("code step back button returns to name step", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Продолжить/ }).click();
    await page.getByRole("button", { name: /Готово/ }).click();
    await page.getByRole("button", { name: /← Назад/ }).click();
    await expect(page.getByText("Привет! 👋")).toBeVisible();
  });

  test("Подключиться button is disabled for short code", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Продолжить/ }).click();
    await page.getByRole("button", { name: /Готово/ }).click();
    const connectBtn = page.getByRole("button", { name: "Подключиться" });
    // Code shorter than 3 characters → button disabled
    await expect(connectBtn).toBeDisabled();
    await page.getByPlaceholder("ABC123").fill("AB");
    await expect(connectBtn).toBeDisabled();
  });

  test("Подключиться button is enabled for a valid code", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Продолжить/ }).click();
    await page.getByRole("button", { name: /Готово/ }).click();
    await page.getByPlaceholder("ABC123").fill("ABC");
    await expect(
      page.getByRole("button", { name: "Подключиться" }),
    ).toBeEnabled();
  });

  test("code input is uppercased automatically", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Продолжить/ }).click();
    await page.getByRole("button", { name: /Готово/ }).click();
    await page.getByPlaceholder("ABC123").fill("abc123");
    await expect(page.getByPlaceholder("ABC123")).toHaveValue("ABC123");
  });

  test("shows error when connection fails", async ({ page }) => {
    // Allow the request but return an error
    await page.unroute("http://localhost:3000/**");
    await page.route("http://localhost:3000/devices/register", (route) =>
      route.fulfill({ status: 500, json: { error: "Сервер недоступен" } }),
    );
    await page.route("http://localhost:3000/quizzes/for-student**", (route) =>
      route.fulfill({ status: 500, json: { error: "Ошибка сервера" } }),
    );
    await page.goto("/");
    await page.getByRole("button", { name: /Продолжить/ }).click();
    await page.getByRole("button", { name: /Готово/ }).click();
    await page.getByPlaceholder("ABC123").fill("XYZ999");
    await page.getByRole("button", { name: "Подключиться" }).click();
    // Error state shown
    await expect(page.getByText(/ошибка|недоступен/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
