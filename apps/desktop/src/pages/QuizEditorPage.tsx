import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  Quiz,
  Question,
  QuestionType,
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  TextInputQuestion,
  MatchingQuestion,
  OrderingQuestion,
  FillBlankQuestion,
  HotspotQuestion,
  Hotspot,
} from "@konstruktor/shared";
import { Button, Badge, Input, Spinner } from "@konstruktor/ui";
import { useToast } from "../context/ToastContext.tsx";
import Joyride, {
  ACTIONS,
  type CallBackProps,
  EVENTS,
  STATUS,
  type Step,
} from "react-joyride";

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "Один ответ",
  multiple_choice: "Несколько ответов",
  true_false: "Да / Нет",
  text_input: "Текстовый ответ",
  fill_blank: "Заполнить пропуск",
  matching: "Соответствие",
  ordering: "Порядок",
  hotspot: "Точка на картинке",
};

// ─── Answer Editor ──────────────────────────────────────────────────────────

type AnswerEditorProps = {
  question: Question;
  onUpdate: (partial: Partial<Question>) => void;
};

function AnswerEditor({ question, onUpdate }: AnswerEditorProps) {
  if (
    question.type === "single_choice" ||
    question.type === "multiple_choice"
  ) {
    const q = question as SingleChoiceQuestion | MultipleChoiceQuestion;
    const isMulti = question.type === "multiple_choice";
    const correctIds: string[] = isMulti
      ? (q as MultipleChoiceQuestion).correctOptionIds
      : [(q as SingleChoiceQuestion).correctOptionId].filter(Boolean);

    function addOption() {
      const newOption = { id: crypto.randomUUID(), text: "" };
      onUpdate({ options: [...q.options, newOption] } as Partial<Question>);
    }

    function updateOptionText(id: string, text: string) {
      onUpdate({
        options: q.options.map((o) => (o.id === id ? { ...o, text } : o)),
      } as Partial<Question>);
    }

    function deleteOption(id: string) {
      const options = q.options.filter((o) => o.id !== id);
      if (isMulti) {
        const correctOptionIds = (
          q as MultipleChoiceQuestion
        ).correctOptionIds.filter((c) => c !== id);
        onUpdate({ options, correctOptionIds } as Partial<Question>);
      } else {
        const correctOptionId =
          (q as SingleChoiceQuestion).correctOptionId === id
            ? ""
            : (q as SingleChoiceQuestion).correctOptionId;
        onUpdate({ options, correctOptionId } as Partial<Question>);
      }
    }

    function toggleCorrect(id: string) {
      if (isMulti) {
        const prev = (q as MultipleChoiceQuestion).correctOptionIds;
        const correctOptionIds = prev.includes(id)
          ? prev.filter((c) => c !== id)
          : [...prev, id];
        onUpdate({ correctOptionIds } as Partial<Question>);
      } else {
        onUpdate({ correctOptionId: id } as Partial<Question>);
      }
    }

    return (
      <div className="mt-6">
        <p className="text-sm font-medium text-slate-700 mb-3">
          Варианты ответов{" "}
          {isMulti ? "(отметьте все правильные)" : "(выберите один правильный)"}
        </p>
        <div className="flex flex-col gap-2">
          {q.options.map((opt) => {
            const isCorrect = correctIds.includes(opt.id);
            return (
              <div
                key={opt.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${isCorrect ? "border-green-400 bg-green-50" : "border-slate-200 bg-white"}`}
              >
                <button
                  type="button"
                  onClick={() => toggleCorrect(opt.id)}
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isCorrect ? "border-green-500 bg-green-500 text-white" : "border-slate-300 hover:border-green-400"}`}
                  aria-label={
                    isCorrect
                      ? "Отметить как неверный"
                      : "Отметить как правильный"
                  }
                  title={
                    isCorrect ? "Правильный ответ" : "Отметить как правильный"
                  }
                >
                  {isCorrect && <span className="text-xs">✓</span>}
                </button>
                <Input
                  value={opt.text}
                  onChange={(e) => updateOptionText(opt.id, e.target.value)}
                  placeholder="Текст варианта…"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => deleteOption(opt.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors p-1"
                  aria-label="Удалить вариант"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        <Button variant="ghost" size="sm" className="mt-3" onClick={addOption}>
          + Добавить вариант
        </Button>
      </div>
    );
  }

  if (question.type === "true_false") {
    const q = question as TrueFalseQuestion;
    return (
      <div className="mt-6">
        <p className="text-sm font-medium text-slate-700 mb-3">
          Правильный ответ
        </p>
        <div className="flex gap-4">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              type="button"
              onClick={() =>
                onUpdate({ correctAnswer: val } as Partial<Question>)
              }
              className={`flex-1 rounded-xl border-2 py-4 text-lg font-semibold transition-colors ${
                q.correctAnswer === val
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"
              }`}
            >
              {val ? "✓ Да" : "✗ Нет"}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === "text_input") {
    const q = question as TextInputQuestion;
    const [newAnswer, setNewAnswer] = useState("");

    function addAnswer() {
      const trimmed = newAnswer.trim();
      if (!trimmed || q.correctAnswers.includes(trimmed)) return;
      onUpdate({
        correctAnswers: [...q.correctAnswers, trimmed],
      } as Partial<Question>);
      setNewAnswer("");
    }

    function removeAnswer(ans: string) {
      onUpdate({
        correctAnswers: q.correctAnswers.filter((a) => a !== ans),
      } as Partial<Question>);
    }

    return (
      <div className="mt-6 flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">
            Принимаемые правильные ответы
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {q.correctAnswers.map((ans) => (
              <span
                key={ans}
                className="flex items-center gap-1 rounded-full bg-green-100 text-green-800 text-xs px-3 py-1"
              >
                {ans}
                <button
                  type="button"
                  onClick={() => removeAnswer(ans)}
                  className="ml-1 text-green-600 hover:text-red-500"
                >
                  ✕
                </button>
              </span>
            ))}
            {q.correctAnswers.length === 0 && (
              <span className="text-xs text-slate-400">Пока нет ответов</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAnswer();
                }
              }}
              placeholder="Добавить правильный ответ…"
              className="flex-1"
            />
            <Button variant="secondary" size="sm" onClick={addAnswer}>
              Добавить
            </Button>
          </div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={q.caseSensitive}
              onChange={(e) =>
                onUpdate({
                  caseSensitive: e.target.checked,
                } as Partial<Question>)
              }
            />
            Учитывать регистр
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={q.fuzzyMatch}
              onChange={(e) =>
                onUpdate({ fuzzyMatch: e.target.checked } as Partial<Question>)
              }
            />
            Неточное совпадение (опечатки)
          </label>
        </div>
      </div>
    );
  }

  // ── matching ────────────────────────────────────────────────────────────
  if (question.type === "matching") {
    const q = question as MatchingQuestion;
    function addPair() {
      onUpdate({
        pairs: [...q.pairs, { id: crypto.randomUUID(), left: "", right: "" }],
      } as Partial<Question>);
    }
    function updatePair(id: string, side: "left" | "right", value: string) {
      onUpdate({
        pairs: q.pairs.map((p) => (p.id === id ? { ...p, [side]: value } : p)),
      } as Partial<Question>);
    }
    function removePair(id: string) {
      onUpdate({
        pairs: q.pairs.filter((p) => p.id !== id),
      } as Partial<Question>);
    }
    return (
      <div className="mt-6 flex flex-col gap-3">
        <p className="text-sm font-medium text-slate-700">Пары соответствий</p>
        {q.pairs.map((pair) => (
          <div key={pair.id} className="flex items-center gap-2">
            <Input
              value={pair.left}
              onChange={(e) => updatePair(pair.id, "left", e.target.value)}
              placeholder="Левая часть…"
              className="flex-1"
            />
            <span className="text-slate-400">↔</span>
            <Input
              value={pair.right}
              onChange={(e) => updatePair(pair.id, "right", e.target.value)}
              placeholder="Правая часть…"
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => removePair(pair.id)}
              className="text-slate-300 hover:text-red-500 transition-colors p-1"
            >
              ✕
            </button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addPair}>
          + Добавить пару
        </Button>
      </div>
    );
  }

  // ── ordering ────────────────────────────────────────────────────────────
  if (question.type === "ordering") {
    const q = question as OrderingQuestion;
    // correctOrder is the authoritative order — items are displayed in that order
    const orderedItems =
      q.correctOrder.length === q.items.length
        ? q.correctOrder
            .map((id) => q.items.find((it) => it.id === id)!)
            .filter(Boolean)
        : [...q.items];
    function addItem() {
      const newItem = { id: crypto.randomUUID(), text: "" };
      const items = [...q.items, newItem];
      const correctOrder = [...q.correctOrder, newItem.id];
      onUpdate({ items, correctOrder } as Partial<Question>);
    }
    function updateItem(id: string, text: string) {
      onUpdate({
        items: q.items.map((it) => (it.id === id ? { ...it, text } : it)),
      } as Partial<Question>);
    }
    function removeItem(id: string) {
      const items = q.items.filter((it) => it.id !== id);
      const correctOrder = q.correctOrder.filter((oid) => oid !== id);
      onUpdate({ items, correctOrder } as Partial<Question>);
    }
    function moveItem(id: string, dir: -1 | 1) {
      const idx = q.correctOrder.indexOf(id);
      if (idx < 0) return;
      const newOrder = [...q.correctOrder];
      const swap = idx + dir;
      if (swap < 0 || swap >= newOrder.length) return;
      [newOrder[idx], newOrder[swap]] = [newOrder[swap]!, newOrder[idx]!];
      onUpdate({ correctOrder: newOrder } as Partial<Question>);
    }
    return (
      <div className="mt-6 flex flex-col gap-3">
        <p className="text-sm font-medium text-slate-700">
          Элементы в правильном порядке (сверху = первый)
        </p>
        {orderedItems.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2"
          >
            <span className="text-slate-400 text-xs font-bold w-5">
              {idx + 1}
            </span>
            <Input
              value={item.text}
              onChange={(e) => updateItem(item.id, e.target.value)}
              placeholder="Элемент…"
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => moveItem(item.id, -1)}
              disabled={idx === 0}
              className="text-slate-400 hover:text-slate-700 disabled:opacity-20 px-1"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveItem(item.id, 1)}
              disabled={idx === orderedItems.length - 1}
              className="text-slate-400 hover:text-slate-700 disabled:opacity-20 px-1"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="text-slate-300 hover:text-red-500 transition-colors p-1"
            >
              ✕
            </button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addItem}>
          + Добавить элемент
        </Button>
      </div>
    );
  }

  // ── fill_blank ──────────────────────────────────────────────────────────
  if (question.type === "fill_blank") {
    const q = question as FillBlankQuestion;
    const [newAns, setNewAns] = useState<Record<string, string>>({});
    function addBlank() {
      const id = crypto.randomUUID();
      const pos = q.blanks.length;
      onUpdate({
        blanks: [...q.blanks, { id, position: pos, correctAnswers: [] }],
      } as Partial<Question>);
    }
    function removeBlank(id: string) {
      onUpdate({
        blanks: q.blanks.filter((b) => b.id !== id),
      } as Partial<Question>);
    }
    function addAnswer(blankId: string) {
      const val = (newAns[blankId] ?? "").trim();
      if (!val) return;
      onUpdate({
        blanks: q.blanks.map((b) =>
          b.id === blankId
            ? { ...b, correctAnswers: [...b.correctAnswers, val] }
            : b,
        ),
      } as Partial<Question>);
      setNewAns((p) => ({ ...p, [blankId]: "" }));
    }
    function removeAnswer(blankId: string, ans: string) {
      onUpdate({
        blanks: q.blanks.map((b) =>
          b.id === blankId
            ? {
                ...b,
                correctAnswers: b.correctAnswers.filter((a) => a !== ans),
              }
            : b,
        ),
      } as Partial<Question>);
    }
    return (
      <div className="mt-6 flex flex-col gap-4">
        <p className="text-sm font-medium text-slate-700">
          Используйте{" "}
          <code className="bg-slate-100 px-1 rounded">{"{{id}}"}</code> в тексте
          вопроса для пропусков
        </p>
        {q.blanks.map((blank, idx) => (
          <div
            key={blank.id}
            className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Пропуск #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeBlank(blank.id)}
                className="text-slate-300 hover:text-red-500 text-xs"
              >
                ✕ Удалить
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {(blank.correctAnswers ?? []).map((ans) => (
                <span
                  key={ans}
                  className="flex items-center gap-1 rounded-full bg-green-100 text-green-800 text-xs px-2 py-0.5"
                >
                  {ans}
                  <button
                    type="button"
                    onClick={() => removeAnswer(blank.id, ans)}
                    className="ml-1 text-green-600 hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAns[blank.id] ?? ""}
                onChange={(e) =>
                  setNewAns((p) => ({ ...p, [blank.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAnswer(blank.id);
                  }
                }}
                placeholder="Правильный ответ…"
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addAnswer(blank.id)}
              >
                Добавить
              </Button>
            </div>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addBlank}>
          + Добавить пропуск
        </Button>
      </div>
    );
  }

  // ── hotspot ──────────────────────────────────────────────────────────────
  if (question.type === "hotspot") {
    const q = question as HotspotQuestion;

    async function handlePickFile() {
      const selected = await openFileDialog({
        multiple: false,
        filters: [
          { name: "Изображение", extensions: ["png", "jpg", "jpeg", "webp"] },
        ],
      });
      if (!selected) return;
      try {
        const dataUrl = await invoke<string>("read_image_as_data_url", {
          path: selected as string,
        });
        onUpdate({ imageUrl: dataUrl } as Partial<Question>);
      } catch (e: unknown) {
        console.error(e);
      }
    }

    function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
      const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
      const newSpot: Hotspot = {
        id: crypto.randomUUID(),
        x,
        y,
        radius: 5,
        label: `Точка ${q.hotspots.length + 1}`,
        isCorrect: true,
      };
      onUpdate({ hotspots: [...q.hotspots, newSpot] } as Partial<Question>);
    }

    function removeHotspot(id: string) {
      onUpdate({
        hotspots: q.hotspots.filter((h) => h.id !== id),
      } as Partial<Question>);
    }

    function updateHotspot(id: string, patch: Partial<Hotspot>) {
      onUpdate({
        hotspots: q.hotspots.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      } as Partial<Question>);
    }

    return (
      <div className="mt-6 flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-1">Изображение</p>
          <div className="flex gap-2">
            <Input
              value={
                q.imageUrl?.startsWith("data:")
                  ? "(локальный файл)"
                  : (q.imageUrl ?? "")
              }
              onChange={(e) =>
                onUpdate({ imageUrl: e.target.value } as Partial<Question>)
              }
              placeholder="https://example.com/image.png"
              readOnly={q.imageUrl?.startsWith("data:")}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              className="whitespace-nowrap"
              onClick={() => void handlePickFile()}
            >
              📁 Выбрать файл
            </Button>
          </div>
        </div>
        {q.imageUrl && (
          <>
            <p className="text-xs text-slate-500">
              Нажмите на изображение, чтобы добавить точку
            </p>
            <div
              style={{
                position: "relative",
                userSelect: "none",
                cursor: "crosshair",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid #e2e8f0",
              }}
              onClick={handleImageClick}
            >
              <img
                src={q.imageUrl}
                alt="hotspot"
                style={{
                  display: "block",
                  width: "100%",
                  pointerEvents: "none",
                }}
                draggable={false}
              />
              {q.hotspots.map((h) => (
                <div
                  key={h.id}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    left: `${h.x}%`,
                    top: `${h.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: `${h.radius * 2}%`,
                    aspectRatio: "1",
                    borderRadius: "50%",
                    border: `3px solid ${h.isCorrect ? "#22c55e" : "#ef4444"}`,
                    background: h.isCorrect
                      ? "rgba(34,197,94,0.2)"
                      : "rgba(239,68,68,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: h.isCorrect ? "#16a34a" : "#dc2626",
                    fontSize: "clamp(8px,1vw,11px)",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                >
                  {h.label}
                </div>
              ))}
            </div>
            {q.hotspots.length > 0 && (
              <div className="flex flex-col gap-2">
                {q.hotspots.map((h, idx) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <span className="text-slate-400 text-xs font-bold w-5">
                      {idx + 1}
                    </span>
                    <Input
                      value={h.label}
                      onChange={(e) =>
                        updateHotspot(h.id, { label: e.target.value })
                      }
                      placeholder="Метка…"
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={h.radius}
                      onChange={(e) =>
                        updateHotspot(h.id, { radius: Number(e.target.value) })
                      }
                      style={{
                        width: 52,
                        textAlign: "center",
                        border: "1px solid #e2e8f0",
                        borderRadius: 6,
                        padding: "4px 6px",
                        fontSize: "0.8rem",
                      }}
                      title="Радиус (%)"
                    />
                    <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={h.isCorrect}
                        onChange={(e) =>
                          updateHotspot(h.id, { isCorrect: e.target.checked })
                        }
                      />
                      Правильная
                    </label>
                    <button
                      type="button"
                      onClick={() => removeHotspot(h.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // should be unreachable
  return null;
}

type SortableItemProps = {
  question: Question;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

function SortableQuestionItem({
  question,
  index,
  isActive,
  onSelect,
  onDelete,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, scale: 0.95, y: -8, transition: { duration: 0.15 } }}
      className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
        isActive
          ? "bg-blue-50 border-blue-400"
          : "bg-white border-slate-200 hover:bg-slate-50"
      }`}
      onClick={onSelect}
      data-demo-question=""
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-slate-300 hover:text-slate-500 px-1 text-lg"
        onClick={(e) => e.stopPropagation()}
      >
        ☰
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 mb-0.5">Вопрос {index + 1}</p>
        <p className="text-sm font-medium truncate text-slate-700">
          {question.text || "Без названия"}
        </p>
        <Badge variant="neutral" className="mt-1">
          {QUESTION_TYPE_LABELS[question.type] ?? question.type}
        </Badge>
      </div>
      <button
        className="text-slate-300 hover:text-red-500 transition-colors p-1"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Удалить вопрос"
      >
        ✕
      </button>
    </motion.div>
  );
}

// ─── AI generation helpers ───────────────────────────────────────────────────

type AiQuestion =
  | {
      type: "single_choice";
      text: string;
      options: string[];
      correctOptionIndex: number;
    }
  | {
      type: "multiple_choice";
      text: string;
      options: string[];
      correctOptionIndices: number[];
    }
  | { type: "true_false"; text: string; correctAnswer: boolean }
  | { type: "text_input"; text: string; correctAnswers: string[] }
  | {
      type: "fill_blank";
      text: string;
      blanks: { position: number; acceptedAnswers: string[] }[];
    }
  | { type: "matching"; text: string; pairs: { left: string; right: string }[] }
  | { type: "ordering"; text: string; items: string[] };

function mapAiQuestion(
  aq: AiQuestion,
  order: number,
  points: number,
  timeLimit: number,
): Question {
  const base = {
    id: crypto.randomUUID(),
    order,
    text: aq.text,
    points,
    timeLimit,
  };
  switch (aq.type) {
    case "single_choice": {
      const options = aq.options.map((text) => ({
        id: crypto.randomUUID(),
        text,
      }));
      return {
        ...base,
        type: "single_choice",
        options,
        correctOptionId: options[aq.correctOptionIndex]?.id ?? "",
      } as unknown as Question;
    }
    case "multiple_choice": {
      const options = aq.options.map((text) => ({
        id: crypto.randomUUID(),
        text,
      }));
      return {
        ...base,
        type: "multiple_choice",
        options,
        correctOptionIds: aq.correctOptionIndices
          .map((i) => options[i]?.id ?? "")
          .filter(Boolean),
      } as unknown as Question;
    }
    case "true_false":
      return {
        ...base,
        type: "true_false",
        correctAnswer: aq.correctAnswer,
      } as unknown as Question;
    case "text_input":
      return {
        ...base,
        type: "text_input",
        correctAnswers: aq.correctAnswers,
        caseSensitive: false,
        fuzzyMatch: true,
      } as unknown as Question;
    case "fill_blank":
      return {
        ...base,
        type: "fill_blank",
        textWithBlanks: aq.text,
        blanks: aq.blanks.map((b) => ({
          id: crypto.randomUUID(),
          position: b.position,
          correctAnswers: b.acceptedAnswers ?? [],
        })),
      } as unknown as Question;
    case "matching":
      return {
        ...base,
        type: "matching",
        pairs: aq.pairs.map((p) => ({
          id: crypto.randomUUID(),
          left: p.left,
          right: p.right,
        })),
      } as unknown as Question;
    case "ordering": {
      const items = aq.items.map((text) => ({ id: crypto.randomUUID(), text }));
      return {
        ...base,
        type: "ordering",
        items,
        correctOrder: items.map((i) => i.id),
      } as unknown as Question;
    }
    default:
      throw new Error(`Неизвестный тип: ${(aq as { type: string }).type}`);
  }
}

export function QuizEditorPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [editorTourRun, setEditorTourRun] = useState(false);
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [splitViewOpen, setSplitViewOpen] = useState(false);
  const [bgTab, setBgTab] = useState<"color" | "upload" | "ai">("color");
  const [bgColor, setBgColor] = useState(() => "#f8fafc");
  const [bgUploading, setBgUploading] = useState(false);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [bgModalError, setBgModalError] = useState<string | null>(null);
  const [bgModalSuccess, setBgModalSuccess] = useState(false);
  const [editorBgDataUrl, setEditorBgDataUrl] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiGradeLevel, setAiGradeLevel] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiTypes, setAiTypes] = useState<QuestionType[]>([
    "single_choice",
    "multiple_choice",
    "true_false",
    "matching",
    "ordering",
  ]);
  const [aiMode, setAiMode] = useState<"append" | "replace">("append");
  const [aiLoading, setAiLoading] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Must be after all useState — flag is set once on first render if aiTopic is in URL
  const didInitAutoGenerate = useRef(false);

  const {
    data: quiz,
    isLoading,
    error: quizError,
  } = useQuery<Quiz>({
    queryKey: ["quiz", quizId],
    queryFn: () => invoke<Quiz>("get_quiz", { id: quizId }),
    enabled: !!quizId,
  });

  // Start tour once quiz data is loaded so all elements are rendered
  useEffect(() => {
    if (
      !isLoading &&
      quiz &&
      localStorage.getItem("konstruktor_editor_tour") === "1"
    ) {
      localStorage.removeItem("konstruktor_editor_tour");
      setEditorTourRun(true);
    }
  }, [isLoading, quiz]);

  const updateMutation = useMutation({
    mutationFn: (updated: Partial<Quiz>) =>
      invoke("update_quiz", { id: quizId, data: updated }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quiz", quizId] });
      showToast("Сохранено", "success");
    },
    onError: (e: unknown) =>
      showToast(e instanceof Error ? e.message : "Ошибка сохранения", "error"),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !quiz) return;
      const oldIndex = quiz.questions.findIndex((q) => q.id === active.id);
      const newIndex = quiz.questions.findIndex((q) => q.id === over.id);
      const reordered = arrayMove(quiz.questions, oldIndex, newIndex);
      updateMutation.mutate({ questions: reordered });
    },
    [quiz, updateMutation],
  );

  function addQuestion(type: QuestionType) {
    const typeDefaults: Partial<Record<QuestionType, object>> = {
      single_choice: { options: [], correctOptionId: "" },
      multiple_choice: { options: [], correctOptionIds: [] },
      true_false: { correctAnswer: true },
      text_input: { correctAnswers: [] },
      fill_blank: { blanks: [] },
      matching: { pairs: [] },
      ordering: { items: [], correctOrder: [] },
      hotspot: { hotspots: [] },
    };
    const newQ = {
      id: crypto.randomUUID(),
      type,
      order: quiz?.questions.length ?? 0,
      text: "",
      points: 100,
      timeLimit: quiz?.settings?.timePerQuestion ?? 30,
      ...(typeDefaults[type] ?? {}),
    } as unknown as Question;
    const questions = [...(quiz?.questions ?? []), newQ];
    updateMutation.mutate({ questions });
    setActiveQuestionIndex(questions.length - 1);
  }

  function deleteQuestion(index: number) {
    if (!quiz) return;
    const questions = quiz.questions.filter((_, i) => i !== index);
    updateMutation.mutate({ questions });
    setActiveQuestionIndex(Math.max(0, index - 1));
  }

  const activeQuestion = quiz?.questions[activeQuestionIndex];

  function buildBgPrompt(subject?: string | null, title?: string | null) {
    const map: Record<string, string> = {
      История:
        "epic historical Russian scene, golden hour, ancient fortress, dramatic sky",
      Математика:
        "abstract mathematics universe, glowing geometric fractals, neon equations in dark space",
      Биология:
        "lush rainforest, vibrant microscopic cell world, colorful nature ecosystem",
      Физика:
        "cosmic particle collision, electromagnetic fields, space nebula, lightning bolts",
      Химия:
        "colorful chemical reactions, glowing molecular structures, laboratory",
      География:
        "aerial view of mountains and oceans, dramatic landscape, world topography",
      Литература:
        "magical ancient library, glowing books, letters floating in warm golden light",
    };
    const base =
      map[subject ?? ""] ??
      "abstract knowledge and education, colorful inspiring atmosphere";
    return `Educational quiz background illustration: ${base}. Ultra high quality photorealistic, cinematic, dramatic lighting, vivid saturated colors. Absolutely no text, no letters, no words, no numbers, no UI elements. Widescreen 16:9.`;
  }

  async function handleUploadBg() {
    setBgModalError(null);
    setBgModalSuccess(false);
    const selected = await openFileDialog({
      multiple: false,
      filters: [
        { name: "Изображение", extensions: ["png", "jpg", "jpeg", "webp"] },
      ],
    });
    if (!selected) return;
    setBgUploading(true);
    try {
      const path = await invoke<string>("upload_background", {
        quizId,
        srcPath: selected as string,
      });
      await invoke("update_quiz", {
        id: quizId,
        data: { backgroundUrl: path },
      });
      qc.invalidateQueries({ queryKey: ["quiz", quizId] });
      setBgModalSuccess(true);
    } catch (e: unknown) {
      setBgModalError(e instanceof Error ? e.message : String(e));
    } finally {
      setBgUploading(false);
    }
  }

  async function handleGenerateBg() {
    setBgModalError(null);
    setBgModalSuccess(false);
    const apiKey = localStorage.getItem("konstruktor_ai_key") || "";
    if (!apiKey) {
      setBgModalError(
        "AI ключ не задан. Добавьте его в Настройках приложения.",
      );
      return;
    }
    setIsGeneratingBg(true);
    try {
      const prompt = buildBgPrompt(quiz?.subject, quiz?.title);
      const path = await invoke<string>("generate_background", {
        quizId,
        prompt,
        apiKey,
      });
      await invoke("update_quiz", {
        id: quizId,
        data: { backgroundUrl: path },
      });
      qc.invalidateQueries({ queryKey: ["quiz", quizId] });
      setBgModalSuccess(true);
    } catch (e: unknown) {
      setBgModalError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsGeneratingBg(false);
    }
  }

  async function handleGenerateWithAi() {
    setAiError(null);
    const apiKey = localStorage.getItem("konstruktor_ai_key") || "";
    if (!apiKey) {
      setAiError("AI ключ не задан. Добавьте его в Настройках приложения.");
      return;
    }
    if (!aiTopic.trim()) {
      setAiError("Введите тему");
      return;
    }
    if (aiTypes.length === 0) {
      setAiError("Выберите хотя бы один тип вопроса");
      return;
    }
    setAiLoading(true);
    try {
      const result = await invoke<string>("generate_quiz_questions", {
        topic: aiTopic.trim(),
        questionCount: aiCount,
        questionTypes: aiTypes,
        gradeLevel: aiGradeLevel.trim() || (quiz?.gradeLevel ?? ""),
        apiKey,
      });
      const parsed = JSON.parse(result) as { questions: AiQuestion[] };
      const defaultPoints = 100;
      const defaultTimeLimit = quiz?.settings?.timePerQuestion ?? 30;
      const baseOrder =
        aiMode === "replace" ? 0 : (quiz?.questions.length ?? 0);
      const newQs = parsed.questions.map((aq, i) =>
        mapAiQuestion(aq, baseOrder + i, defaultPoints, defaultTimeLimit),
      );
      const questions =
        aiMode === "replace" ? newQs : [...(quiz?.questions ?? []), ...newQs];
      updateMutation.mutate({ questions });
      setActiveQuestionIndex(questions.length - 1);
      setAiModalOpen(false);
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(false);
    }
  }

  // Auto-generate questions when navigated from Dashboard "Create with AI" flow
  useEffect(() => {
    if (!quiz) return;
    if (didInitAutoGenerate.current) return;
    const aiTopicParam = searchParams.get("aiTopic");
    if (!aiTopicParam) return;
    // Mark as handled so Strict Mode double-invoke doesn't fire twice
    didInitAutoGenerate.current = true;
    // Show preloader immediately
    setIsAutoGenerating(true);
    // Clear URL params
    const grade = searchParams.get("aiGrade") ?? "";
    const count = Number(searchParams.get("aiCount")) || 5;
    setSearchParams({}, { replace: true });

    // Immediately fill quiz metadata from the params the user entered
    // Parse subject/grade from topic string like "6 кл, Биология, Клетка"
    // or use the dedicated grade param
    const topicParts = aiTopicParam.split(",").map((s) => s.trim());
    // Heuristic: if first part looks like "N кл" — it's grade info, skip it
    const gradeFromTopic = topicParts[0]?.match(/^(\d+)\s*кл/i)?.[1];
    const resolvedGrade = grade || gradeFromTopic || "";
    // Subject = second part if first was grade-like, otherwise first part
    const subjectPart = gradeFromTopic ? topicParts[1] : topicParts[0];
    // Narrowest topic = last part (e.g. "Клетка" from "6 кл, Биология, Клетка")
    const narrowTopic = topicParts[topicParts.length - 1] ?? aiTopicParam;
    // Title = full topic string
    const resolvedTitle = aiTopicParam;
    const resolvedSubject = subjectPart ?? aiTopicParam;
    // Description: "Квиз по предмету «Биология» для 6 класса. Тема: Клетка."
    const resolvedDescription = [
      resolvedSubject && `Квиз по предмету «${resolvedSubject}»`,
      resolvedGrade && `для ${resolvedGrade} класса`,
      narrowTopic !== resolvedSubject && `Тема: ${narrowTopic}.`,
    ]
      .filter(Boolean)
      .join(" ");

    // Fire-and-forget metadata update — doesn't block question generation
    invoke("update_quiz", {
      id: quizId,
      data: {
        title: resolvedTitle,
        subject: resolvedSubject,
        description: resolvedDescription,
        ...(resolvedGrade ? { gradeLevel: resolvedGrade } : {}),
      },
    }).catch(() => {});
    const apiKey = localStorage.getItem("konstruktor_ai_key") || "";
    if (!apiKey) {
      showToast(
        "AI ключ не настроен — добавьте его в Настройки → ИИ генерация",
        "error",
      );
      setIsAutoGenerating(false);
      return;
    }
    // Kick off generation directly — no second modal
    setAiLoading(true);
    setAiError(null);
    invoke<string>("generate_quiz_questions", {
      topic: aiTopicParam,
      questionCount: count,
      questionTypes: [
        "single_choice",
        "multiple_choice",
        "true_false",
        "matching",
        "ordering",
      ],
      gradeLevel: resolvedGrade || (quiz.gradeLevel ?? ""),
      apiKey,
    })
      .then((result) => {
        const parsed = JSON.parse(result) as { questions: AiQuestion[] };
        const defaultPoints = 100;
        const defaultTimeLimit = quiz.settings?.timePerQuestion ?? 30;
        const newQs = parsed.questions.map((aq, i) =>
          mapAiQuestion(aq, i, defaultPoints, defaultTimeLimit),
        );
        updateMutation.mutate({ questions: newQs });
        setActiveQuestionIndex(0);
        showToast(`✨ ИИ создал ${newQs.length} вопросов`, "success");
      })
      .catch((e: unknown) => {
        showToast(
          e instanceof Error ? e.message : "Ошибка ИИ генерации",
          "error",
        );
      })
      .finally(() => {
        setAiLoading(false);
        setIsAutoGenerating(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz]);

  // Load background preview data URL whenever the quiz background changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!quiz) return;
    const bgUrl = (quiz as unknown as { backgroundUrl?: string }).backgroundUrl;
    if (!bgUrl) {
      setEditorBgDataUrl(null);
      return;
    }
    invoke<string>("get_background", { quizId })
      .then(setEditorBgDataUrl)
      .catch(() => setEditorBgDataUrl(null));
    // quiz object reference changes on every refetch, so we get fresh data automatically
  }, [quiz, quizId]);

  // Guard: if loading is done and quiz is still undefined, this quizId is invalid
  useEffect(() => {
    if (!isLoading && !quiz && !quizError)
      navigate("/dashboard", { replace: true });
  }, [isLoading, quiz, quizError, navigate]);

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );

  if (quizError)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-8">
        <p className="text-red-500 font-medium">Ошибка загрузки квиза</p>
        <pre className="text-sm text-red-400 bg-red-50 rounded p-3 max-w-lg w-full">
          {(quizError as Error).message}
        </pre>
        <button
          className="text-indigo-600 underline text-sm"
          onClick={() => navigate("/dashboard")}
        >
          ← На главную
        </button>
      </div>
    );

  if (!quiz)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );

  if (isAutoGenerating)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <span className="text-4xl">✨</span>
            </div>
            <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-300/60 animate-ping" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              ИИ создаёт квиз
            </h2>
            <p className="text-slate-500 text-sm">
              Генерирую вопросы, варианты ответов и объяснения…
            </p>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-indigo-400"
                style={{
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40% { transform: translateY(-8px); opacity: 1; }
          }
        `}</style>
      </div>
    );

  const EDITOR_STEPS: Step[] = [
    {
      target: '[data-tour="editor-settings"]',
      title: "⚙️ Шаг 1 из 8: Настройки квиза",
      content:
        "Мы уже назвали квиз «Мой первый квиз». Здесь задаётся название, описание, таймер на вопрос и жизни.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: '[data-tour="editor-questions"]',
      title: "📋 Шаг 2 из 8: Список вопросов",
      content:
        "Мы добавили 4 вопроса — по одному на каждый основной тип. Порядок меняется перетаскиванием мышью.",
      placement: "right",
      disableBeacon: true,
    },
    {
      target: '[data-tour="editor-main"]',
      title: "1️⃣ Тип: Один верный ответ",
      content:
        "Классический тест: 4 варианта, один правильный. Нажмите кружок рядом с вариантом, чтобы отметить его правильным — он станет зелёным.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: '[data-tour="editor-main"]',
      title: "2️⃣ Тип: Несколько верных ответов",
      content:
        "Здесь сразу несколько вариантов могут быть правильными. Ученик выбирает все подходящие — баллы начисляются пропорционально.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: '[data-tour="editor-main"]',
      title: "3️⃣ Тип: Да / Нет",
      content:
        "Быстрый формат проверки факта. Ученик нажимает «Да» или «Нет». Один клик — ответ принят. Нажмите на кнопку ниже, чтобы выбрать правильный ответ.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: '[data-tour="editor-main"]',
      title: "4️⃣ Тип: Текстовый ответ",
      content:
        "Ученик вводит ответ с клавиатуры. Добавьте несколько вариантов написания — «Москва», «москва». Нечёткое совпадение поможет при опечатках.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: '[data-tour="editor-add-question"]',
      title: "➕ Шаг 7 из 8: Добавить вопрос",
      content:
        "Хотите добавить свой? Нажмите здесь — откроется меню с 8 типами: соответствие, порядок, горячие точки на картинке и другие.",
      placement: "top",
      disableBeacon: true,
    },
    {
      target: '[data-tour="editor-settings-actions"]',
      title: "🎉 Шаг 8 из 8: Готово!",
      content:
        "Нажмите «Превью квиза» — увидите его глазами ученика с таймером и анимациями. Или «Экспорт .pack» — сохраните файл и перенесите на планшет в Player.",
      placement: "left",
      disableBeacon: true,
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Joyride
        run={editorTourRun}
        steps={EDITOR_STEPS}
        continuous
        showSkipButton
        scrollToFirstStep
        spotlightPadding={6}
        callback={(d: CallBackProps) => {
          if (
            [STATUS.FINISHED, STATUS.SKIPPED].includes(
              d.status as typeof STATUS.FINISHED,
            ) ||
            d.action === ACTIONS.CLOSE
          ) {
            setEditorTourRun(false);
            return;
          }
          // Switch the visible question as the tour advances
          if (d.type === EVENTS.STEP_AFTER) {
            if (d.index === 1) setActiveQuestionIndex(0);
            if (d.index === 2) setActiveQuestionIndex(1);
            if (d.index === 3) setActiveQuestionIndex(2);
            if (d.index === 4) setActiveQuestionIndex(3);
          }
        }}
        styles={{
          options: {
            arrowColor: "#1e1b4b",
            overlayColor: "rgba(0,0,0,0.6)",
            spotlightShadow: "0 0 0 4px rgba(129,140,248,0.5)",
            zIndex: 9999,
          },
        }}
        locale={{
          skip: "Пропустить",
          last: "🎯 Начать создавать!",
          next: "Далее →",
          back: "← Назад",
        }}
      />
      {/* Left sidebar — question list */}
      <aside className="w-64 flex flex-col border-r border-slate-200 bg-white">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <button
            className="text-sm text-blue-600 hover:underline"
            data-tour="editor-back"
            onClick={() => navigate("/dashboard")}
          >
            ← Назад
          </button>
          <span className="text-xs text-slate-400">
            {quiz?.questions.length ?? 0} вопросов
          </span>
        </div>
        <div
          className="flex-1 overflow-y-auto p-3 flex flex-col gap-2"
          data-tour="editor-questions"
        >
          {quiz && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={quiz.questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <AnimatePresence initial={false}>
                  {quiz.questions.map((q, i) => (
                    <SortableQuestionItem
                      key={q.id}
                      question={q}
                      index={i}
                      isActive={i === activeQuestionIndex}
                      onSelect={() => setActiveQuestionIndex(i)}
                      onDelete={() => deleteQuestion(i)}
                    />
                  ))}
                </AnimatePresence>
              </SortableContext>
            </DndContext>
          )}
        </div>
        <div
          className="p-3 border-t border-slate-200"
          data-tour="editor-add-question"
        >
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:underline list-none">
              + Добавить вопрос ▾
            </summary>
            <div className="mt-2 flex flex-col gap-1">
              {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[])
                .filter((type) => type !== "fill_blank")
                .map((type) => (
                  <button
                    key={type}
                    data-demo-qtype={type}
                    className="text-left text-xs px-3 py-2 rounded hover:bg-slate-100 text-slate-700"
                    onClick={() => addQuestion(type)}
                  >
                    {QUESTION_TYPE_LABELS[type]}
                  </button>
                ))}
            </div>
          </details>
        </div>
        <div className="p-3 border-t border-slate-200">
          <button
            className="w-full text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg py-2 px-3 transition-colors text-left"
            onClick={() => {
              setAiTopic(quiz?.title ?? quiz?.subject ?? "");
              setAiGradeLevel(quiz?.gradeLevel ?? "");
              setAiModalOpen(true);
            }}
          >
            ✨ Создать с ИИ
          </button>
        </div>
      </aside>

      {/* Main area — question editor */}
      <main className="flex-1 p-8 overflow-y-auto" data-tour="editor-main">
        {!activeQuestion && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-24">
            <p className="text-lg">Вопросов пока нет.</p>
            <p className="text-sm mt-1">Добавьте вопрос из панели слева.</p>
          </div>
        )}
        {activeQuestion && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6 flex items-center gap-3">
              <Badge variant="info">
                {QUESTION_TYPE_LABELS[activeQuestion.type]}
              </Badge>
              <span className="text-sm text-slate-400">
                Q{activeQuestionIndex + 1}
              </span>
            </div>
            <Input
              label="Текст вопроса"
              value={activeQuestion.text}
              onChange={(e) => {
                const questions = quiz!.questions.map((q, i) =>
                  i === activeQuestionIndex
                    ? { ...q, text: e.target.value }
                    : q,
                );
                updateMutation.mutate({ questions });
              }}
              placeholder="Введите текст вопроса…"
            />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Input
                label="Баллы"
                type="number"
                value={String(activeQuestion.points)}
                onChange={(e) => {
                  const questions = quiz!.questions.map((q, i) =>
                    i === activeQuestionIndex
                      ? { ...q, points: Number(e.target.value) }
                      : q,
                  );
                  updateMutation.mutate({ questions });
                }}
              />
              <Input
                label="Время (сек)"
                type="number"
                value={String(activeQuestion.timeLimit)}
                onChange={(e) => {
                  const questions = quiz!.questions.map((q, i) =>
                    i === activeQuestionIndex
                      ? { ...q, timeLimit: Number(e.target.value) }
                      : q,
                  );
                  updateMutation.mutate({ questions });
                }}
              />
            </div>
            <AnswerEditor
              question={activeQuestion}
              onUpdate={(updated) => {
                const questions = quiz!.questions.map((q, i) =>
                  i === activeQuestionIndex
                    ? ({
                        ...q,
                        ...updated,
                      } as unknown as import("@konstruktor/shared").Question)
                    : q,
                );
                updateMutation.mutate({ questions });
              }}
            />{" "}
          </div>
        )}
      </main>

      {/* Right sidebar — quiz settings */}
      <aside
        className="w-72 border-l border-slate-200 bg-white p-5 overflow-y-auto"
        data-tour="editor-settings"
      >
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          Настройки квиза
        </h2>
        {quiz && (
          <div className="flex flex-col gap-4">
            <Input
              label="Название"
              value={quiz.title}
              onChange={(e) => updateMutation.mutate({ title: e.target.value })}
            />
            <Input
              label="Описание"
              value={quiz.description ?? ""}
              onChange={(e) =>
                updateMutation.mutate({ description: e.target.value })
              }
            />
            <Input
              label="Предмет"
              value={quiz.subject ?? ""}
              onChange={(e) =>
                updateMutation.mutate({ subject: e.target.value })
              }
              placeholder="История, Математика…"
            />
            <Input
              label="Класс"
              value={quiz.gradeLevel ?? ""}
              onChange={(e) =>
                updateMutation.mutate({ gradeLevel: e.target.value })
              }
              placeholder="5, 7, 10…"
            />
            <Input
              label="Время на вопрос (сек)"
              type="number"
              value={String(quiz.settings.timePerQuestion ?? 30)}
              onChange={(e) =>
                updateMutation.mutate({
                  settings: {
                    ...quiz.settings,
                    timePerQuestion: Number(e.target.value),
                  },
                })
              }
            />
            <Input
              label="Проходной балл (%)"
              type="number"
              value={String(quiz.settings.passingScore ?? "")}
              placeholder="Нет"
              onChange={(e) =>
                updateMutation.mutate({
                  settings: {
                    ...quiz.settings,
                    passingScore: e.target.value
                      ? Number(e.target.value)
                      : (undefined as unknown as number),
                  } as import("@konstruktor/shared").QuizSettings,
                })
              }
            />
            <div className="flex flex-col gap-2 pt-1">
              {(
                [
                  ["shuffleQuestions", "Перемешивать вопросы"],
                  ["shuffleAnswers", "Перемешивать ответы"],
                  ["showCorrectAnswer", "Показывать правильный ответ"],
                  ["streakMultiplier", "Множитель за серию"],
                ] as [keyof typeof quiz.settings, string][]
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={!!quiz.settings[key]}
                    onChange={(e) =>
                      updateMutation.mutate({
                        settings: { ...quiz.settings, [key]: e.target.checked },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  id="lives-toggle"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={quiz.settings.lives !== undefined}
                  onChange={(e) => {
                    const { lives: _prev, ...rest } = quiz.settings;
                    updateMutation.mutate({
                      settings: e.target.checked ? { ...rest, lives: 3 } : rest,
                    });
                  }}
                />
                Жизни
              </label>
            </div>
            {quiz.settings.lives !== undefined && (
              <Input
                label="Количество жизней"
                type="number"
                value={String(quiz.settings.lives)}
                onChange={(e) =>
                  updateMutation.mutate({
                    settings: {
                      ...quiz.settings,
                      lives: Number(e.target.value),
                    },
                  })
                }
              />
            )}
            <div
              className="pt-4 border-t border-slate-100 flex flex-col gap-2"
              data-tour="editor-settings-actions"
            >
              <Button
                variant="secondary"
                onClick={() => navigate(`/preview/${quizId}`)}
              >
                Превью квиза
              </Button>
            </div>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  🎨 Оформление
                </p>
                {(quiz as unknown as { backgroundUrl?: string })
                  .backgroundUrl && (
                  <button
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    onClick={async () => {
                      await invoke("update_quiz", {
                        id: quizId,
                        data: { backgroundUrl: null },
                      });
                      qc.invalidateQueries({ queryKey: ["quiz", quizId] });
                    }}
                  >
                    сбросить фон ×
                  </button>
                )}
              </div>
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-gradient-to-br from-indigo-400 to-violet-600">
                {editorBgDataUrl ? (
                  <img
                    src={editorBgDataUrl}
                    className="w-full h-full object-cover"
                    alt="Фон квиза"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs tracking-wide">
                    Нет фона
                  </div>
                )}
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setBgModalError(null);
                  setBgModalSuccess(false);
                  setBgModalOpen(true);
                }}
              >
                🎨 Изменить фон
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* ─── Background Modal ────────────────────────────────────────────── */}
      {bgModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setBgModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-[440px] max-w-[90vw] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">
                🎨 Фон квиза
              </h3>
              <button
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                onClick={() => setBgModalOpen(false)}
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              {(["color", "upload", "ai"] as const).map((tab) => {
                const labels = {
                  color: "🎨 Цвет",
                  upload: "📁 Загрузить",
                  ai: "✨ ИИ",
                };
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      setBgTab(tab);
                      setBgModalError(null);
                      setBgModalSuccess(false);
                    }}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${bgTab === tab ? "text-indigo-600 border-b-2 border-indigo-500" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="p-6 flex flex-col gap-4">
              {bgModalSuccess && (
                <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                  ✓ Фон успешно применён!
                </div>
              )}
              {bgModalError && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 break-words">
                  {bgModalError}
                </div>
              )}

              {bgTab === "color" && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-slate-600">
                    Выберите цвет фона. Он будет использоваться когда
                    изображение не задано.
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-12 w-20 rounded-lg border border-slate-200 cursor-pointer p-1"
                    />
                    <div
                      className="flex-1 rounded-xl h-12 border border-slate-200"
                      style={{ background: bgColor }}
                    />
                  </div>
                  <Button
                    variant="primary"
                    onClick={async () => {
                      await invoke("update_quiz", {
                        id: quizId,
                        data: {
                          theme: {
                            ...(quiz?.settings?.theme ?? {}),
                            backgroundColor: bgColor,
                          },
                        },
                      });
                      qc.invalidateQueries({ queryKey: ["quiz", quizId] });
                      setBgModalSuccess(true);
                    }}
                  >
                    Применить цвет
                  </Button>
                </div>
              )}

              {bgTab === "upload" && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-slate-600">
                    Загрузите изображение с компьютера. Поддерживаются PNG, JPG,
                    WEBP.
                  </p>
                  <Button
                    variant="primary"
                    loading={bgUploading}
                    onClick={handleUploadBg}
                  >
                    {bgUploading ? "Загрузка…" : "📁 Выбрать файл"}
                  </Button>
                </div>
              )}

              {bgTab === "ai" && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-slate-600">
                    ИИ сгенерирует уникальное изображение по теме квиза.
                    <br />
                    <span className="text-slate-400 text-xs">
                      Модель gpt-image-1-mini · ~2.3 ₽
                    </span>
                  </p>
                  {!localStorage.getItem("konstruktor_ai_key") && (
                    <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                      ⚠ AI ключ не задан. Добавьте его в Настройках приложения.
                    </div>
                  )}
                  <Button
                    variant="primary"
                    loading={isGeneratingBg}
                    onClick={handleGenerateBg}
                  >
                    {isGeneratingBg
                      ? "✨ Генерация (~30 сек)…"
                      : "✨ Сгенерировать фон"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── AI Generation Modal ─────────────────────────────────────────── */}
      {aiModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setAiModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-[480px] max-w-[90vw] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              ✨ Создать вопросы с ИИ
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Модель gpt-5-nano · aitunnel.ru
            </p>

            {aiError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                {aiError}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Тема
                </label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Великая Отечественная война, теорема Пифагора…"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Класс
                  </label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="5, 7, 11…"
                    value={aiGradeLevel}
                    onChange={(e) => setAiGradeLevel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Количество вопросов
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    value={aiCount}
                    onChange={(e) =>
                      setAiCount(
                        Math.max(1, Math.min(20, Number(e.target.value))),
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Типы вопросов
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    Object.entries(QUESTION_TYPE_LABELS) as [
                      QuestionType,
                      string,
                    ][]
                  )
                    .filter(
                      ([type]) =>
                        type !== "hotspot" &&
                        type !== "text_input" &&
                        type !== "fill_blank",
                    )
                    .map(([type, label]) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={aiTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked)
                              setAiTypes((prev) => [...prev, type]);
                            else
                              setAiTypes((prev) =>
                                prev.filter((t) => t !== type),
                              );
                          }}
                        />
                        {label}
                      </label>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Режим добавления
                </label>
                <div className="flex gap-4">
                  {(["append", "replace"] as const).map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="aiMode"
                        value={m}
                        checked={aiMode === m}
                        onChange={() => setAiMode(m)}
                      />
                      {m === "append"
                        ? "Добавить к существующим"
                        : "Заменить все вопросы"}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="primary"
                  loading={aiLoading}
                  onClick={handleGenerateWithAi}
                >
                  {aiLoading ? "Генерация…" : "✨ Сгенерировать"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setAiModalOpen(false)}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
