import { test, expect } from "@playwright/test";

const AUTHENTICATED_USER = {
  id: "u1",
  name: "Иван Иванов",
  email: "ivan@school.ru",
};

test.describe("CRM Login", () => {
  test.beforeEach(async ({ page }) => {
    // Default: unauthenticated session
    await page.route("/api/auth/get-session", (route) =>
      route.fulfill({ json: { user: null } }),
    );
  });

  test("renders email, password fields and submit button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Konstruktor CRM")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Пароль")).toBeVisible();
    await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
  });

  test("shows error message on failed login", async ({ page }) => {
    await page.route("/api/auth/sign-in/email", (route) =>
      route.fulfill({
        status: 401,
        json: { error: "Неверный email или пароль" },
      }),
    );
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Пароль").fill("wrongpassword");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Неверный email или пароль",
    );
  });

  test("shows generic error when server returns no message", async ({
    page,
  }) => {
    await page.route("/api/auth/sign-in/email", (route) =>
      route.fulfill({ status: 500, json: {} }),
    );
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Пароль").fill("password123");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page.getByRole("alert")).toContainText("Ошибка входа");
  });

  test("shows network error when server is unreachable", async ({ page }) => {
    await page.route("/api/auth/sign-in/email", (route) =>
      route.abort("failed"),
    );
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Пароль").fill("password123");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page.getByRole("alert")).toContainText("Нет связи с сервером");
  });

  test("redirects to /dashboard on successful login", async ({ page }) => {
    let authenticated = false;
    // Override the default beforeEach route
    await page.unroute("/api/auth/get-session");
    await page.route("/api/auth/get-session", (route) =>
      route.fulfill({
        json: authenticated ? { user: AUTHENTICATED_USER } : { user: null },
      }),
    );
    await page.route("/api/auth/sign-in/email", async (route) => {
      authenticated = true;
      await route.fulfill({ status: 200, json: {} });
    });
    await page.route("/api/quizzes", (route) => route.fulfill({ json: [] }));

    await page.goto("/login");
    await page.getByLabel("Email").fill("ivan@school.ru");
    await page.getByLabel("Пароль").fill("mypassword");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("unauthenticated root access redirects to /login", async ({ page }) => {
    await page.route("/api/quizzes", (route) => route.fulfill({ json: [] }));
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("submit button is disabled while loading", async ({ page }) => {
    // Delay the response so we can observe loading state
    await page.route("/api/auth/sign-in/email", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({ status: 200, json: {} });
    });
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Пароль").fill("password123");
    await page.getByRole("button", { name: "Войти" }).click();
    // Button should show loading text and be disabled
    await expect(page.getByRole("button", { name: "Вход…" })).toBeDisabled();
  });
});
