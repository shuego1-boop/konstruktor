import Joyride, {
  ACTIONS,
  type CallBackProps,
  STATUS,
  type Step,
  type Styles,
} from "react-joyride";
import { useTour } from "../context/TourContext.tsx";
import { useNavigate } from "react-router";
import { invoke } from "@tauri-apps/api/core";

const STEPS: Step[] = [
  {
    target: '[data-tour="header-title"]',
    title: "👋 Добро пожаловать в КвизОК!",
    content:
      "Это главный экран — здесь хранятся все ваши квизы. Проведём короткий тур, чтобы вы освоились.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tour="new-quiz"]',
    title: "➕ Создать квиз",
    content:
      "Нажмите эту кнопку, чтобы создать новый квиз с нуля. Система сразу откроет редактор.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tour="quiz-card"]',
    title: "📋 Карточка квиза",
    content:
      "Каждый квиз отображается в виде карточки. Нажмите на неё, чтобы открыть редактор и изменить вопросы.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="preview-btn"]',
    title: "▶ Превью",
    content:
      "Проверьте квиз глазами ученика — полноэкранный режим с таймером, вариантами ответов и подсчётом баллов.",
    placement: "top",
    disableBeacon: true,
  },
  {
    target: '[data-tour="export-btn"]',
    title: "📦 Экспорт",
    content:
      "Сохраните квиз в файл .pack — его можно перенести на другие устройства или загрузить в Player для учеников.",
    placement: "top",
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-settings"]',
    title: "⚙️ Настройки",
    content:
      "Здесь настраивается облачная синхронизация и ключ для AI-генерации фонов.",
    placement: "right",
    disableBeacon: true,
  },
];

// Custom tooltip styled to match the app design
function TourTooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
}: {
  continuous: boolean;
  index: number;
  step: Step;
  backProps: React.HTMLAttributes<HTMLButtonElement>;
  closeProps: React.HTMLAttributes<HTMLButtonElement>;
  primaryProps: React.HTMLAttributes<HTMLButtonElement>;
  tooltipProps: React.HTMLAttributes<HTMLDivElement>;
  isLastStep: boolean;
}) {
  return (
    <div
      {...tooltipProps}
      style={{
        background: "linear-gradient(145deg, #1e1b4b, #312e81)",
        border: "1px solid rgba(129,140,248,0.4)",
        borderRadius: "16px",
        padding: "24px",
        maxWidth: "340px",
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(129,140,248,0.2)",
        color: "#fff",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Step counter */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "#a5b4fc",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Шаг {index + 1} из {STEPS.length}
        </span>
        <button
          {...closeProps}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "8px",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            padding: "4px 8px",
            fontSize: "0.75rem",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: "3px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "2px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: "2px",
            width: `${((index + 1) / STEPS.length) * 100}%`,
            background: "linear-gradient(90deg, #818cf8, #c084fc)",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Title */}
      {step.title && (
        <h3
          style={{
            margin: "0 0 10px",
            fontSize: "1.05rem",
            fontWeight: 800,
            lineHeight: 1.3,
          }}
        >
          {step.title as string}
        </h3>
      )}

      {/* Content */}
      <p
        style={{
          margin: "0 0 20px",
          fontSize: "0.9rem",
          lineHeight: 1.6,
          color: "rgba(255,255,255,0.82)",
        }}
      >
        {step.content as string}
      </p>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        {index > 0 && (
          <button
            {...backProps}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "10px",
              color: "rgba(255,255,255,0.75)",
              cursor: "pointer",
              padding: "8px 16px",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            ← Назад
          </button>
        )}
        {continuous ? (
          <button
            {...primaryProps}
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              cursor: "pointer",
              padding: "8px 20px",
              fontSize: "0.85rem",
              fontWeight: 700,
              boxShadow: "0 4px 16px rgba(99,102,241,0.45)",
            }}
          >
            {isLastStep ? "� Создать учебный квиз" : "Далее →"}
          </button>
        ) : (
          <button
            {...closeProps}
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              cursor: "pointer",
              padding: "8px 20px",
              fontSize: "0.85rem",
              fontWeight: 700,
            }}
          >
            Понятно!
          </button>
        )}
      </div>
    </div>
  );
}

