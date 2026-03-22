# Аудит демо-режима КвизОК — Готовность к скринкасту

**Дата:** 22 марта 2026  
**Цель:** Проверить демо-систему перед записью промо-видео  
**Общий вердикт:** 🟡 Работает, но требует доработок (6/10)

---

## 1. Архитектура демо-системы

### Компоненты

| Файл                                         | Роль                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `apps/desktop/src/context/DemoContext.tsx`   | React context: `isDemoRunning`, `demoAiOverlay`, `startDemo()`, `stopDemo()`                   |
| `apps/desktop/src/components/DemoRunner.tsx` | ~1000 строк — оркестратор демо: FakeCursor, AiLoadingOverlay, DemoSplashOverlay, `runScript()` |
| `apps/desktop/src/context/TourContext.tsx`   | React context для react-joyride: `run`, `startTour()`, `stopTour()`                            |
| `apps/desktop/src/components/AppTour.tsx`    | 6 шагов тура с кастомным tooltip (indigo gradient)                                             |

### Как запускается

- `App.tsx` → `<DemoProvider>` + `<DemoRunner />`
- `DemoRunner` слушает `isDemoRunning` через `useEffect`
- Когда `isDemoRunning === true` → запускает `runScript()`

---

## 2. Сценарий демо (9 фаз, ~80 секунд)

| Фаза  | Что происходит                                                   | Длительность |
| ----- | ---------------------------------------------------------------- | ------------ |
| 0     | Заставка КвизОК с логотипом и слоганом                           | ~2.4с        |
| 1     | Фоновое создание квиза биологии (6 вопросов, Tauri invoke)       | мгновенно    |
| 2     | Обзор дашборда: заголовок → настройки → тур → карточка → превью  | ~4с          |
| 3     | Модал «Новый квиз» → набор темы ИИ → оверлей «ИИ генерирует…»    | ~8с          |
| 4     | Редактор: 6 вопросов в сайдбаре, основная область, настройки     | ~8с          |
| 5     | Назад на дашборд                                                 | ~1с          |
| 6     | Модал → набор темы → ручное создание 4 вопросов по математике    | ~25с         |
| 7     | Назад на дашборд                                                 | ~1с          |
| 8     | Превью биологии: старт → 6 ответов (1 неправильный) → результаты | ~25с         |
| Финал | Возврат на дашборд, скрытие курсора                              | ~1с          |

### Типы вопросов в демо

**Биология (AI-created, 6Q):** 4× single_choice + 2× true_false  
**Математика (Manual, 4Q):** single_choice, true_false, multiple_choice, text_input

---

## 3. Покрытие фичей

### ✅ Показано

- Создание квиза с ИИ (набор темы + оверлей)
- Редактор квиза (просмотр вопросов, настройки)
- Ручное создание квиза (4 вопроса по шагам)
- 4 из 7 типов: single_choice, true_false, multiple_choice, text_input
- Превью (полный проход + обратная связь + результаты)
- Цветные карточки на дашборде

### ❌ НЕ показано

| Фича                                            | Важность   | Статус   |
| ----------------------------------------------- | ---------- | -------- |
| Галерея шаблонов (25 шт.)                       | 🔴 Высокая | TODO     |
| 3 типа вопросов: fill_blank, matching, ordering | 🟡 Средняя | TODO     |
| Страница настроек                               | 🟡 Средняя | TODO     |
| Экспорт .pack-файла                             | 🟡 Средняя | Отложено |
| Лидерборд                                       | 🟡 Средняя | Отложено |

---

## 4. Найденные проблемы

### 🔴 Критические

1. **Нет кнопки запуска демо** — `startDemo()` нигде не вызывается из UI → ИСПРАВЛЕНО
2. **«Konstruktor» в Tour** — `AppTour.tsx` строка 15: "Добро пожаловать в Konstruktor!" → ИСПРАВЛЕНО

### 🟡 Средние

3. **Нет abort signal check** — скрипт не проверяет отмену между фазами → ИСПРАВЛЕНО
4. **Hover-кнопки не видны** — FakeCursor не триггерит CSS :hover → ИСПРАВЛЕНО (JS mouseenter)
5. **Welcome modal** — "История России" не соответствует реальности → ИСПРАВЛЕНО
6. **Курсор резко появляется/исчезает** — нет анимации opacity → ИСПРАВЛЕНО

