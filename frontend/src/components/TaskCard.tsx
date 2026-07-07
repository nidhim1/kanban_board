import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  MessageSquare,
  Check,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { isOverdue, isDueSoon, formatDate, formatCompletedDate } from "../lib/dates";
import { PRIORITY_CONFIG } from "../types";
import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
  isDark: boolean;
  isDone?: boolean;     // Column tells us if this is the "done" column
  isOverlay?: boolean;  // True when rendering the drag ghost
  onClick: () => void;
}

// Helper: derive initials from a name string.
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TaskCard({
  task,
  isDark,
  isDone,
  isOverlay,
  onClick,
}: TaskCardProps) {
  // ============================================
  // dnd-kit sortable hook
  // ============================================
  // This hook makes the card both draggable and a drop target.
  // - setNodeRef: attaches to the DOM element dnd-kit controls
  // - attributes/listeners: spread onto the element for drag handling
  // - transform/transition: CSS values for smooth drag animation
  // - isDragging: true while this card is being dragged (we fade it)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // Theme-aware colors
  const textPrimary = isDark ? "text-[#e8eaed]" : "text-[#1a1e24]";
  const textSecondary = isDark ? "text-[#8b8d90]" : "text-[#6b6e73]";
  const cardClass = isDark ? "task-card-dark" : "task-card-light";

  // Extract nested relations from PostgREST response
  const labels = task.task_labels?.map((tl) => tl.labels).filter(Boolean) || [];
  const assignees =
    task.task_assignees?.map((ta) => ta.team_members).filter(Boolean) || [];
  const commentCount = task.comments?.[0]?.count || 0;

  // Priority display config
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const overdue = isOverdue(task.due_date);
  const dueSoon = isDueSoon(task.due_date);

  // Priority icon: up arrow = high, dash = normal, down arrow = low
  const PriorityIcon =
    task.priority === "high"
      ? ArrowUp
      : task.priority === "low"
        ? ArrowDown
        : Minus;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`task-card ${cardClass} rounded-[10px] p-3 pl-4 cursor-pointer relative overflow-hidden
        ${isDone ? "opacity-50" : ""}`}
    >

      {/* Priority stripe — left edge accent */}
      {!isDone && (
        <div
          className="priority-stripe"
          style={{ backgroundColor: priorityConfig.color }}
        />
      )}

      {/* ---- Label pills ---- */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {labels.map((label) => (
            <span
              key={label.id}
              className="px-2 py-[2px] rounded-full text-[10px] font-semibold tracking-wide"
              style={{ backgroundColor: label.color, color: "#ffffff" }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* ---- Title (with checkmark + strikethrough for done tasks) ---- */}
      <div className="flex items-start gap-1.5 mb-0.5">
        {isDone && (
          <Check size={14} className="text-status-done mt-0.5 flex-shrink-0" />
        )}
        <h3
          className={`text-[13px] font-medium leading-snug ${textPrimary} 
            ${isDone ? "line-through" : ""}`}
        >
          {task.title}
        </h3>
      </div>

      {/* ---- Description (hidden for done tasks to keep them compact) ---- */}
      {task.description && !isDone && (
        <p
          className={`text-[11px] ${textSecondary} line-clamp-2 mb-2 leading-relaxed`}
        >
          {task.description}
        </p>
      )}

      {/* ---- Completed date for done tasks ---- */}
      {isDone && task.completed_at && (
        <p className="text-xs text-status-done flex items-center gap-1 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-status-done" />
          {formatCompletedDate(task.completed_at)}
        </p>
      )}

      {/* ---- Bottom row: priority, date, comments, assignees ---- */}
      {!isDone && (
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-dashed"
          style={{ borderColor: isDark ? "#2a2f38" : "#f0f2f5" }}>
          <div className="flex items-center gap-2.5">
            {/* Priority arrow icon */}
            <PriorityIcon size={12} style={{ color: priorityConfig.color }} strokeWidth={2.5} />

            {/* Due date — red if overdue, amber if due soon */}
            {task.due_date && (
              <span
                className={`flex items-center gap-1 text-[10px] font-medium ${
                  overdue
                    ? "text-priority-high font-medium"
                    : dueSoon
                      ? "text-priority-normal font-medium"
                      : textSecondary
                }`}
              >
                <Calendar size={10} />
                {formatDate(task.due_date)}
              </span>
            )}

            {/* Comment count */}
            {commentCount > 0 && (
              <span
                className={`flex items-center gap-1 text-[10px] ${textSecondary}`}
              >
                <MessageSquare size={11} />
                {commentCount}
              </span>
            )}
          </div>

          {/* Assignee avatars — stacked with negative margin overlap */}
          {assignees.length > 0 && (
            <div className="flex items-center -space-x-1.5">
              {assignees.slice(0, 3).map((member) => (
                <div
                  key={member.id}
                  className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-semibold text-white border-[1.5px] ring-0"
                  style={{
                    backgroundColor: member.avatar_color,
                    borderColor: isDark ? "#1c2128" : "#ffffff",
                  }}
                  title={member.name}
                >
                  {getInitials(member.name)}
                </div>
              ))}
              {assignees.length > 3 && (
                <div
                  className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-semibold border-[1.5px] ${
                    isDark ? "bg-[#2a2f38] text-[#7a8394] border-[#1c2128]" : "bg-[#f0f2f5] text-[#6b7280] border-white"
                  }`}
                >
                  +{assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- Done tasks: just assignee avatars, no priority/date ---- */}
      {isDone && assignees.length > 0 && (
        <div className="flex justify-end mt-1">
          <div className="flex items-center -space-x-1.5">
            {assignees.slice(0, 3).map((member) => (
              <div
                key={member.id}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold text-white border-[1.5px]"
                style={{
                  backgroundColor: member.avatar_color,
                  borderColor: isDark ? "#1c2128" : "#ffffff",
                }}
                title={member.name}
              >
                {getInitials(member.name)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}