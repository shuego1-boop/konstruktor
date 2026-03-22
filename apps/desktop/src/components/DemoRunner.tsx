/**
 * DemoRunner — автоматический рекламный скрин-каст.
 *
 * Показывает фейковый курсор, который управляет приложением по заранее
 * написанному сценарию: создаёт два квиза (с ИИ и вручную), проходит
 * обучение, запускает превью.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { invoke } from "@tauri-apps/api/core";
import { useQueryClient } from "@tanstack/react-query";
import { useDemo } from "../context/DemoContext.tsx";
import { useToast } from "../context/ToastContext.tsx";

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function waitFor(selector: string, timeout = 10_000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) {
      resolve(el);
      return;
    }

    const observer = new MutationObserver(() => {
      const found = document.querySelector<HTMLElement>(selector);
      if (found) {
        observer.disconnect();
        resolve(found);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Demo: timeout waiting for "${selector}"`));
    }, timeout);
  });
}

/** Устанавливает значение в React-контролируемый input */
function reactSetValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

// ─── Данные квизов ───────────────────────────────────────────────────────────

function makeBioQuizData() {
  const uid = () => crypto.randomUUID();

  const q1opts = [uid(), uid(), uid(), uid()];
  const q3opts = [uid(), uid(), uid(), uid()];
  const q4opts = [uid(), uid(), uid(), uid()];
  const q6opts = [uid(), uid(), uid(), uid()];

  return {
    title: "Молекулярная биология, 11 кл",
    subject: "Биология",
    gradeLevel: "11",
    description:
      "Квиз по предмету «Биология» для 11 класса. Тема: Молекулярная биология, ДНК и синтез белка.",
    questions: [
      {
        id: uid(),
        type: "single_choice",
        order: 0,
        text: "Что является мономером молекулы ДНК?",
        points: 100,
        timeLimit: 25,
        options: [
          { id: q1opts[0], text: "Аминокислота" },
          { id: q1opts[1], text: "Нуклеотид" },
          { id: q1opts[2], text: "Глюкоза" },
          { id: q1opts[3], text: "Жирная кислота" },
        ],
        correctOptionId: q1opts[1],
        explanation:
          "ДНК — полинуклеотид, каждый мономер — нуклеотид (фосфат + дезоксирибоза + основание).",
      },
      {
        id: uid(),
        type: "true_false",
        order: 1,
        text: "ДНК состоит из двух антипараллельных цепей, скрученных в двойную спираль",
        points: 100,
        timeLimit: 20,
        correctAnswer: true,
        explanation:
          "Модель Уотсона и Крика, 1953 год: две антипараллельные цепочки связаны водородными связями.",
      },
      {
        id: uid(),
        type: "single_choice",
        order: 2,
        text: "Какой процесс обеспечивает синтез мРНК на матрице ДНК?",
        points: 100,
        timeLimit: 25,
        options: [
          { id: q3opts[0], text: "Репликация" },
          { id: q3opts[1], text: "Трансляция" },
          { id: q3opts[2], text: "Транскрипция" },
          { id: q3opts[3], text: "Трансдукция" },
        ],
        correctOptionId: q3opts[2],
        explanation:
          "Транскрипция — синтез РНК по матрице ДНК с участием РНК-полимеразы.",
      },
      {
        id: uid(),
        type: "single_choice",
        order: 3,
        text: "Сколько хромосом содержится в норме в соматической клетке человека?",
        points: 100,
        timeLimit: 20,
        options: [
          { id: q4opts[0], text: "23" },
          { id: q4opts[1], text: "46" },
          { id: q4opts[2], text: "48" },
          { id: q4opts[3], text: "44" },
        ],
        correctOptionId: q4opts[1],
        explanation:
          "46 хромосом (23 пары) — диплоидный набор соматических клеток человека.",
      },
      {
        id: uid(),
        type: "true_false",
        order: 4,
        text: "Митоз приводит к образованию четырёх гаплоидных дочерних клеток",
        points: 100,
        timeLimit: 20,
        correctAnswer: false,
        explanation:
          "Четыре гаплоидные клетки — продукт мейоза. Митоз даёт две диплоидные клетки.",
      },
      {
        id: uid(),
        type: "single_choice",
        order: 5,
        text: "Где в клетке осуществляется трансляция — синтез белка?",
        points: 100,
        timeLimit: 20,
        options: [
          { id: q6opts[0], text: "Ядро" },
          { id: q6opts[1], text: "Лизосомы" },
          { id: q6opts[2], text: "Рибосомы" },
          { id: q6opts[3], text: "Митохондрии" },
        ],
        correctOptionId: q6opts[2],
        explanation:
          "Трансляция происходит на рибосомах свободных или связанных с шероховатым ЭПР.",
      },
    ],
  };
}

