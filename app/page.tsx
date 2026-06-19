"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ShoppingCart,
  Sparkles,
  Plus,
  Trash2,
  Moon,
  Sun,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "shopping" | "cleaning";
type Category = "Продукты" | "Бытовая химия" | "Для дома" | "Другое";
type Priority = "Низкий" | "Средний" | "Высокий";
type TaskType = "разовое" | "регулярное";

interface ShoppingItem {
  id: string;
  name: string;
  category: Category;
  checked: boolean;
  checkedAt?: number;
  leaving?: boolean;
}

interface CleaningTask {
  id: string;
  name: string;
  priority: Priority;
  type: TaskType;
  done: boolean;
  doneAt?: number;
  leaving?: boolean;
}

// ─── Default data ─────────────────────────────────────────────────────────────

const DEFAULT_SHOPPING: ShoppingItem[] = [
  { id: "s1", name: "Молоко", category: "Продукты", checked: false },
  { id: "s2", name: "Хлеб", category: "Продукты", checked: false },
  { id: "s3", name: "Яйца", category: "Продукты", checked: false },
  { id: "s4", name: "Греческий йогурт", category: "Продукты", checked: false },
  { id: "s5", name: "Средство для посуды", category: "Бытовая химия", checked: false },
  { id: "s6", name: "Стиральный порошок", category: "Бытовая химия", checked: false },
  { id: "s7", name: "Лампочка в коридор", category: "Для дома", checked: false },
  { id: "s8", name: "Батарейки АА", category: "Другое", checked: false },
];

const DEFAULT_TASKS: CleaningTask[] = [
  { id: "t1", name: "Пропылесосить гостиную", priority: "Высокий", type: "регулярное", done: false },
  { id: "t2", name: "Полить цветы", priority: "Средний", type: "регулярное", done: false },
  { id: "t3", name: "Протереть пыль", priority: "Средний", type: "регулярное", done: false },
  { id: "t4", name: "Вынести мусор", priority: "Высокий", type: "разовое", done: false },
  { id: "t5", name: "Помыть окна", priority: "Низкий", type: "разовое", done: false },
  { id: "t6", name: "Разобрать антресоль", priority: "Низкий", type: "разовое", done: false },
];

const CATEGORIES: Category[] = ["Продукты", "Бытовая химия", "Для дома", "Другое"];
const PRIORITY_ORDER: Priority[] = ["Высокий", "Средний", "Низкий"];

// ─── LocalStorage hook ────────────────────────────────────────────────────────

function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const stored = localStorage.getItem(key);
      if (stored) setValue(JSON.parse(stored));
    } catch {}
  }, [key]);

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [key]
  );

  return [value, set] as const;
}

// ─── Dark mode hook ───────────────────────────────────────────────────────────

function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("dom-dark");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored !== null ? stored === "true" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = useCallback(() => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("dom-dark", String(next));
      return next;
    });
  }, []);

  return [dark, toggle] as const;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

// ─── Shopping List ────────────────────────────────────────────────────────────

