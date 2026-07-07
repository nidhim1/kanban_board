import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./TaskCard";
import { DropZone } from "./DropZone";
import { Plus, Inbox } from "lucide-react";
import type { Column as ColumnType, Task } from "../types";

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  totalTasks: number;
  isDark: boolean;
  isOver: boolean;
  onOpenCreate: () => void;
  onSelectTask: (task: Task) => void;
}

export function Column({
  column,
  tasks,
  totalTasks,
  isDark,
  isOver,
  onOpenCreate,
  onSelectTask,
}: ColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id });

  const bg = isDark ? "bg-board-surface-dark" : "bg-board-surface-light";
  const textPrimary = isDark ? "text-[#c8cacd]" : "text-[#4a4d52]";
  const textCount = isDark ? "text-[#4a5568]" : "text-[#9ca3af]";
  const btnBg = isDark
    ? "bg-[#1c2128] hover:bg-[#2a2f38] border border-[#2a2f38]"
    : "bg-white hover:bg-[#f4f5f7] border border-[#e8eaed]";
  const isDone = column.id === "done";

  const progressWidth = totalTasks > 0 ? (tasks.length / totalTasks) * 100 : 0;

  return (
     <div
      className={`rounded-xl flex flex-col ${bg} transition-all duration-150 min-h-0 sm:min-h-[500px] ${
        isOver
          ? "ring-2 ring-accent-mint/25 ring-inset shadow-lg shadow-accent-mint/5"
          : ""
      }`}
    >
      {/* Progress bar */}
      <div className="px-3 pt-3">
        <div className={`w-full h-[2px] rounded-full ${isDark ? "bg-[#1e252e]" : "bg-[#e2e5ea]"}`}>
          <div
            className="column-progress"
            style={{
              width: `${progressWidth}%`,
              backgroundColor: column.dotColor,
            }}
          />
        </div>
      </div>

      {/* Column header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: column.dotColor }}
          />
          <span className={`text-[11px] font-semibold tracking-[0.04em] uppercase ${textPrimary}`}>
            {column.title}
          </span>
          <span className={`text-[11px] font-medium ${textCount} tabular-nums min-w-[14px] text-center`}>
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onOpenCreate}
          className={`w-6 h-6 rounded-md flex items-center justify-center ${btnBg} transition-all`}
        >
          <Plus size={12} className={textCount} />
        </button>
      </div>

      {/* Task list — ref on this div makes entire area droppable */}
      <div
        ref={setNodeRef}
        className="flex-1 px-2 pb-2 space-y-1.5 custom-scrollbar overflow-y-auto"
      >
        {tasks.length === 0 ? (
          <div className="py-8 sm:py-12 text-center">
            <div
              className={`w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center ${
                isDark ? "bg-[#1c2128]" : "bg-[#f0f2f5]"
              }`}
            >
              <Inbox size={18} className={textCount} />
            </div>
            <p className={`text-xs ${textCount} mb-1`}>No tasks yet</p>
            <button
              onClick={onOpenCreate}
              className="text-xs text-accent-mint hover:text-accent-mint-hover transition-colors font-medium"
            >
              Create a task
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
        <DropZone id={`${column.id}-end`} />
      </div>
    </div>
  );
}
