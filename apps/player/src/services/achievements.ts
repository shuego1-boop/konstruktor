import type { QuizSession } from "@konstruktor/shared";

export type Achievement = {
  id: string;
  emoji: string;
  title: string;
  description: string;
};

export const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_quiz",
    emoji: "🌟",
    title: "Первый квиз",
    description: "Прошёл первый квиз",
  },
  {
    id: "streak_5",
    emoji: "⚡",
    title: "Пять подряд",
    description: "5 правильных ответов подряд",
  },
  {
    id: "perfect",
    emoji: "🏆",
    title: "Идеальный счёт",
    description: "Все вопросы правильно",
  },
  {
    id: "quiz_10",
    emoji: "🎓",
    title: "Ветеран",
    description: "Прошёл 10 квизов",
  },
  {
    id: "speed_demon",
    emoji: "🚀",
    title: "Молния",
    description: "Средний ответ быстрее 5 секунд",
  },
  {
    id: "pass",
    emoji: "✅",
    title: "Сдал!",
    description: "Прошёл квиз с нужным баллом",
  },
];

const STORAGE_KEY = "konstruktor_achievements";

function loadUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveUnlocked(ids: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

/**
 * Evaluates the session, unlocks new achievements, and returns the
 * newly-unlocked ones (so the UI can celebrate them).
 */
export function processAchievements(
  session: QuizSession,
  totalSessionsCount: number,
): Achievement[] {
  const unlocked = loadUnlocked();
  const newlyUnlocked: Achievement[] = [];

  function unlock(id: string) {
    if (!unlocked.has(id)) {
      unlocked.add(id);
      const a = ALL_ACHIEVEMENTS.find((a) => a.id === id);
      if (a) newlyUnlocked.push(a);
    }
  }

  // First quiz ever
  if (totalSessionsCount >= 1) unlock("first_quiz");

  // 10 quizzes
  if (totalSessionsCount >= 10) unlock("quiz_10");

  // Perfect score
  if (session.answers.length > 0 && session.answers.every((a) => a.isCorrect)) {
    unlock("perfect");
  }

  // Streak ≥ 5
  if (session.streakData.maxStreak >= 5) unlock("streak_5");

  // Speed demon: avg response < 5000ms
  if (session.answers.length > 0) {
    const avg =
      session.answers.reduce((s, a) => s + a.responseTimeMs, 0) /
      session.answers.length;
    if (avg < 5000) unlock("speed_demon");
  }

  // Passed
  if (session.isPassed) unlock("pass");

  saveUnlocked(unlocked);
  return newlyUnlocked;
}

export function getUnlockedAchievements(): Achievement[] {
  const ids = loadUnlocked();
  return ALL_ACHIEVEMENTS.filter((a) => ids.has(a.id));
}
