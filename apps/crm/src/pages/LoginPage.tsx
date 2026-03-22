import { useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

export function LoginPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/forget-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, redirectTo: "/reset-password" }),
        });
        if (!res.ok) {
          setError("Не удалось отправить ссылку. Проверьте email.");
          return;
        }
        setSuccess(
          "Ссылка для сброса пароля отправлена. Обратитесь к администратору.",
        );
        return;
      }

      const endpoint =
        mode === "login"
          ? "/api/auth/sign-in/email"
          : "/api/auth/sign-up/email";
      const body =
        mode === "login" ? { email, password } : { email, password, name };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          (data as { message?: string; error?: string }).message ??
          (data as { error?: string }).error ??
          (mode === "login" ? "Ошибка входа" : "Ошибка регистрации");
        setError(msg);
        return;
      }
      // Удаляем кэш сессии чтобы AuthGuard показал спиннер и перезапросил актуальные данные
      qc.removeQueries({ queryKey: ["auth-session"] });
      navigate("/dashboard");
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    setSuccess(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <img src="/logo.svg" alt="КвизОК" className="mx-auto mb-4 h-16 w-16" />
        <h1 className="mb-1 text-2xl font-bold text-slate-800 text-center">
          Квиз<span className="text-indigo-600">ОК</span>
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          {mode === "login"
            ? "Войдите в систему аналитики"
            : mode === "register"
              ? "Создайте аккаунт учителя"
              : "Введите email для сброса пароля"}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="name"
                className="text-sm font-medium text-slate-700"
              >
                Имя
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              className="text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          {mode !== "forgot" && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                Пароль
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={mode === "register" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              {mode === "register" && (
                <p className="text-xs text-slate-400 mt-1">
                  Минимум 8 символов
                </p>
              )}
            </div>
          )}
          {mode === "login" && (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setSuccess(null);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors self-end -mt-2"
            >
              Забыли пароль?
            </button>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              {success}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading
              ? mode === "forgot"
                ? "Отправка…"
                : mode === "login"
                  ? "Вход…"
                  : "Регистрация…"
              : mode === "forgot"
                ? "Отправить ссылку"
                : mode === "login"
                  ? "Войти"
                  : "Зарегистрироваться"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          {mode === "forgot" ? (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccess(null);
              }}
              className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              ← Вернуться к входу
            </button>
          ) : (
            <>
              {mode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
              <button
                type="button"
                onClick={switchMode}
                className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                {mode === "login" ? "Зарегистрироваться" : "Войти"}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
