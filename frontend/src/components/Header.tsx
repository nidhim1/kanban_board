import {
  Search,
  Filter,
  Sun,
  Moon,
  Plus,
  Users,
  MoreHorizontal,
  Flag,
  LayoutList,
} from "lucide-react";
import type { Label } from "../types";

// ============================================
// Props interface
// ============================================
// The Header doesn't own any state — it receives everything from App.tsx and calls back when the user interacts.
// This keeps state management centralized and components reusable.

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
  // Theme-aware style tokens
  // ============================================
  
  const bg = isDark ? "bg-board-header-dark" : "bg-board-header-light";
  const border = isDark ? "border-[#2a2e35]" : "border-[#e5e0d5]";
  const textPrimary = isDark ? "text-[#e8eaed]" : "text-[#1a1e24]";
  const textSecondary = isDark ? "text-[#8b8d90]" : "text-[#6b6e73]";
  const inputBg = isDark ? "bg-[#262b33]" : "bg-[#f5f3ee]";
  const chipBg = isDark
    ? "bg-[#262b33] border-[#363a42]"
    : "bg-white border-[#e0dbd2]";
  const chipActive = isDark
    ? "bg-[#363a42] border-accent-mint"
    : "bg-[#eef8f4] border-accent-mint";

  // Deduplicate label names for filter chips (in case two labels have the same name with different colors)
  const uniqueLabels = Array.from(new Set(labels.map((l) => l.name)));

  return (
    <header className={`${bg} border-b ${border}`}>
      {/* ============================================
          Row 1: Logo, search bar, action buttons
          ============================================ */}
      <div className="px-5 py-3 flex items-center justify-between">
        {/* Left side: Board identity */}
        <div className="flex items-center gap-3">
          {/* Board icon — mint green with grid pattern */}
          <div className="w-9 h-9 rounded-lg bg-accent-mint/15 flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="text-accent-mint"
            >
              <rect
                x="3"
                y="3"
                width="7"
                height="7"
                rx="1.5"
                fill="currentColor"
                opacity="0.6"
              />
              <rect
                x="14"
                y="3"
                width="7"
                height="7"
                rx="1.5"
                fill="currentColor"
              />
              <rect
                x="3"
                y="14"
                width="7"
                height="7"
                rx="1.5"
                fill="currentColor"
              />
              <rect
                x="14"
                y="14"
                width="7"
                height="7"
                rx="1.5"
                fill="currentColor"
                opacity="0.6"
              />
            </svg>
          </div>
          <div>
            <h1
              className={`text-base font-semibold ${textPrimary} leading-tight`}
            >
              Sprint board
            </h1>
            <p className={`text-xs ${textSecondary}`}>Q3 product launch</p>
          </div>
        </div>

        {/* Right side: Search + action buttons */}
        <div className="flex items-center gap-2">
          {/* Search input with keyboard shortcut hint */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${inputBg} border ${border}`}
          >
            <Search size={14} className={textSecondary} />
            <input
              type="text"
              placeholder="Search tasks"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`bg-transparent border-none outline-none text-xs w-28 ${textPrimary} placeholder:text-[#8b8d90]`}
            />
            {/* Keyboard shortcut badge — shows users they can press / to focus */}
            <span
              className={`text-2xs ${textSecondary} px-1 py-0.5 rounded border ${border} leading-none`}
            >
              /
            </span>
          </div>

          {/* Filter button */}
          <button
            className={`p-2 rounded-lg ${inputBg} border ${border} hover:opacity-80 transition-opacity`}
          >
            <Filter size={14} className={textSecondary} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-lg ${inputBg} border ${border} hover:opacity-80 transition-opacity`}
          >
            {isDark ? (
              <Sun size={14} className={textSecondary} />
            ) : (
              <Moon size={14} className={textSecondary} />
            )}
          </button>

          {/* More options */}
          <button
            className={`p-2 rounded-lg ${inputBg} border ${border} hover:opacity-80 transition-opacity`}
          >
            <MoreHorizontal size={14} className={textSecondary} />
          </button>

          {/* New task — primary CTA, always mint green */}
          <button
            onClick={onNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-mint hover:bg-accent-mint-hover text-white text-xs font-medium transition-colors"
          >
            <Plus size={14} />
            New task
          </button>
        </div>
      </div>

      {/* ============================================
          Row 2: Stats - task counts with colored indicators
          ============================================ */}
      <div
        className={`px-5 py-2 flex items-center justify-between border-t ${border}`}
      >
        <div className="flex items-center gap-4 text-xs">
          {/* Total tasks */}
          <span className={textPrimary}>
            <span className="font-semibold">{totalTasks}</span>
            <span className={`ml-1 ${textSecondary}`}>total</span>
          </span>

          {/* Done count — green dot */}
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-status-done" />
            <span className="font-semibold text-status-done">{doneTasks}</span>
            <span className={textSecondary}>done</span>
          </span>

          {/* Overdue count — red dot (only shows if > 0) */}
          {overdueTasks > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-priority-high" />
              <span className="font-semibold text-priority-high">
                {overdueTasks}
              </span>
              <span className={textSecondary}>overdue</span>
            </span>
          )}

          {/* Due today — amber dot (only shows if > 0) */}
          {dueTodayTasks > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-priority-normal" />
              <span className="font-semibold text-priority-normal">
                {dueTodayTasks}
              </span>
              <span className={textSecondary}>due today</span>
            </span>
          )}
        </div>

        {/* Member count on the right */}
        <div
          className={`flex items-center gap-1.5 text-xs ${textSecondary}`}
        >
          <Users size={13} />
          <span>{memberCount} members</span>
        </div>
      </div>

      {/* ============================================
          Row 3: Filter chips
          ============================================
          "All" clears all filters.
          "High priority" filters to high-priority tasks.
          Label chips filter by label name.
          Active filters get mint green accent. */}
      <div
        className={`px-5 py-2 flex items-center gap-2 border-t ${border}`}
      >
        {/* "All" chip — clears filters */}
        <button
          onClick={onClearFilters}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            activeFilters.length === 0
              ? chipActive + " text-accent-mint"
              : chipBg + " " + textSecondary
          }`}
        >
          <span className="flex items-center gap-1.5">
            <LayoutList size={12} />
            All
          </span>
        </button>

        {/* "High priority" chip */}
        <button
          onClick={() => onToggleFilter("high")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            activeFilters.includes("high")
              ? chipActive + " text-accent-mint"
              : chipBg + " " + textSecondary
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Flag size={12} />
            High priority
          </span>
        </button>

        {/* One chip per unique label name */}
        {uniqueLabels.map((name) => (
          <button
            key={name}
            onClick={() => onToggleFilter(name)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
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