const joyrideStyles: Partial<Styles> = {
  options: {
    arrowColor: "#1e1b4b",
    overlayColor: "rgba(0,0,0,0.72)",
    spotlightShadow:
      "0 0 0 4px rgba(129,140,248,0.5), 0 0 40px rgba(129,140,248,0.25)",
    zIndex: 9999,
  },
};

export function AppTour() {
  const { run, stopTour } = useTour();
  const navigate = useNavigate();

  async function handleCallback(data: CallBackProps) {
    const { status, action, type } = data;
    const isFinished = [STATUS.FINISHED, STATUS.SKIPPED].includes(
      status as typeof STATUS.FINISHED,
    );
    if (isFinished || action === ACTIONS.CLOSE) {
      stopTour();
      // Навигация в редактор только при нажатии финальной кнопки (не при пропуске/закрытии)
      if (status === STATUS.FINISHED && action !== ACTIONS.CLOSE) {
        try {
          const newId = await invoke<string>("create_quiz");
          // Pre-populate with sample questions of all main types
          const o1a = crypto.randomUUID(),
            o1b = crypto.randomUUID();
          const o1c = crypto.randomUUID(),
            o1d = crypto.randomUUID();
          const o2a = crypto.randomUUID(),
            o2b = crypto.randomUUID();
          const o2c = crypto.randomUUID(),
            o2d = crypto.randomUUID();
          await invoke("update_quiz", {
            id: newId,
            data: {
              title: "Мой первый квиз",
              description: "Учебный квиз с примерами всех типов вопросов",
              questions: [
                {
                  id: crypto.randomUUID(),
                  type: "single_choice",
                  order: 0,
                  text: "Какая планета ближайшая к Солнцу?",
                  points: 100,
                  timeLimit: 30,
                  options: [
                    { id: o1a, text: "Венера" },
                    { id: o1b, text: "Меркурий" },
                    { id: o1c, text: "Земля" },
                    { id: o1d, text: "Марс" },
                  ],
                  correctOptionId: o1b,
                },
                {
                  id: crypto.randomUUID(),
                  type: "multiple_choice",
                  order: 1,
                  text: "Какие из этих чисел являются чётными?",
                  points: 150,
                  timeLimit: 30,
                  options: [
                    { id: o2a, text: "2" },
                    { id: o2b, text: "3" },
                    { id: o2c, text: "8" },
                    { id: o2d, text: "7" },
                  ],
                  correctOptionIds: [o2a, o2c],
                },
                {
                  id: crypto.randomUUID(),
                  type: "true_false",
                  order: 2,
                  text: "Вода кипит при температуре 100°C",
                  points: 100,
                  timeLimit: 20,
                  correctAnswer: true,
                },
                {
                  id: crypto.randomUUID(),
                  type: "text_input",
                  order: 3,
                  text: "Как называется столица России?",
                  points: 100,
                  timeLimit: 30,
                  correctAnswers: ["Москва", "москва", "Moscow", "moscow"],
                  caseSensitive: false,
                  fuzzyMatch: true,
                },
              ],
            },
          });
          localStorage.setItem("konstruktor_editor_tour", "1");
          navigate(`/editor/${newId}`);
        } catch {
          // не блокируем ошибку навигации
        }
      }
    }
    void type; // подавляем ESLint no-unused
  }

  return (
    <Joyride
      run={run}
      steps={STEPS}
      continuous
      showSkipButton
      scrollToFirstStep
      disableScrollParentFix
      spotlightPadding={6}
      callback={handleCallback}
      styles={joyrideStyles}
      tooltipComponent={TourTooltip}
      locale={{
        skip: "Пропустить тур",
      }}
    />
  );
}