function ShoppingList() {
  const [items, setItems] = useLocalStorage<ShoppingItem[]>("dom-shopping", DEFAULT_SHOPPING);
  const [input, setInput] = useState("");
  const [category, setCategory] = useState<Category>("Продукты");
  const [showBought, setShowBought] = useState(true);

  const active = items.filter((i) => !i.checked);
  const bought = items
    .filter((i) => i.checked)
    .sort((a, b) => (b.checkedAt ?? 0) - (a.checkedAt ?? 0));

  const byCategory = CATEGORIES.map((cat) => ({
    cat,
    items: active.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  const addItem = () => {
    const name = input.trim();
    if (!name) return;
    setItems((prev) => [{ id: uid(), name, category, checked: false }, ...prev]);
    setInput("");
  };

  const toggleItem = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, leaving: true } : i)));
    setTimeout(() => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, checked: !i.checked, checkedAt: Date.now(), leaving: false }
            : i
        )
      );
    }, 280);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clearBought = () => setItems((prev) => prev.filter((i) => !i.checked));

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Add panel */}
      <div
        className="rounded-2xl border p-4 flex flex-col gap-3 shadow-sm"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Добавить продукт…"
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none placeholder:opacity-50 focus:ring-2 focus:ring-[var(--primary)] transition-shadow"
          style={{
            background: "var(--surface-2)",
            color: "var(--text)",
            borderColor: "var(--border)",
          }}
        />
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--surface-2)", color: "var(--text)", borderColor: "var(--border)" }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={addItem}
            disabled={!input.trim()}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40 active:scale-95 transition-transform"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            <Plus size={16} />
            Добавить
          </button>
        </div>
      </div>

      {/* Active items */}
      {byCategory.length === 0 && bought.length === 0 && (
        <p className="text-center text-sm py-8" style={{ color: "var(--text-muted)" }}>
          Список пуст — добавь первый продукт
        </p>
      )}

      {byCategory.map(({ cat, items: catItems }) => (
        <div key={cat}>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2 px-1"
            style={{ color: "var(--text-muted)" }}
          >
            {cat}
          </p>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            {catItems.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3.5 transition-all ${item.leaving ? "item-leaving" : ""}`}
                style={{
                  borderTopWidth: idx > 0 ? 1 : 0,
                  borderTopColor: "var(--border)",
                  borderTopStyle: "solid",
                }}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center active:scale-90 transition-transform"
                  style={{ borderColor: "var(--primary)" }}
                />
                <span className="flex-1 text-sm" style={{ color: "var(--text)" }}>
                  {item.name}
                </span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 rounded-lg active:opacity-60 transition-opacity"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Bought */}
      {bought.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              onClick={() => setShowBought((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              {showBought ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Куплено · {bought.length}
            </button>
            <button
              onClick={clearBought}
              className="flex items-center gap-1 text-xs active:opacity-60 transition-opacity"
              style={{ color: "var(--primary-light)" }}
            >
              <Trash2 size={13} />
              Очистить
            </button>
          </div>

          {showBought && (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              {bought.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 item-entering"
                  style={{
                    borderTopWidth: idx > 0 ? 1 : 0,
                    borderTopColor: "var(--border)",
                    borderTopStyle: "solid",
                  }}
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: "var(--sage)", borderColor: "var(--sage)" }}
                  >
                    <Check size={11} color="#fff" strokeWidth={3} />
                  </button>
                  <span className="flex-1 text-sm line-through" style={{ color: "var(--text-muted)" }}>
                    {item.name}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 active:opacity-60"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cleaning List ─────────────────────────────────────────────────────────────

const PRIORITY_COLORS_LIGHT: Record<Priority, { bg: string; text: string }> = {
  Высокий: { bg: "#FDE8E8", text: "#B83232" },
  Средний: { bg: "#FFF4E0", text: "#B87820" },
  Низкий: { bg: "#E8F0E8", text: "#3A6A3A" },
};

const PRIORITY_COLORS_DARK: Record<Priority, { bg: string; text: string }> = {
  Высокий: { bg: "#3D1A1A", text: "#E87070" },
  Средний: { bg: "#3D2E10", text: "#E8A840" },
  Низкий: { bg: "#1A2E1A", text: "#70A870" },
};

function PriorityBadge({ priority, dark }: { priority: Priority; dark: boolean }) {
  const colors = dark ? PRIORITY_COLORS_DARK[priority] : PRIORITY_COLORS_LIGHT[priority];
  return (
    <span
      className="text-[11px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0"
      style={{ background: colors.bg, color: colors.text }}
    >
      {priority}
    </span>
  );
}

function CleaningList({ dark }: { dark: boolean }) {
  const [tasks, setTasks] = useLocalStorage<CleaningTask[]>("dom-cleaning", DEFAULT_TASKS);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState<Priority>("Средний");
  const [type, setType] = useState<TaskType>("разовое");
  const [showDone, setShowDone] = useState(true);

  const active = tasks
    .filter((t) => !t.done)
    .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));

  const done = tasks
    .filter((t) => t.done)
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));

  const addTask = () => {
    const name = input.trim();
    if (!name) return;
    setTasks((prev) => [{ id: uid(), name, priority, type, done: false }, ...prev]);
    setInput("");
  };

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, done: !t.done, doneAt: Date.now(), leaving: false }
            : t
        )
      );
    }, 280);
  };

  const removeTask = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const clearDone = () => setTasks((prev) => prev.filter((t) => !t.done));

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Add panel */}
      <div
        className="rounded-2xl border p-4 flex flex-col gap-3 shadow-sm"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Новое дело…"
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none placeholder:opacity-50 focus:ring-2 focus:ring-[var(--sage)] transition-shadow"
          style={{ background: "var(--surface-2)", color: "var(--text)", borderColor: "var(--border)" }}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--surface-2)", color: "var(--text)", borderColor: "var(--border)" }}
          >
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
            className="rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--surface-2)", color: "var(--text)", borderColor: "var(--border)" }}
          >
            <option value="разовое">Разовое</option>
            <option value="регулярное">Регулярное</option>
          </select>
        </div>
        <button
          onClick={addTask}
          disabled={!input.trim()}
          className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40 active:scale-95 transition-transform"
          style={{ background: "var(--sage)", color: "#fff" }}
        >
          <Plus size={16} />
          Добавить дело
        </button>
      </div>

      {/* Active */}
      {active.length === 0 && done.length === 0 && (
        <p className="text-center text-sm py-8" style={{ color: "var(--text-muted)" }}>
          Нет активных дел — добавь первое
        </p>
      )}

      {active.length > 0 && (
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2 px-1"
            style={{ color: "var(--text-muted)" }}
          >
            Активные дела · {active.length}
          </p>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            {active.map((task, idx) => (
              <div
                key={task.id}
                className={`flex items-start gap-3 px-4 py-3.5 transition-all ${task.leaving ? "item-leaving" : ""}`}
                style={{
                  borderTopWidth: idx > 0 ? 1 : 0,
                  borderTopColor: "var(--border)",
                  borderTopStyle: "solid",
                }}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 active:scale-90 transition-transform"
                  style={{ borderColor: "var(--sage)" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug" style={{ color: "var(--text)" }}>
                    {task.name}
                  </p>
                  <p className="text-xs mt-0.5 capitalize" style={{ color: "var(--text-muted)" }}>
                    {task.type}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityBadge priority={task.priority} dark={dark} />
                  <button
                    onClick={() => removeTask(task.id)}
                    className="p-1 active:opacity-60"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              onClick={() => setShowDone((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              {showDone ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Выполнено · {done.length}
            </button>
            <button
              onClick={clearDone}
              className="flex items-center gap-1 text-xs active:opacity-60 transition-opacity"
              style={{ color: "var(--primary-light)" }}
            >
              <Trash2 size={13} />
              Очистить
            </button>
          </div>

          {showDone && (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              {done.map((task, idx) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 px-4 py-3 item-entering"
                  style={{
                    borderTopWidth: idx > 0 ? 1 : 0,
                    borderTopColor: "var(--border)",
                    borderTopStyle: "solid",
                  }}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: "var(--sage)", borderColor: "var(--sage)" }}
                  >
                    <Check size={11} color="#fff" strokeWidth={3} />
                  </button>
                  <p className="flex-1 text-sm line-through" style={{ color: "var(--text-muted)" }}>
                    {task.name}
                  </p>
                  <button
                    onClick={() => removeTask(task.id)}
                    className="p-1 active:opacity-60"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bottom Navigation ─────────────────────────────────────────────────────────

function BottomNav({ screen, onSwitch }: { screen: Screen; onSwitch: (s: Screen) => void }) {
  const tabs: { id: Screen; label: string; Icon: React.ElementType }[] = [
    { id: "shopping", label: "Покупки", Icon: ShoppingCart },
    { id: "cleaning", label: "Уборка и дела", Icon: Sparkles },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 border-t flex items-center max-w-lg mx-auto"
      style={{
        background: "var(--surface)",
        boxShadow: "var(--nav-shadow)",
        borderTopColor: "var(--border)",
      }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = screen === id;
        return (
          <button
            key={id}
            onClick={() => onSwitch(id)}
            className="flex-1 flex flex-col items-center gap-1 pt-3 pb-5 relative active:scale-95 transition-transform"
          >
            {isActive && (
              <span
                className="absolute top-0 left-8 right-8 h-0.5 rounded-b-full"
                style={{ background: "var(--primary)" }}
              />
            )}
            <Icon
              size={22}
              strokeWidth={isActive ? 2.2 : 1.8}
              style={{ color: isActive ? "var(--primary)" : "var(--text-muted)" }}
            />
            <span
              className="text-[11px]"
              style={{
                color: isActive ? "var(--primary)" : "var(--text-muted)",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("shopping");
  const [dark, toggleDark] = useDarkMode();

  return (
    <div className="min-h-full flex flex-col max-w-lg mx-auto" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b px-5 py-4 flex items-center justify-between"
        style={{ background: "var(--surface)", borderBottomColor: "var(--border)" }}
      >
        <div>
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            Дом
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {screen === "shopping" ? "Список покупок" : "Уборка и дела"}
          </p>
        </div>
        <button
          onClick={toggleDark}
          className="w-9 h-9 rounded-xl border flex items-center justify-center active:scale-90 transition-transform"
          style={{
            background: "var(--surface-2)",
            color: "var(--text-muted)",
            borderColor: "var(--border)",
          }}
          aria-label="Сменить тему"
        >
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pt-5 pb-28 overflow-y-auto">
        {screen === "shopping" ? <ShoppingList /> : <CleaningList dark={dark} />}
      </main>

      <BottomNav screen={screen} onSwitch={setScreen} />
    </div>
  );
}
