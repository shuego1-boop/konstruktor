import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";
import type { Quiz, PackManifest } from "@konstruktor/shared";
import { Button, Spinner } from "@konstruktor/ui";
import { downloadPacksForCode } from "../services/sync.ts";

type PackEntry = {
  packId: string;
  manifest: PackManifest;
};

export function HomePage() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<PackEntry[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const playerName = localStorage.getItem("player_name") ?? "Ученик";

  useEffect(() => {
    void loadLocalPacks();
  }, []);

  async function loadLocalPacks() {
    setLoadingPacks(true);
    try {
      const result = await Filesystem.readdir({
        path: "packs",
        directory: Directory.Data,
      });
      const entries: PackEntry[] = [];
      for (const file of result.files) {
        if (!file.name.endsWith(".pack")) continue;
        try {
          const raw = await Filesystem.readFile({
            path: `packs/${file.name}/manifest.json`,
            directory: Directory.Data,
          });
          const manifest = JSON.parse(raw.data as string) as PackManifest;
          entries.push({ packId: file.name.replace(".pack", ""), manifest });
        } catch {
          // skip corrupt pack
        }
      }
      setPacks(entries);
    } catch {
      // packs directory doesn't exist yet — that's fine
      setPacks([]);
    } finally {
      setLoadingPacks(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const { value: code } = await Preferences.get({ key: "teacherCode" });
      if (!code) {
        setRefreshMsg("Код учителя не найден. Обратитесь к настройке.");
        return;
      }
      const count = await downloadPacksForCode(code);
      await loadLocalPacks();
      setRefreshMsg(`Обновлено: ${count} квиз(ов)`);
    } catch (e: unknown) {
      setRefreshMsg(e instanceof Error ? e.message : "Ошибка обновления");
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMsg(null), 4000);
    }
  }

  async function handleResetSetup() {
    await Preferences.remove({ key: "deviceId" });
    await Preferences.remove({ key: "deviceToken" });
    await Preferences.remove({ key: "teacherCode" });
    window.location.reload();
  }

  function startQuiz(packId: string) {
    navigate(`/quiz/${packId}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-indigo-600 to-purple-700 p-6">
      <div className="w-full max-w-lg">
        <h1 className="text-4xl font-bold text-white text-center mb-2 mt-8">
          Konstruktor
        </h1>
        <p className="text-indigo-200 text-center mb-8">
          Выберите квиз для начала
        </p>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Мои квизы</h2>
            <Button
              variant="secondary"
              className="text-xs px-3 py-1.5 h-auto"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
            >
              {refreshing ? "Обновление…" : "Обновить"}
            </Button>
          </div>
          {refreshMsg && (
            <p className="text-xs text-indigo-600 mb-2">{refreshMsg}</p>
          )}
          {loadingPacks && (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          )}
          {!loadingPacks && packs.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">
              Нет квизов. Нажмите «Обновить», чтобы скачать.
            </p>
          )}
          {!loadingPacks && packs.length > 0 && (
            <ul className="flex flex-col gap-3">
              {packs.map(({ packId, manifest }) => (
                <li key={packId}>
                  <button
                    className="w-full text-left rounded-xl border border-slate-200 px-4 py-3 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                    onClick={() => startQuiz(packId)}
                  >
                    <p className="font-semibold text-slate-800">
                      {manifest.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      v{manifest.quizVersion}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            className="text-indigo-200 text-xs underline hover:text-white transition-colors"
            onClick={() => void handleResetSetup()}
          >
            Сменить учителя
          </button>
        </div>
      </div>
    </div>
  );
}
