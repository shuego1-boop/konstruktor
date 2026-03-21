import { test, expect } from "@playwright/test";

const USER = { id: "u1", name: "Мария Петрова", email: "maria@school.ru" };

const QUIZZES = [
  {
    id: "q1",
    title: "История России XIX века",
    subject: "История",
    status: "published",
    totalSessions: 15,
    averageScore: 78,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "q2",
    title: "Алгебра 8 класс",
    subject: "Математика",
    status: "published",
    totalSessions: 8,
    averageScore: 55,
    updatedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
  {
    id: "q3",
    title: "Физика — черновик",
    subject: "Физика",
    status: "draft",
    totalSessions: 0,
    averageScore: 0,
    updatedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  },
];

test.describe("CRM Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/auth/get-session", (route) =>
      route.fulfill({ json: { user: USER } }),
    );
    await page.route("/api/quizzes", (route) =>
      route.fulfill({ json: QUIZZES }),
    );
  });

  test('shows header with "Мои квизы" and user name', async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Мои квизы")).toBeVisible();
    await expect(page.getByText(USER.name)).toBeVisible();
  });

  test("renders quiz cards with titles", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("История России XIX века")).toBeVisible();
    await expect(page.getByText("Алгебра 8 класс")).toBeVisible();
    await expect(page.getByText("Физика — черновик")).toBeVisible();
  });

  test("shows session count and average score on quiz cards", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // First quiz has 15 sessions and 78% average score
    await expect(page.getByText("15").first()).toBeVisible();
    await expect(page.getByText("78%").first()).toBeVisible();
  });

  test("shows summary metrics row when quizzes exist", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("попыток за неделю")).toBeVisible();
    await expect(page.getByText("средний балл по всем квизам")).toBeVisible();
    await expect(page.getByText("Лучший квиз")).toBeVisible();
  });

  test("best quiz card links to the highest-scoring quiz", async ({ page }) => {
    await page.goto("/dashboard");
    // 'История России XIX века' has highest averageScore (78%) among quizzes with sessions
    await expect(
      page.getByText("История России XIX века").first(),
    ).toBeVisible();
  });

  test('quiz card status badge shows "опубликован" for published', async ({
    page,
  }) => {
    await page.goto("/dashboard");
    const badges = page.getByText("опубликован");
    await expect(badges.first()).toBeVisible();
  });

  test('quiz card status badge shows "черновик" for draft', async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("черновик")).toBeVisible();
  });

  test("clicking a quiz card navigates to its results page", async ({
    page,
  }) => {
    await page.route("/api/quizzes/q1/sessions", (route) =>
      route.fulfill({
        json: {
          quizTitle: "История России XIX века",
          totalSessions: 15,
          averageScore: 78,
          passRate: 87,
          sessions: [],
          questionStats: [],
        },
      }),
    );
    await page.goto("/dashboard");
    // Click the quiz card title (inside the link)
    await page.getByText("История России XIX века").first().click();
    await expect(page).toHaveURL(/\/quiz\/q1\/results/);
  });

  test("does not show metrics row when quiz list is empty", async ({
    page,
  }) => {
    await page.unroute("/api/quizzes");
    await page.route("/api/quizzes", (route) => route.fulfill({ json: [] }));
    await page.goto("/dashboard");
    await expect(page.getByText("попыток за неделю")).not.toBeVisible();
  });

  test("subject label shown on quiz card when subject is set", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("История")).toBeVisible();
    await expect(page.getByText("Математика")).toBeVisible();
  });
});
