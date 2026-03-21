import { useNavigate, useLocation } from "react-router";
import {
  House,
  Books,
  UsersThree,
  ChartLineUp,
  Files,
  FolderStar,
  Lightbulb,
} from "@phosphor-icons/react";

type NavItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Главная",
    icon: <House size={24} weight="duotone" />,
    path: "/dashboard",
  },
  {
    label: "Мои квизы",
    icon: <Books size={24} weight="duotone" />,
    path: "/dashboard",
  },
  {
    label: "Ученики",
    icon: <UsersThree size={24} weight="duotone" />,
    path: "#",
  },
  {
    label: "Результаты",
    icon: <ChartLineUp size={24} weight="duotone" />,
    path: "#",
  },
];

const TOOL_ITEMS: NavItem[] = [
  {
    label: "Библиотека",
    icon: <Files size={24} weight="duotone" />,
    path: "#",
  },
  {
    label: "Шаблоны",
    icon: <FolderStar size={24} weight="duotone" />,
    path: "#",
  },
];

type SidebarProps = {
  activePage?: "dashboard" | "settings";
};

export function Sidebar({ activePage = "dashboard" }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function isActive(item: NavItem) {
    if (activePage === "dashboard" && item.label === "Мои квизы") return true;
    if (activePage === "settings") return false;
    return false;
  }

  function handleNav(path: string) {
    if (path !== "#") navigate(path);
  }

  // User info from localStorage
  const userName = localStorage.getItem("konstruktor_user_name") ?? "Учитель";
  const userRole =
    localStorage.getItem("konstruktor_user_role") ?? "Преподаватель";

  return (
    <aside className="w-64 h-full flex flex-col shrink-0 z-20 bg-white border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
      {/* Логотип */}
      <div className="h-18 flex items-center px-6">
        <button
          className="flex items-center gap-3 text-slate-900 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/dashboard")}
        >
          <div className="w-9 h-9 rounded-[14px] bg-linear-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
            <Lightbulb size={20} weight="bold" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">
            Квиз<span className="text-primary-600">ОК</span>
          </span>
        </button>
      </div>

      {/* Навигация */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.label}
              onClick={() => handleNav(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-[15px] transition-colors text-left group ${
                active
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-primary-600"
              }`}
            >
              <span
                className={
                  active
                    ? "text-primary-600"
                    : "text-slate-400 group-hover:text-primary-500 transition-colors"
                }
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}

        {/* Секция «Инструменты» */}
        <div className="pt-6 pb-2 px-4">
          <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
            Инструменты
          </p>
        </div>

        {TOOL_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => handleNav(item.path)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-primary-600 transition-colors font-bold text-[15px] text-left group"
          >
            <span className="text-slate-400 group-hover:text-primary-500 transition-colors">
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}

        {/* Настройки */}
        <div className="pt-6 pb-2 px-4">
          <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
            Система
          </p>
        </div>
        <button
          onClick={() => navigate("/settings")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-[15px] transition-colors text-left group ${
            activePage === "settings"
              ? "bg-primary-50 text-primary-700"
              : "text-slate-500 hover:bg-slate-50 hover:text-primary-600"
          }`}
        >
          <span
            className={
              activePage === "settings"
                ? "text-primary-600"
                : "text-slate-400 group-hover:text-primary-500 transition-colors"
            }
          >
            {/* Gear icon inline SVG since we avoid importing everything */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 256 256"
              fill="currentColor"
            >
              <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40q-2.16-.06-4.32,0L107.2,25.08a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.48a8,8,0,0,0-3.93,6L67.32,64.21q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84q-.06,2.16,0,4.32L25.08,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z" />
            </svg>
          </span>
          Настройки
        </button>
      </nav>

      {/* Профиль */}
      <div className="p-4 border-t border-slate-50 mb-2">
        <button className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors text-left border border-transparent hover:border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <div className="text-[15px] font-bold text-slate-800 truncate">
                {userName}
              </div>
              <div className="text-xs font-semibold text-slate-400 truncate">
                {userRole}
              </div>
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}
