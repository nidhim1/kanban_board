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
  const cardBg = isDark ? "bg-board-card-dark" : "bg-board-card-light";
  const textPrimary = isDark ? "text-[#e8eaed]" : "text-[#1a1e24]";
  const textSecondary = isDark ? "text-[#8b8d90]" : "text-[#6b6e73]";

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
      className={`${cardBg} rounded-lg p-3 cursor-pointer 
        hover:ring-1 hover:ring-accent-mint/30 transition-all
        ${isDone ? "opacity-60" : ""}`}
    >
      {/* ---- Label pills ---- */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {labels.map((label) => (
            <span
              key={label.id}
              className="px-2 py-0.5 rounded text-2xs font-medium"
              style={{ backgroundColor: label.color, color: "#ffffff" }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* ---- Title (with checkmark + strikethrough for done tasks) ---- */}
      <div className="flex items-start gap-1.5 mb-1">
        {isDone && (
          <Check size={14} className="text-status-done mt-0.5 flex-shrink-0" />
        )}
        <h3
          className={`text-sm font-medium leading-snug ${textPrimary} 
            ${isDone ? "line-through" : ""}`}
        >
          {task.title}
        </h3>
      </div>

      {/* ---- Description (hidden for done tasks to keep them compact) ---- */}
      {task.description && !isDone && (
        <p
          className={`text-xs ${textSecondary} line-clamp-2 mb-2 leading-relaxed`}
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

      {/* ---- Bottom row: priority, due date, comments, assignees ---- */}
      {!isDone && (
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {/* Priority arrow icon */}
            <PriorityIcon size={13} style={{ color: priorityConfig.color }} />

            {/* Due date — red if overdue, amber if due soon */}
            {task.due_date && (
              <span
                className={`flex items-center gap-1 text-2xs ${
                  overdue
                    ? "text-priority-high font-medium"
                    : dueSoon
                      ? "text-priority-normal font-medium"
                      : textSecondary
                }`}
              >
                <Calendar size={11} />
                {formatDate(task.due_date)}
              </span>
            )}

            {/* Comment count */}
            {commentCount > 0 && (
              <span
                className={`flex items-center gap-1 text-2xs ${textSecondary}`}
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
                  className="w-6 h-6 rounded-full flex items-center justify-center text-2xs font-medium text-white border-2"
                  style={{
                    backgroundColor: member.avatar_color,
                    borderColor: isDark ? "#262b33" : "#ffffff",
                  }}
                  title={member.name}
                >
                  {getInitials(member.name)}
                </div>
              ))}
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
                className="w-5 h-5 rounded-full flex items-center justify-center text-2xs font-medium text-white border-2"
                style={{
                  backgroundColor: member.avatar_color,
                  borderColor: isDark ? "#262b33" : "#ffffff",
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