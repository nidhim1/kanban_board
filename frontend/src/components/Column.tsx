import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./TaskCard";
import { Plus } from "lucide-react";
import type { Column as ColumnType, Task } from "../types";

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  isDark: boolean;
  isOver: boolean; // True when a card is being dragged over this column
  onOpenCreate: () => void;
  onSelectTask: (task: Task) => void;
}

export function Column({
  column,
  tasks,
  isDark,
  isOver,
  onOpenCreate,
  onSelectTask,
}: ColumnProps) {
  // ============================================
  // dnd-kit droppable hook
  // ============================================
  // setNodeRef marks this DOM element as a valid drop target.
  // When a dragged card hovers over this element, dnd-kit registers it as the "over" target.
  const { setNodeRef } = useDroppable({ id: column.id });

  // Theme-aware styles
  const bg = isDark ? "bg-board-surface-dark" : "bg-board-surface-light";
  const textPrimary = isDark ? "text-[#c8cacd]" : "text-[#4a4d52]";
  const textCount = isDark ? "text-[#6b6e73]" : "text-[#8b8d90]";
  const btnBg = isDark
    ? "bg-[#2a2e35] hover:bg-[#363a42]"
    : "bg-[#ebe7de] hover:bg-[#ddd9d0]";
  const isDone = column.id === "done";

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl min-h-[500px] flex flex-col ${bg} 
        ${isOver ? "ring-2 ring-accent-mint/30 ring-inset" : ""}`}
    >
      {/* ---- Column header: dot + title + count + add button ---- */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {/* Colored status dot */}
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: column.dotColor }}
          />
          <span className={`text-xs font-semibold tracking-wide ${textPrimary}`}>
            {column.title}
          </span>
          <span className={`text-xs ${textCount}`}>{tasks.length}</span>
        </div>

        {/* Add task to this specific column */}
        <button
          onClick={onOpenCreate}
          className={`w-6 h-6 rounded-md flex items-center justify-center ${btnBg} transition-colors`}
        >
          <Plus size={13} className={textCount} />
        </button>
      </div>

      {/* ---- Task list ---- */}
      <div className="flex-1 px-2 pb-2 space-y-2 custom-scrollbar overflow-y-auto">
        {tasks.length === 0 ? (
          // Empty state — friendly prompt to add a task
          <div className={`py-8 text-center ${textCount} text-xs`}>
            <p>No tasks yet</p>
            <button
              onClick={onOpenCreate}
              className="mt-2 text-accent-mint hover:underline text-xs"
            >
              Add a task
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDark={isDark}
              isDone={isDone}
              onClick={() => onSelectTask(task)}
            />
          ))
        )}
      </div>
    </div>
  );
}