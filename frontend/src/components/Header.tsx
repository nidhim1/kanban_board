import {
  Search,
  Filter,
  Sun,
  Moon,
  Plus,
  Users,
  MoreHorizontal,
  Flag,
  LayoutGrid,
} from "lucide-react";
import type { Label } from "../types";

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onNewTask: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalTasks: number;
  doneTasks: number;
  overdueTasks: number;
  dueTodayTasks: number;
  memberCount: number;
  labels: Label[];
  activeFilters: string[];
  onToggleFilter: (filter: string) => void;
  onClearFilters: () => void;
}

export function Header({
  isDark,
  onToggleTheme,
  onNewTask,
  searchQuery,
  onSearchChange,
  totalTasks,
  doneTasks,
  overdueTasks,
  dueTodayTasks,
  memberCount,
  labels,
  activeFilters,
  onToggleFilter,
  onClearFilters,
}: HeaderProps) {
  // ============================================
  // Theme tokens
  // ============================================
  const bg = isDark ? "bg-board-header-dark" : "bg-board-header-light";
  const border = isDark ? "border-[#1e252e]" : "border-[#e8eaed]";
  const textPrimary = isDark ? "text-[#e8eaed]" : "text-[#1a1e24]";
  const textSecondary = isDark ? "text-[#7a8394]" : "text-[#6b7280]";
  const textMuted = isDark ? "text-[#4a5568]" : "text-[#9ca3af]";
  const inputBg = isDark ? "bg-[#161b22]" : "bg-[#f4f5f7]";
  const chipBg = isDark
    ? "bg-[#161b22] border-[#2a2f38]"
    : "bg-white border-[#e8eaed]";
  const chipActive = isDark
    ? "bg-[#1a2e2a] border-accent-mint/40"
    : "bg-[#ecfdf5] border-accent-mint/40";
  const iconBtnClass = `p-2 rounded-lg ${inputBg} border ${border} hover:opacity-80 transition-opacity`;

  // Completion percentage for the progress bar
  const completionPercent = totalTasks > 0
    ? Math.round((doneTasks / totalTasks) * 100)
    : 0;

  const uniqueLabels = Array.from(new Set(labels.map((l) => l.name)));

  return (
    <header className={`${bg} border-b ${border}`}>
      {/* ---- Row 1: Identity + Actions ---- */}
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Board icon */}
          <div className="w-9 h-9 rounded-lg bg-accent-mint/10 flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="text-accent-mint"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
          <div>
            <h1 className={`text-[15px] font-semibold ${textPrimary} leading-tight tracking-[-0.01em]`}>
              Sprint board
            </h1>
            <p className={`text-[11px] ${textMuted} mt-0.5`}>Q3 product launch</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${inputBg} border ${border}`}>
            <Search size={14} className={textMuted} />
            <input
              type="text"
              placeholder="Search tasks"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`bg-transparent border-none outline-none text-xs w-28 ${textPrimary} placeholder:text-[#9ca3af] dark:placeholder:text-[#4a5568]`}
            />
            <kbd className={`text-[10px] ${textMuted} px-1.5 py-0.5 rounded border ${border} leading-none font-mono`}>
              /
            </kbd>
          </div>

          <button className={iconBtnClass}>
            <Filter size={14} className={textMuted} />
          </button>
          <button onClick={onToggleTheme} className={iconBtnClass}>
            {isDark ? <Sun size={14} className={textMuted} /> : <Moon size={14} className={textMuted} />}
          </button>
          <button className={iconBtnClass}>
            <MoreHorizontal size={14} className={textMuted} />
          </button>

          <button
            onClick={onNewTask}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent-mint hover:bg-accent-mint-hover text-white text-xs font-medium transition-colors shadow-sm shadow-accent-mint/20"
          >
            <Plus size={14} strokeWidth={2.5} />
            New task
          </button>
        </div>
      </div>

      {/* ---- Row 2: Stats + Progress bar ---- */}
      <div className={`px-5 py-2 flex items-center justify-between border-t ${border}`}>
        <div className="flex items-center gap-5 text-xs">
          {/* Stats */}
          <span className={textPrimary}>
            <span className="font-semibold tabular-nums">{totalTasks}</span>
            <span className={`ml-1 ${textSecondary}`}>tasks</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-status-done" />
            <span className="font-semibold text-status-done tabular-nums">{doneTasks}</span>
            <span className={textSecondary}>done</span>
          </span>
          {overdueTasks > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-priority-high" />
              <span className="font-semibold text-priority-high tabular-nums">{overdueTasks}</span>
              <span className={textSecondary}>overdue</span>
            </span>
          )}
          {dueTodayTasks > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-priority-normal" />
              <span className="font-semibold text-priority-normal tabular-nums">{dueTodayTasks}</span>
              <span className={textSecondary}>due today</span>
            </span>
          )}

          {/* Inline progress bar */}
          {totalTasks > 0 && (
            <div className="flex items-center gap-2 ml-2">
              <div className={`w-24 h-1.5 rounded-full ${isDark ? "bg-[#1e252e]" : "bg-[#e8eaed]"}`}>
                <div
                  className="h-full rounded-full bg-accent-mint column-progress"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <span className={`text-[10px] font-medium tabular-nums ${textMuted}`}>
                {completionPercent}%
              </span>
            </div>
          )}
        </div>

        <div className={`flex items-center gap-1.5 text-xs ${textSecondary}`}>
          <Users size={13} />
          <span>{memberCount} members</span>
        </div>
      </div>

      {/* ---- Row 3: Filters ---- */}
      <div className={`px-5 py-2 flex items-center gap-2 border-t ${border}`}>
        <button
          onClick={onClearFilters}
          className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all ${
            activeFilters.length === 0
              ? chipActive + " text-accent-mint"
              : chipBg + " " + textSecondary
          }`}
        >
          <span className="flex items-center gap-1.5">
            <LayoutGrid size={11} />
            All
          </span>
        </button>
        <button
          onClick={() => onToggleFilter("high")}
          className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all ${
            activeFilters.includes("high")
              ? chipActive + " text-accent-mint"
              : chipBg + " " + textSecondary
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Flag size={11} />
            High priority
          </span>
        </button>
        {uniqueLabels.map((name) => (
          <button
            key={name}
            onClick={() => onToggleFilter(name)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all ${
              activeFilters.includes(name)
                ? chipActive + " text-accent-mint"
                : chipBg + " " + textSecondary
            }`}
          >
            {name}
          </button>
        ))}
      </div>
    </header>
  );
}