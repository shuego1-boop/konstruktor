import { test, expect } from "@playwright/test";

const USER = { id: "u1", name: "Мария Петрова", email: "maria@school.ru" };

const QUIZ_STATS_WITH_SESSIONS = {
  quizTitle: "История России XIX века",
  totalSessions: 20,
  averageScore: 72,
  passRate: 80,
  sessions: [
    {
      id: "s1",
      playerName: "Алексей",
      score: 85,
      isPassed: true,
      earnedPoints: 17,
      totalPoints: 20,
      startedAt: new Date(Date.now() - 3_600_000).toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: "s2",
      playerName: "Мария",
      score: 45,
      isPassed: false,
      earnedPoints: 9,
      totalPoints: 20,
      startedAt: new Date(Date.now() - 7_200_000).toISOString(),
      completedAt: new Date(Date.now() - 3_600_000).toISOString(),
    },
  ],
  questionStats: [
    { questionId: "q-a", total: 20, correct: 18, avgTimeMs: 12000 },
    { questionId: "q-b", total: 20, correct: 6, avgTimeMs: 25000 },
    { questionId: "q-c", total: 20, correct: 12, avgTimeMs: 18000 },
  ],
};

const QUIZ_STATS_EMPTY = {
  quizTitle: "Алгебра 8 класс",
  totalSessions: 0,
  averageScore: 0,
  passRate: 0,
  sessions: [],
  questionStats: [],
};

test.describe("CRM Quiz Results", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/auth/get-session", (route) =>
      route.fulfill({ json: { user: USER } }),
    );
  });

  test("shows quiz title in header", async ({ page }) => {
    await page.route("/api/quizzes/quiz-1/sessions", (route) =>
      route.fulfill({ json: QUIZ_STATS_WITH_SESSIONS }),
    );
    await page.goto("/quiz/quiz-1/results");
    await expect(page.getByText("История России XIX века")).toBeVisible();
  });

  test("shows stats cards: Попыток, Ср. балл, Сдало", async ({ page }) => {
    await page.route("/api/quizzes/quiz-1/sessions", (route) =>
      route.fulfill({ json: QUIZ_STATS_WITH_SESSIONS }),
    );
    await page.goto("/quiz/quiz-1/results");
    await expect(page.getByText("Попыток")).toBeVisible();
    await expect(page.getByText("Ср. балл")).toBeVisible();
    await expect(page.getByText("Сдало")).toBeVisible();
    await expect(page.getByText("20").first()).toBeVisible();
    await expect(page.getByText("72%").first()).toBeVisible();
    await expect(page.getByText("80%").first()).toBeVisible();
  });

  test("shows AI-анализ section when sessions exist", async ({ page }) => {
    await page.route("/api/quizzes/quiz-1/sessions", (route) =>
      route.fulfill({ json: QUIZ_STATS_WITH_SESSIONS }),
    );
    await page.goto("/quiz/quiz-1/results");
    await expect(page.getByText("AI-анализ")).toBeVisible();
    // Shows session count badge
    await expect(page.getByText(/на основе 20 попыток/)).toBeVisible();
  });

  test("does not show AI-анализ section when no sessions", async ({ page }) => {
    await page.route("/api/quizzes/quiz-2/sessions", (route) =>
      route.fulfill({ json: QUIZ_STATS_EMPTY }),
    );
    await page.goto("/quiz/quiz-2/results");
    await expect(page.getByText("AI-анализ")).not.toBeVisible();
  });

  test("shows per-question accuracy chart when questionStats exist", async ({
    page,
  }) => {
    await page.route("/api/quizzes/quiz-1/sessions", (route) =>
      route.fulfill({ json: QUIZ_STATS_WITH_SESSIONS }),
    );
    await page.goto("/quiz/quiz-1/results");
    await expect(page.getByText("📊 Точность по вопросам")).toBeVisible();
    // Q1, Q2, Q3 labels from sorted question stats
    await expect(page.getByText("Q1")).toBeVisible();
    await expect(page.getByText("Q2")).toBeVisible();
    await expect(page.getByText("Q3")).toBeVisible();
  });

  test("hides per-question chart when questionStats is empty", async ({
    page,
  }) => {
    await page.route("/api/quizzes/quiz-2/sessions", (route) =>
      route.fulfill({ json: QUIZ_STATS_EMPTY }),
    );
    await page.goto("/quiz/quiz-2/results");
    await expect(page.getByText("📊 Точность по вопросам")).not.toBeVisible();
  });

  test("sessions table shows player names", async ({ page }) => {
    await page.route("/api/quizzes/quiz-1/sessions", (route) =>
      route.fulfill({ json: QUIZ_STATS_WITH_SESSIONS }),
    );
    await page.goto("/quiz/quiz-1/results");
    await expect(page.getByText("Алексей")).toBeVisible();
    await expect(page.getByText("Мария")).toBeVisible();
  });

  test("shows error state when API request fails", async ({ page }) => {
    await page.route("/api/quizzes/quiz-bad/sessions", (route) =>
      route.fulfill({ status: 404, json: { error: "Not found" } }),
    );
    await page.goto("/quiz/quiz-bad/results");
    await expect(page.getByText("Ошибка загрузки данных")).toBeVisible();
  });

  test("back button navigates to previous page", async ({ page }) => {
    await page.route("/api/quizzes", (route) => route.fulfill({ json: [] }));
    await page.route("/api/quizzes/quiz-1/sessions", (route) =>
      route.fulfill({ json: QUIZ_STATS_WITH_SESSIONS }),
    );
    // Navigate from dashboard to results
    await page.goto("/dashboard");
    await page.goto("/quiz/quiz-1/results");
    await page.getByText("← Назад").click();
    // Should navigate back
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
