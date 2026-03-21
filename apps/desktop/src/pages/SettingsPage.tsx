import { useState } from "react";
import {
  CloudArrowUp,
  MagicWand,
  Link,
  Key,
  LockKey,
  Eye,
  EyeSlash,
  Bell,
  CaretRight,
  Check,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { Sidebar } from "../components/Sidebar.tsx";

export function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(
    () => localStorage.getItem("api_url") ?? "",
  );
  const [apiToken, setApiToken] = useState(
    () => localStorage.getItem("api_token") ?? "",
  );
  const [aiKey, setAiKey] = useState(
    () => localStorage.getItem("konstruktor_ai_key") ?? "",
  );
  const [savedSync, setSavedSync] = useState(false);
  const [savedAi, setSavedAi] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showAiKey, setShowAiKey] = useState(false);

  function handleSaveSync(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem("api_url", apiUrl);
    localStorage.setItem("api_token", apiToken);
    setSavedSync(true);
    setTimeout(() => setSavedSync(false), 2000);
  }

  function handleSaveAi(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem("konstruktor_ai_key", aiKey);
    setSavedAi(true);
    setTimeout(() => setSavedAi(false), 2000);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA] text-slate-800 antialiased">
      <Sidebar activePage="settings" />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Хедер */}
        <header className="h-18 px-8 flex items-center justify-between z-10 sticky top-0 bg-[#FAFAFA]/80 backdrop-blur-xl border-b border-slate-200/50 shrink-0">
          <div className="flex items-center gap-2 text-[15px] font-bold text-slate-800">
            <span className="text-slate-400">Рабочее пространство</span>
            <CaretRight size={12} weight="bold" className="text-slate-300" />
            <span>Настройки</span>
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary-600 hover:border-primary-200 transition-all shadow-sm">
            <Bell size={20} weight="fill" />
          </button>
        </header>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-10 w-full max-w-160">
            <h1 className="text-3xl font-extrabold text-slate-800 mb-8 flex items-center gap-3">
              Настройки
              <SlidersHorizontal
                size={28}
                weight="duotone"
                className="text-slate-300"
              />
            </h1>

            <div className="flex flex-col gap-8">
              {/* Карточка 1: Облачная синхронизация */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-card p-8">
                <div className="flex gap-4 items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 shadow-sm border border-blue-100">
                    <CloudArrowUp size={24} weight="duotone" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800">
                      Облачная синхронизация
                    </h2>
                    <p className="text-[14px] font-semibold text-slate-500 mt-1 leading-snug">
                      Подключите школьную систему, чтобы оценки за квизы
                      выставлялись автоматически.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveSync} className="space-y-5">
                  {/* URL API */}
                  <div>
                    <label className="block text-[14px] font-extrabold text-slate-700 mb-2">
                      URL API
                    </label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl pr-4 focus-within:bg-white focus-within:border-primary-300 focus-within:ring-4 focus-within:ring-primary-50 transition-all">
                      <Link
                        size={18}
                        weight="bold"
                        className="text-slate-400 ml-4 shrink-0"
                      />
                      <input
                        type="url"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        placeholder="https://api.yourdomain.com"
                        className="w-full bg-transparent text-slate-800 placeholder:text-slate-400 text-[15px] font-semibold px-3 py-3 outline-none"
                      />
                    </div>
                  </div>

                  {/* Bearer токен */}
                  <div>
                    <label className="block text-[14px] font-extrabold text-slate-700 mb-2">
                      Bearer-токен
                    </label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl pr-2 focus-within:bg-white focus-within:border-primary-300 focus-within:ring-4 focus-within:ring-primary-50 transition-all">
                      <Key
                        size={18}
                        weight="bold"
                        className="text-slate-400 ml-4 shrink-0"
                      />
                      <input
                        type={showToken ? "text" : "password"}
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        placeholder="eyJ..."
                        className="w-full bg-transparent text-slate-800 placeholder:text-slate-400 text-[15px] font-semibold px-3 py-3 outline-none tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken((v) => !v)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-primary-600 hover:bg-slate-100 transition-colors shrink-0"
                      >
                        {showToken ? <EyeSlash size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center gap-4 border-t border-slate-50 pt-6">
                    <button
                      type="submit"
                      className="bg-primary-600 hover:bg-primary-500 text-white font-bold text-[15px] px-6 py-2.5 rounded-[14px] transition-transform active:scale-95 shadow-md flex items-center gap-2"
                    >
                      Сохранить
                    </button>
                    {savedSync && (
                      <span className="text-[15px] font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in duration-200">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <Check size={12} weight="bold" />
                        </span>
                        Сохранено!
                      </span>
                    )}
                  </div>
                </form>
              </div>

              {/* Карточка 2: AI-генерация */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-card p-8">
                <div className="flex gap-4 items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0 shadow-sm border border-purple-100">
                    <MagicWand size={24} weight="duotone" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800">
                      AI-генерация
                    </h2>
                    <p className="text-[14px] font-semibold text-slate-500 mt-1 leading-snug">
                      Введите ключ от нейросети, чтобы умный помощник создавал
                      вопросы за секунды.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveAi} className="space-y-5">
                  <div>
                    <label className="block text-[14px] font-extrabold text-slate-700 mb-2">
                      API-ключ
                    </label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl pr-2 focus-within:bg-white focus-within:border-primary-300 focus-within:ring-4 focus-within:ring-primary-50 transition-all">
                      <LockKey
                        size={18}
                        weight="bold"
                        className="text-slate-400 ml-4 shrink-0"
                      />
                      <input
                        type={showAiKey ? "text" : "password"}
                        value={aiKey}
                        onChange={(e) => setAiKey(e.target.value)}
                        placeholder="sk-aitunnel-..."
                        className="w-full bg-transparent text-slate-800 placeholder:text-slate-400 text-[15px] font-semibold px-3 py-3 outline-none tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAiKey((v) => !v)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-primary-600 hover:bg-slate-100 transition-colors shrink-0"
                      >
                        {showAiKey ? <EyeSlash size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center gap-4 border-t border-slate-50 pt-6">
                    <button
                      type="submit"
                      className="bg-primary-600 hover:bg-primary-500 text-white font-bold text-[15px] px-6 py-2.5 rounded-[14px] transition-transform active:scale-95 shadow-md flex items-center gap-2"
                    >
                      Сохранить
                    </button>
                    {savedAi && (
                      <span className="text-[15px] font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in duration-200">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <Check size={12} weight="bold" />
                        </span>
                        Сохранено!
                      </span>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
