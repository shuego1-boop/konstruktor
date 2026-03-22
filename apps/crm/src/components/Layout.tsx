import { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth.ts";

type Me = {
  name: string;
  email: string;
  orgCode: string;
  apiToken: string | null;
};

export function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [copied, setCopied] = useState<"org" | "token" | null>(null);
  const [showToken, setShowToken] = useState(false);

  const { data: me, refetch: refetchMe } = useQuery<Me>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()) as Me;
    },
    enabled: !!user,
  });

  async function handleLogout() {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      credentials: "include",
    });
    qc.clear();
    navigate("/login");
  }

  async function handleGenerateToken() {
    const res = await fetch("/api/me/api-key", {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) await refetchMe();
  }

  async function handleRevokeToken() {
    const res = await fetch("/api/me/api-key", {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) await refetchMe();
  }

  function copy(text: string, type: "org" | "token") {
    void navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ── Global navigation bar ────────────────────────────────────── */}
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-3 flex items-center justify-between">
          {/* Left: logo + nav links */}
          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-base font-bold text-indigo-700 tracking-tight hover:text-indigo-800 transition-colors"
            >
              <img src="/logo.svg" alt="КвизОК" className="h-8 w-8" />
              КвизОК CRM
            </Link>
            <Link
              to="/dashboard"
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              Квизы
            </Link>
            <Link
              to="/students"
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              Ученики
            </Link>
          </div>

          {/* Right: org code, token, user, logout */}
          {user && (
            <div className="flex items-center gap-3">
              {/* Org registration code — click to copy */}
              {me?.orgCode && (
                <button
                  onClick={() => copy(me.orgCode, "org")}
                  title="Код для подключения учеников — нажмите, чтобы скопировать"
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-mono font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  {copied === "org" ? "✓ Скопировано!" : `📋 ${me.orgCode}`}
                </button>
              )}

              {/* Desktop API token */}
              <div className="relative">
                <button
                  onClick={() => setShowToken((v) => !v)}
                  title="Токен для КвизОК Desktop"
                  className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    showToken
                      ? "bg-slate-200 text-slate-700"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  🔑 Desktop
                </button>

                {showToken && (
                  <>
                    {/* Backdrop to close */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowToken(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-white shadow-xl ring-1 ring-slate-200 p-4 z-20">
                      <p className="text-xs font-semibold text-slate-700 mb-1">
                        Токен для Desktop-приложения
                      </p>
                      <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                        Вставьте в КвизОК Desktop → Настройки → Токен (Bearer),
                        чтобы синхронизировать квизы с сервером.
                      </p>
                      {me?.apiToken ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <code className="flex-1 rounded-lg bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700 break-all border border-slate-200 min-w-0">
                              {me.apiToken}
                            </code>
                            <button
                              onClick={() => copy(me.apiToken!, "token")}
                              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs text-white hover:bg-indigo-700 transition-colors"
                            >
                              {copied === "token" ? "✓" : "Копировать"}
                            </button>
                          </div>
                          <button
                            onClick={() => void handleRevokeToken()}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors self-end"
                          >
                            Отозвать токен
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => void handleGenerateToken()}
                          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                        >
                          Создать токен
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              <span className="text-sm text-slate-600">{user.name}</span>

              <button
                onClick={() => void handleLogout()}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                Выйти
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── Page content ─────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