// ─── Компонент курсора ────────────────────────────────────────────────────────

type CursorState = {
  x: number;
  y: number;
  visible: boolean;
  clicking: boolean;
};

function FakeCursor({
  x,
  y,
  clicking,
}: {
  x: number;
  y: number;
  clicking: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 999999,
        pointerEvents: "none",
        transition:
          "left 0.52s cubic-bezier(0.4,0,0.2,1), top 0.52s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease",
        transform: `translate(-2px, -2px) scale(${clicking ? 0.72 : 1})`,
        transformOrigin: "top left",
        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.55))",
      }}
    >
      {/* Standard arrow cursor SVG */}
      <svg width="26" height="30" viewBox="0 0 26 30" fill="none">
        <path
          d="M2 2L2 24L7 17.5L12 28L16 25.5L11 15L20 15L2 2Z"
          fill="white"
          stroke="#1e1b4b"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ─── AI Overlay ───────────────────────────────────────────────────────────────

function AiLoadingOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      {/* Ping ring */}
      <div style={{ position: "relative", width: 100, height: 100 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "rgba(99,102,241,0.2)",
            animation: "ping 1.4s cubic-bezier(0,0,0.2,1) infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "15%",
            borderRadius: "50%",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
          }}
        >
          ✨
        </div>
      </div>

      <p
        style={{
          color: "rgba(255,255,255,0.9)",
          fontSize: "1.1rem",
          fontWeight: 700,
        }}
      >
        ИИ генерирует вопросы…
      </p>

      {/* Dots */}
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#818cf8",
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

// ─── Заставка демо ────────────────────────────────────────────────────────────

function DemoSplashOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background:
          "linear-gradient(135deg, #1e1b4b 0%, #312e81 20%, #4338ca 45%, #7c3aed 70%, #6d28d9 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Noise grain */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          pointerEvents: "none",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "128px 128px",
        }}
      />
      {/* Ambient light */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(129,140,248,0.25) 0%, transparent 55%), radial-gradient(ellipse at 70% 75%, rgba(139,92,246,0.2) 0%, transparent 55%)",
        }}
      />
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(165,120,255,0.5) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "splashGlow 0.6s ease-out forwards",
        }}
      />
      {/* Icon */}
      <svg
        width="80"
        height="80"
        viewBox="168 67 44 45"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: "relative",
          filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.3))",
          animation:
            "splashLogo 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        }}
      >
        <rect
          x="171"
          y="70"
          width="38"
          height="39"
          rx="4"
          stroke="white"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M180 85 L185 90 L195 78"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <line
          x1="180"
          y1="97"
          x2="198"
          y2="97"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />
        <line
          x1="180"
          y1="103"
          x2="193"
          y2="103"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
      {/* App name */}
      <h1
        style={{
          position: "relative",
          color: "white",
          fontSize: "1.875rem",
          fontWeight: 700,
          margin: "20px 0 0",
          letterSpacing: "-0.02em",
          animation: "splashHeading 0.5s ease-out 0.2s forwards",
          opacity: 0,
        }}
      >
        КвизОК
      </h1>
      {/* Tagline */}
      <p
        style={{
          position: "relative",
          color: "rgba(255,255,255,0.7)",
          fontSize: "1rem",
          margin: "8px 0 0",
          fontWeight: 500,
          letterSpacing: "0.04em",
          animation: "splashTagline 0.5s ease-out 0.4s forwards",
          opacity: 0,
        }}
      >
        Квизы, которые запоминаются
      </p>
      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 3,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.5), rgba(255,255,255,0.1))",
          boxShadow: "0 0 12px rgba(255,255,255,0.35)",
          animation: "splashBar 2.2s ease-in-out forwards",
        }}
      />
      <style>{`
        @keyframes splashGlow {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes splashLogo {
          from { opacity: 0; transform: scale(0.3) rotate(-8deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes splashHeading {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashTagline {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 0.7; transform: translateY(0); }
        }
        @keyframes splashBar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export function DemoRunner() {
  const { isDemoRunning, demoAiOverlay, stopDemo, setDemoAiOverlay } =
    useDemo();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [cursor, setCursor] = useState<CursorState>({
    x: 200,
    y: 200,
    visible: false,
    clicking: false,
  });
  const [showDemoSplash, setShowDemoSplash] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Защита от двойного запуска в React Strict Mode
  const isScriptRunningRef = useRef(false);

  // ── Утилиты курсора ──────────────────────────────────────────────────

  async function moveCursor(x: number, y: number) {
    setCursor((c) => ({ ...c, x, y, visible: true }));
    await sleep(560); // ждём CSS transition
  }

  async function moveToEl(selector: string): Promise<HTMLElement> {
    const el = await waitFor(selector);
    const r = el.getBoundingClientRect();
    await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
    return el;
  }

  async function clickEl(selector: string) {
    const el = await moveToEl(selector);
    setCursor((c) => ({ ...c, clicking: true }));
    await sleep(110);
    el.click();
    await sleep(110);
    setCursor((c) => ({ ...c, clicking: false }));
    await sleep(380);
  }

  async function clickElByText(text: string): Promise<boolean> {
    const btn = Array.from(
      document.querySelectorAll<HTMLElement>("button"),
    ).find((b) => b.textContent?.trim() === text);
    if (!btn) return false;
    const r = btn.getBoundingClientRect();
    await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
    setCursor((c) => ({ ...c, clicking: true }));
    await sleep(110);
    btn.click();
    await sleep(110);
    setCursor((c) => ({ ...c, clicking: false }));
    await sleep(380);
    return true;
  }

  async function typeInto(selector: string, text: string, wpm = 240) {
    const el = (await moveToEl(selector)) as HTMLInputElement;
    el.focus();
    reactSetValue(el, "");
    await sleep(180);
    const charMs = Math.round(60_000 / (wpm * 5));
    let current = "";
    for (const char of text) {
      current += char;
      reactSetValue(el, current);
      await sleep(charMs + Math.random() * charMs * 0.4);
    }
    await sleep(280);
  }

  function pressEsc() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  }

  /** Triggers mouseenter/mouseover so CSS :hover children appear */
  function triggerHover(el: HTMLElement) {
    el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  }

  /** Throws if demo was aborted — call between phases */
  function checkAbort() {
    if (abortRef.current?.signal.aborted) {
      throw new Error("aborted");
    }
  }

  // ── Сценарий ─────────────────────────────────────────────────────────

  async function runScript() {
    // ── Фаза 0: Заставка ─────────────────────────────────────────────────
    setShowDemoSplash(true);
    setCursor((c) => ({ ...c, visible: false }));
    await sleep(2400);
    setShowDemoSplash(false);
    await sleep(350);

    checkAbort();

    // ── Подготовка: создаём квиз биологии (для демонстрации ИИ) ──────────
    const bioId = await invoke<string>("create_quiz");
    await invoke("update_quiz", { id: bioId, data: makeBioQuizData() });
    // Не инвалидируем сейчас — квиз появится после ИИ-оверлея

    // ── Фаза 1: Обзор дашборда ───────────────────────────────────────────
    navigate("/dashboard");
    await sleep(1000);
    setCursor((c) => ({
      ...c,
      visible: true,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    }));
    await sleep(400);

    // Заголовок
    await moveToEl('[data-tour="header-title"]');
    await sleep(500);

    // Навигация
    await moveToEl('[data-tour="nav-settings"]');
    await sleep(400);

    // Карточка квиза
    const firstCard = document.querySelector<HTMLElement>(
      '[data-tour="quiz-card"]',
    );
    if (firstCard) {
      triggerHover(firstCard);
      const r = firstCard.getBoundingClientRect();
      await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
      await sleep(600);
    }

    checkAbort();

    // ── Фаза 2: Генерация через ИИ (баннер на дашборде) ──────────────────
    await typeInto(
      '[data-demo="ai-banner-input"]',
      "11 кл, Биология, Молекулярная биология",
    );
    await sleep(400);

    // Наводим на кнопку «Придумать»
    await moveToEl('[data-demo="ai-banner-btn"]');
    await sleep(400);

    // Имитация клика (без реального вызова — показываем оверлей)
    setCursor((c) => ({ ...c, clicking: true }));
    await sleep(150);
    setCursor((c) => ({ ...c, clicking: false }));

    // ИИ «создаёт» квиз
    setDemoAiOverlay(true);
    await sleep(3500);
    setDemoAiOverlay(false);
    // Теперь показываем квиз в списке
    await queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    await sleep(500);

    checkAbort();

    // ── Фаза 3: Редактор (квиз биологии от ИИ) ──────────────────────────
    navigate(`/editor/${bioId}`);
    await waitFor('[data-tour="editor-questions"]');
    await sleep(900);

    // Пробегаемся по вопросам в сайдбаре
    const questionItems = document.querySelectorAll<HTMLElement>(
      '[data-tour="editor-questions"] [data-demo-question]',
    );
    const qItems = Array.from(questionItems).slice(0, 5);
    for (const item of qItems) {
      const r = item.getBoundingClientRect();
      await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
      setCursor((c) => ({ ...c, clicking: true }));
      await sleep(100);
      item.click();
      await sleep(100);
      setCursor((c) => ({ ...c, clicking: false }));
      await sleep(650);
    }

    // Смотрим на основную область и настройки
    await moveToEl('[data-tour="editor-main"]');
    await sleep(500);
    await moveToEl('[data-tour="editor-settings"]');
    await sleep(500);

    checkAbort();

    // ── Фаза 4: Прохождение квиза биологии (режим ученика) ───────────────
    // Возвращаемся на дашборд и кликаем кнопку превью на карточке
    await clickEl('[data-tour="editor-back"]');
    await waitFor('[data-tour="header-title"]');
    await queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    await sleep(800);

    // Находим карточку биологии, наводим, кликаем превью
    const bioCard = document.querySelector<HTMLElement>(
      `[data-demo-quiz-id="${bioId}"]`,
    );
    if (bioCard) {
      const r = bioCard.getBoundingClientRect();
      await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
      triggerHover(bioCard);
      await sleep(800);
      // Кликаем кнопку превью внутри карточки
      const previewBtn = bioCard.querySelector<HTMLElement>(
        '[data-demo="preview-btn"]',
      );
      if (previewBtn) {
        triggerHover(previewBtn);
        const rp = previewBtn.getBoundingClientRect();
        await moveCursor(rp.left + rp.width / 2, rp.top + rp.height / 2);
        await sleep(500);
        setCursor((c) => ({ ...c, clicking: true }));
        await sleep(110);
        previewBtn.click();
        await sleep(110);
        setCursor((c) => ({ ...c, clicking: false }));
        await sleep(400);
      } else {
        navigate(`/preview/${bioId}`);
      }
    } else {
      navigate(`/preview/${bioId}`);
    }

    await waitFor('[data-demo="start-quiz"]');
    await sleep(1200);

    await clickEl('[data-demo="start-quiz"]');
    await sleep(600);

    // Q1: Нуклеотид ✓
    await answerSingleChoice(1);
    await clickNextAfterFeedback();
    // Q2: ДНК спираль — Да ✓
    await answerTrueFalse(true);
    await clickNextAfterFeedback();
    // Q3: Транскрипция ✓
    await answerSingleChoice(2);
    await clickNextAfterFeedback();
    // Q4: 23 ✗ (для реализма)
    await answerSingleChoice(0);
    await clickNextAfterFeedback();
    // Q5: Митоз ≠ 4 гаплоидных — Нет ✓
    await answerTrueFalse(false);
    await clickNextAfterFeedback();
    // Q6: Рибосомы ✓
    await answerSingleChoice(2);
    await clickNextAfterFeedback();

    // Экран результатов
    await waitFor('[data-demo="results-screen"]').catch(() => null);
    await sleep(2000);

    checkAbort();

    // ── Фаза 5: Обратно на дашборд ──────────────────────────────────────
    navigate("/dashboard");
    await waitFor('[data-tour="header-title"]');
    await sleep(500);

    checkAbort();

    // ── Фаза 6: Галерея шаблонов ────────────────────────────────────────
    await clickEl('[data-demo="templates-btn"]');
    await sleep(800);

    const tplCards = document.querySelectorAll<HTMLElement>(
      '[data-demo="template-card"]',
    );
    const tplArr = Array.from(tplCards).slice(0, 5);
    for (const card of tplArr) {
      const r = card.getBoundingClientRect();
      await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
      await sleep(450);
    }
    await sleep(300);

    // Закрываем модал шаблонов кликом по оверлею
    const tplOverlay = document.querySelector<HTMLElement>(
      ".fixed.inset-0.z-50",
    );
    if (tplOverlay) {
      tplOverlay.click();
    } else {
      pressEsc();
    }
    await sleep(600);

    checkAbort();

    // ── Фаза 7: Ручное создание квиза ───────────────────────────────────
    // Наводим на кнопку «Пустой квиз» и кликаем — сразу открывает редактор
    await moveToEl('[data-tour="new-quiz"]');
    await sleep(400);
    await clickEl('[data-tour="new-quiz"]');
    await waitFor('[data-tour="editor-add-question"]');
    await sleep(900);

    // Q1: Один ответ
    await addQuestionType("single_choice");
    await sleep(300);
    await typeQuestionText("Чему равна производная функции f(x) = x²?");
    await sleep(300);
    await addOption("x");
    await addOption("3x²");
    await addOption("2x");
    await addOption("2x²");
    await sleep(200);
    await markOptionCorrect(2); // 2x
    await sleep(400);

    // Q2: Да / Нет
    await addQuestionType("true_false");
    await sleep(300);
    await typeQuestionText("Производная постоянной функции равна нулю");
    await sleep(600);

    // Q3: Один ответ
    await addQuestionType("single_choice");
    await sleep(300);
    await typeQuestionText("Какая функция является первообразной для cos(x)?");
    await sleep(300);
    await addOption("sin(x)");
    await addOption("-sin(x)");
    await addOption("cos(x)");
    await addOption("tg(x)");
    await sleep(200);
    await markOptionCorrect(0); // sin(x)
    await sleep(400);

    // Смотрим на настройки
    await moveToEl('[data-tour="editor-settings"]');
    await sleep(500);

    checkAbort();

    // Ждём автосохранение
    await sleep(2000);

    // Получаем ID квиза из URL
    const mathId = window.location.pathname.split("/").pop();

    // ── Фаза 8: Прохождение квиза математики (режим ученика) ─────────────
    if (mathId) {
      // Возвращаемся на дашборд
      await clickEl('[data-tour="editor-back"]');
      await waitFor('[data-tour="header-title"]');
      await queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      await sleep(800);

      // Находим карточку математики, наводим, кликаем превью
      const mathCard = document.querySelector<HTMLElement>(
        `[data-demo-quiz-id="${mathId}"]`,
      );
      if (mathCard) {
        const r = mathCard.getBoundingClientRect();
        await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
        triggerHover(mathCard);
        await sleep(800);
        const previewBtn = mathCard.querySelector<HTMLElement>(
          '[data-demo="preview-btn"]',
        );
        if (previewBtn) {
          triggerHover(previewBtn);
          const rp = previewBtn.getBoundingClientRect();
          await moveCursor(rp.left + rp.width / 2, rp.top + rp.height / 2);
          await sleep(500);
          setCursor((c) => ({ ...c, clicking: true }));
          await sleep(110);
          previewBtn.click();
          await sleep(110);
          setCursor((c) => ({ ...c, clicking: false }));
          await sleep(400);
        } else {
          navigate(`/preview/${mathId}`);
        }
      } else {
        navigate(`/preview/${mathId}`);
      }

      await waitFor('[data-demo="start-quiz"]');
      await sleep(1000);

      await clickEl('[data-demo="start-quiz"]');
      await sleep(600);

      // Q1: 2x ✓
      await answerSingleChoice(2);
      await clickNextAfterFeedback();
      // Q2: Да ✓
      await answerTrueFalse(true);
      await clickNextAfterFeedback();
      // Q3: sin(x) ✓
      await answerSingleChoice(0);
      await clickNextAfterFeedback();

      // Результаты
      await waitFor('[data-demo="results-screen"]').catch(() => null);
      await sleep(2000);
    }

    checkAbort();

    // ── Фаза 9: Настройки ────────────────────────────────────────────────
    navigate("/settings");
    await sleep(1000);
    const settingsContent =
      document.querySelector<HTMLElement>(".overflow-y-auto");
    if (settingsContent) {
      const r = settingsContent.getBoundingClientRect();
      await moveCursor(r.left + r.width / 2, r.top + r.height * 0.3);
      await sleep(700);
      await moveCursor(r.left + r.width / 2, r.top + r.height * 0.6);
      await sleep(700);
    }
    await sleep(400);

    checkAbort();

    // ── Финал ────────────────────────────────────────────────────────────
    navigate("/dashboard");
    await sleep(800);
    setCursor((c) => ({ ...c, visible: false }));
  }

  // ── Вспомогательные шаги ──────────────────────────────────────────────────

  async function addQuestionType(type: string) {
    // Открываем dropdown
    const summary = await waitFor('[data-tour="editor-add-question"] summary');
    const details = summary.closest("details")!;
    if (!details.hasAttribute("open")) {
      const r = summary.getBoundingClientRect();
      await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
      setCursor((c) => ({ ...c, clicking: true }));
      await sleep(100);
      summary.click();
      await sleep(100);
      setCursor((c) => ({ ...c, clicking: false }));
      await sleep(300);
    }
    await clickEl(`[data-demo-qtype="${type}"]`);
  }

  async function typeQuestionText(text: string) {
    // Input с label «Текст вопроса» рендерит id="текст-вопроса"
    const el = document.getElementById(
      "текст-вопроса",
    ) as HTMLInputElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
    el.focus();
    reactSetValue(el, "");
    await sleep(150);
    const charMs = 35;
    let current = "";
    for (const char of text) {
      current += char;
      reactSetValue(el, current);
      await sleep(charMs + Math.random() * 20);
    }
    await sleep(300);
  }

  async function addOption(text: string) {
    const added = await clickElByText("+ Добавить вариант");
    if (!added) return;
    await sleep(200);
    // Берём последний input варианта
    const inputs = document.querySelectorAll<HTMLInputElement>(
      'input[placeholder="Текст варианта…"]',
    );
    const last = inputs[inputs.length - 1];
    if (!last) return;
    const r = last.getBoundingClientRect();
    await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
    last.focus();
    reactSetValue(last, "");
    await sleep(100);
    const charMs = 35;
    let current = "";
    for (const char of text) {
      current += char;
      reactSetValue(last, current);
      await sleep(charMs + Math.random() * 15);
    }
    await sleep(200);
  }

  async function markOptionCorrect(index: number) {
    const btns = document.querySelectorAll<HTMLElement>(
      'button[aria-label="Отметить как правильный"]',
    );
    const btn = btns[index];
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
    setCursor((c) => ({ ...c, clicking: true }));
    await sleep(100);
    btn.click();
    await sleep(100);
    setCursor((c) => ({ ...c, clicking: false }));
    await sleep(300);
  }

  async function addMatchingPair(left: string, right: string) {
    const added = await clickElByText("+ Добавить пару");
    if (!added) return;
    await sleep(200);
    const leftInputs = document.querySelectorAll<HTMLInputElement>(
      'input[placeholder="Левая часть…"]',
    );
    const rightInputs = document.querySelectorAll<HTMLInputElement>(
      'input[placeholder="Правая часть…"]',
    );
    const leftEl = leftInputs[leftInputs.length - 1];
    const rightEl = rightInputs[rightInputs.length - 1];
    if (leftEl) {
      const r = leftEl.getBoundingClientRect();
      await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
      leftEl.focus();
      reactSetValue(leftEl, left);
      await sleep(200);
    }
    if (rightEl) {
      const r = rightEl.getBoundingClientRect();
      await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
      rightEl.focus();
      reactSetValue(rightEl, right);
      await sleep(200);
    }
    await sleep(150);
  }

  async function addOrderingItem(text: string) {
    const added = await clickElByText("+ Добавить элемент");
    if (!added) return;
    await sleep(200);
    const inputs = document.querySelectorAll<HTMLInputElement>(
      'input[placeholder="Элемент…"]',
    );
    const last = inputs[inputs.length - 1];
    if (!last) return;
    const r = last.getBoundingClientRect();
    await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
    last.focus();
    reactSetValue(last, text);
    await sleep(200);
  }

  async function answerSingleChoice(optIndex: number) {
    await sleep(1200); // зритель читает вопрос
    const bt = document.querySelector<HTMLElement>(
      `[data-demo-opt="${optIndex}"]`,
    );
    if (!bt) return;
    const r = bt.getBoundingClientRect();
    await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
    await sleep(400);
    setCursor((c) => ({ ...c, clicking: true }));
    await sleep(110);
    bt.click();
    await sleep(110);
    setCursor((c) => ({ ...c, clicking: false }));
    await sleep(300);
  }

  async function answerTrueFalse(value: boolean) {
    await sleep(1200);
    const sel = `[data-demo-tf="${value ? "true" : "false"}"]`;
    const bt = document.querySelector<HTMLElement>(sel);
    if (!bt) return;
    const r = bt.getBoundingClientRect();
    await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
    await sleep(400);
    setCursor((c) => ({ ...c, clicking: true }));
    await sleep(110);
    bt.click();
    await sleep(110);
    setCursor((c) => ({ ...c, clicking: false }));
    await sleep(300);
  }

  async function clickNextAfterFeedback() {
    await sleep(1800); // зритель читает фидбэк
    const btn = await waitFor('[data-demo="next-btn"]').catch(() => null);
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    await moveCursor(r.left + r.width / 2, r.top + r.height / 2);
    setCursor((c) => ({ ...c, clicking: true }));
    await sleep(110);
    btn.click();
    await sleep(110);
    setCursor((c) => ({ ...c, clicking: false }));
    await sleep(400);
  }

  // ── useEffect запуска ─────────────────────────────────────────────────────

  useEffect(() => {
    console.log(
      "[Demo] effect fired, isDemoRunning=",
      isDemoRunning,
      "running=",
      isScriptRunningRef.current,
    );

    if (!isDemoRunning) {
      isScriptRunningRef.current = false;
      abortRef.current?.abort();
      setCursor((c) => ({ ...c, visible: false }));
      setDemoAiOverlay(false);
      return;
    }

    // Защита от двойного запуска в React Strict Mode
    if (isScriptRunningRef.current) {
      console.log("[Demo] guard blocked (Strict Mode double-fire)");
      return;
    }
    isScriptRunningRef.current = true;

    // Показываем заставку и курсор — до любого async
    setShowDemoSplash(true);
    setCursor((c) => ({
      ...c,
      visible: false, // курсор скрыт во время заставки
    }));

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Небольшая пауза чтобы React успел отрисовать оверлей
    sleep(400)
      .then(() => runScript())
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[Demo] Ошибка сценария:", msg, e);
        if (msg !== "aborted") {
          showToast(`Демо: ${msg}`, "error");
        }
      })
      .finally(() => {
        console.log("[Demo] script finished, stopping demo");
        isScriptRunningRef.current = false;
        setDemoAiOverlay(false);
        setShowDemoSplash(false);
        setCursor((c) => ({ ...c, visible: false }));
        stopDemo();
      });

    return () => {
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoRunning]);

  // ── Рендер ────────────────────────────────────────────────────────────────

  return (
    <>
      {showDemoSplash && <DemoSplashOverlay />}
      {demoAiOverlay && <AiLoadingOverlay />}
      {cursor.visible && (
        <FakeCursor x={cursor.x} y={cursor.y} clicking={cursor.clicking} />
      )}
    </>
  );
}