### 🟢 Низкие

7. Двойная заставка при старте (App + Demo) — работает, но 4с заставок подряд
8. React Strict Mode в dev — защита через `isScriptRunningRef` работает

---

## 5. Data-атрибуты

### data-tour (Tour + Demo используют)

| Атрибут                   | Компонент      | Элемент                   |
| ------------------------- | -------------- | ------------------------- |
| `header-title`            | DashboardPage  | Заголовок «Мои квизы»     |
| `tour-btn`                | DashboardPage  | Кнопка тура (колокольчик) |
| `new-quiz`                | DashboardPage  | Кнопка «+ Новый квиз»     |
| `quiz-card`               | DashboardPage  | Первая карточка квиза     |
| `preview-btn`             | DashboardPage  | ▶ Превью (hover)          |
| `export-btn`              | DashboardPage  | ☁ Экспорт (hover)         |
| `nav-settings`            | Sidebar        | ⚙️ Настройки              |
| `editor-back`             | QuizEditorPage | ← Назад                   |
| `editor-questions`        | QuizEditorPage | Список вопросов           |
| `editor-main`             | QuizEditorPage | Основная область          |
| `editor-settings`         | QuizEditorPage | Панель настроек           |
| `editor-settings-actions` | QuizEditorPage | Кнопки действий           |
| `editor-add-question`     | QuizEditorPage | «Добавить вопрос»         |

### data-demo (только Demo)

| Атрибут                  | Компонент      | Элемент                 |
| ------------------------ | -------------- | ----------------------- |
| `topic-input`            | DashboardPage  | Input темы в модале     |
| `ai-submit`              | DashboardPage  | Кнопка «Создать с ИИ»   |
| `manual-create`          | DashboardPage  | «Создать пустой квиз →» |
| `start-quiz`             | PreviewPage    | Кнопка СТАРТ            |
| `next-btn`               | PreviewPage    | Кнопка ДАЛЕЕ            |
| `results-screen`         | PreviewPage    | Экран результатов       |
| `data-demo-question`     | QuizEditorPage | Элементы вопросов       |
| `data-demo-qtype={type}` | QuizEditorPage | Кнопки типов            |
| `data-demo-opt={i}`      | PreviewPage    | Варианты ответа         |
| `data-demo-tf={key}`     | PreviewPage    | Кнопки Да/Нет           |

---

## 6. Тайминги анимаций

| Элемент           | Значение                            |
| ----------------- | ----------------------------------- |
| Cursor transition | 0.52с (cubic-bezier 0.4,0,0.2,1)    |
| Click effect      | 110мс down + 110мс up               |
| Typing speed      | 240 WPM (~50мс/символ ± 40% jitter) |
| AI overlay        | 3500мс                              |
| Question reading  | 1200мс                              |
| Feedback reading  | 1800мс                              |
| Results view      | 3000мс                              |
| Splash screen     | 2400мс                              |

---

## 7. Рекомендации для записи

1. Собрать production build (без Strict Mode)
2. Записывать в 1920×1080
3. Очистить localStorage перед записью
4. Закрыть лишние окна (focus shift = crash)
5. Убедиться что Tauri invoke работает (квиз создаётся)

---

## 8. План исправлений

- [x] Создать документ аудита
- [x] Добавить кнопку/хоткей запуска демо (Ctrl+Shift+D + кнопка в welcome modal)
- [x] Заменить «Konstruktor» → «КвизОК» в AppTour
- [x] Добавить abort signal check между фазами
- [x] Добавить JS hover trigger для кнопок карточек
- [x] Добавить фазу «Галерея шаблонов»
- [x] Добавить фазу «Настройки»
- [x] Добавить 3 недостающих типа вопросов (fill_blank, matching, ordering)
- [x] Плавное появление/исчезание курсора (opacity transition)
- [x] Исправить текст welcome modal («История России» → «Посмотрите готовый квиз глазами ученика»)
