import { useState, useEffect, useRef } from "react";
import {
  X,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar,
  Users,
  MessageSquare,
  Activity,
  Plus,
  Trash2,
  MoveRight,
  UserPlus,
  Send,
  Tag,
} from "lucide-react";
import * as api from "../lib/api";
import { formatRelativeTime } from "../lib/dates";
import {
  STATUS_LABELS,
  PRIORITY_CONFIG,
  LABEL_COLORS,
  MEMBER_COLORS,
} from "../types";
import type {
  Task,
  Label,
  TeamMember,
  Comment,
  ActivityEntry,
  TaskStatus,
  Priority,
} from "../types";

// ============================================
// Helper: derive initials from name
// ============================================
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ============================================
// Hook: close dropdown when clicking outside
// ============================================
function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void
) {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, onClose]);
}

// ============================================
// Props
// ============================================
interface TaskDetailPanelProps {
  task: Task;
  isDark: boolean;
  labels: Label[];
  members: TeamMember[];
  userId: string | null;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onRefresh: () => void;
  onCreateLabel: (name: string, color: string) => void;
  onCreateMember: (name: string, color: string) => void;
}

export function TaskDetailPanel({
  task,
  isDark,
  labels,
  members,
  userId,
  onClose,
  onUpdate,
  onDelete,
  onRefresh,
  onCreateLabel,
  onCreateMember,
}: TaskDetailPanelProps) {
  // ============================================
  // Local state for panel-specific data
  // ============================================
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);

  // Dropdown toggles
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  // Inline creation forms
  const [showNewLabel, setShowNewLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].value);
  const [showNewMember, setShowNewMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");

  const commentInputRef = useRef<HTMLInputElement>(null);

  // Refs for click-outside handling
  const labelDropdownRef = useRef<HTMLDivElement>(null);
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(labelDropdownRef, () => {
    setShowLabelDropdown(false);
    setShowNewLabel(false);
  });
  useClickOutside(memberDropdownRef, () => {
    setShowMemberDropdown(false);
    setShowNewMember(false);
  });

  // ============================================
  // Theme-aware styles
  // ============================================
  const bg = isDark ? "bg-[#161b22]" : "bg-white";
  const textPrimary = isDark ? "text-[#e8eaed]" : "text-[#1a1e24]";
  const textSecondary = isDark ? "text-[#7a8394]" : "text-[#6b7280]";
  const border = isDark ? "border-[#2a2f38]" : "border-[#e8eaed]";
  const inputBg = isDark ? "bg-[#0d1117]" : "bg-[#f4f5f7]";
  const descBg = isDark ? "bg-[#0d1117]" : "bg-[#f8f9fb]";

  const selectStyle = isDark
    ? "bg-[#1c2128] text-[#e8eaed] border border-[#2a2f38] rounded px-2 py-1"
    : "bg-white text-[#1a1e24] border border-[#e8eaed] rounded px-2 py-1";

  // ============================================
  // Extract nested relations from PostgREST
  // ============================================
  const taskLabels =
    task.task_labels?.map((tl) => tl.labels).filter(Boolean) || [];
  const taskAssignees =
    task.task_assignees?.map((ta) => ta.team_members).filter(Boolean) || [];
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const PriorityIcon =
    task.priority === "high"
      ? ArrowUp
      : task.priority === "low"
        ? ArrowDown
        : Minus;

  // ============================================
  // Load comments and activity when panel opens
  // ============================================
  useEffect(() => {
    async function load() {
      setIsLoadingDetail(true);
      try {
        const [commentsData, activityData] = await Promise.all([
          api.fetchComments(task.id),
          api.fetchActivity(task.id),
        ]);
        setComments(commentsData);
        setActivity(activityData);
      } catch (err) {
        console.error("Failed to load task details:", err);
      } finally {
        setIsLoadingDetail(false);
      }
    }
    load();
  }, [task.id]);

  // ============================================
  // Comment handler
  // ============================================
  const handleAddComment = async () => {
    if (!newComment.trim() || !userId) return;
    try {
      await api.createComment(task.id, newComment.trim(), userId, "Guest");
      // Refresh comments and activity after posting
      const [updatedComments, updatedActivity] = await Promise.all([
        api.fetchComments(task.id),
        api.fetchActivity(task.id),
      ]);
      setComments(updatedComments);
      setActivity(updatedActivity);
      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  // ============================================
  // Label assign/remove
  // ============================================
  const handleToggleLabel = async (labelId: string) => {
    try {
      const alreadyAssigned = taskLabels.some((l) => l.id === labelId);
      if (alreadyAssigned) {
        await api.removeLabel(task.id, labelId);
      } else {
        await api.assignLabel(task.id, labelId);
      }
      onRefresh();
      setShowLabelDropdown(false);
    } catch (err) {
      console.error("Failed to toggle label:", err);
    }
  };

  // ============================================
  // Member assign/remove
  // ============================================
  const handleToggleMember = async (memberId: string) => {
    try {
      const alreadyAssigned = taskAssignees.some((m) => m.id === memberId);
      if (alreadyAssigned) {
        await api.removeMember(task.id, memberId);
      } else {
        await api.assignMember(task.id, memberId);
      }
      onRefresh();
      setShowMemberDropdown(false);
    } catch (err) {
      console.error("Failed to toggle member:", err);
    }
  };

  // ============================================
  // Inline creation handlers
  // ============================================
  const handleCreateNewLabel = async () => {
    if (!newLabelName.trim()) return;
    await onCreateLabel(newLabelName.trim(), newLabelColor);
    setNewLabelName("");
    setShowNewLabel(false);
  };

  const handleCreateNewMember = async () => {
    if (!newMemberName.trim()) return;
    const color = MEMBER_COLORS[members.length % MEMBER_COLORS.length];
    await onCreateMember(newMemberName.trim(), color);
    setNewMemberName("");
    setShowNewMember(false);

    // After the parent refreshes members, find the newly created member and assign them to this task automatically.
    // Small delay to let the parent state update.
    setTimeout(async () => {
      try {
        const updatedMembers = await api.fetchTeamMembers();
        const newMember = updatedMembers.find(
          (m) => !members.some((existing) => existing.id === m.id)
        );
        if (newMember) {
          await api.assignMember(task.id, newMember.id);
          onRefresh();
        }
      } catch (err) {
        console.error("Failed to auto-assign new member:", err);
      }
    }, 300);
  };

  // ============================================
  // Activity display helpers
  // ============================================
  function getActivityIcon(action: string) {
    switch (action) {
      case "created":
        return <Plus size={12} className="text-status-done" />;
      case "status_changed":
        return <MoveRight size={12} className="text-status-progress" />;
      case "commented":
        return <MessageSquare size={12} className="text-priority-normal" />;
      case "priority_changed":
        return <ArrowUp size={12} className="text-priority-high" />;
      default:
        return <Activity size={12} className={textSecondary} />;
    }
  }

  function getActivityText(entry: ActivityEntry): string {
    const details = entry.details as Record<string, string>;
    switch (entry.action) {
      case "created":
        return "created this task";
      case "status_changed":
        return `moved to ${STATUS_LABELS[details.new_status as TaskStatus] || details.new_status}`;
      case "commented":
        return "commented on this task";
      case "priority_changed":
        return `changed priority to ${PRIORITY_CONFIG[details.new_priority as Priority]?.label || details.new_priority}`;
      default:
        return entry.action;
    }
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Slide-over panel */}
      <div
        className={`relative ${bg} w-full max-w-md shadow-xl animate-slide-in overflow-y-auto custom-scrollbar`}
      >
        {/* ---- Header: title + close ---- */}
        <div
          className={`sticky top-0 ${bg} z-10 px-5 pt-4 pb-3 border-b ${border}`}
        >
          <div className="flex items-start justify-between">
            <h2
              className={`text-base font-semibold ${textPrimary} pr-4 leading-snug`}
            >
              {task.title}
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 hover:opacity-70"
            >
              <X size={16} className={textSecondary} />
            </button>
          </div>

          {/* ---- Labels under title ---- */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2" ref={labelDropdownRef}>
            {taskLabels.map((label) => (
              <span
                key={label.id}
                className="px-2 py-0.5 rounded text-2xs font-medium"
                style={{ backgroundColor: label.color, color: "#fff" }}
              >
                {label.name}
              </span>
            ))}
            <button
              onClick={() => setShowLabelDropdown(!showLabelDropdown)}
              className={`px-1.5 py-0.5 rounded text-2xs ${textSecondary} border ${border} hover:border-accent-mint transition-colors`}
            >
              <Tag size={10} />
              {taskLabels.length === 0 ? "Add label" : "+"}
            </button>

            {/* Label dropdown */}
            {showLabelDropdown && (
              <div
                className={`absolute top-full left-0 mt-1 ${bg} border ${border} rounded-lg shadow-lg p-2 z-20 min-w-[180px]`}
              >
                {labels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => handleToggleLabel(label.id)}
                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs ${textPrimary} hover:opacity-80`}
                  >
                    <span
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                    {taskLabels.some((l) => l.id === label.id) && (
                      <span className="ml-auto text-accent-mint">✓</span>
                    )}
                  </button>
                ))}
                {!showNewLabel ? (
                  <button
                    onClick={() => setShowNewLabel(true)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-accent-mint"
                  >
                    <Plus size={12} /> New label
                  </button>
                ) : (
                  <div className="px-2 py-1.5 space-y-1.5">
                    <input
                      type="text"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="Label name"
                      className={`w-full px-2 py-1 rounded border ${border} ${inputBg} ${textPrimary} text-xs outline-none`}
                      autoFocus
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleCreateNewLabel()
                      }
                    />
                    <div className="flex gap-1">
                      {LABEL_COLORS.slice(0, 6).map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setNewLabelColor(c.value)}
                          className={`w-4 h-4 rounded-full ${
                            newLabelColor === c.value
                              ? "ring-2 ring-accent-mint"
                              : ""
                          }`}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={handleCreateNewLabel}
                      className="text-2xs text-accent-mint font-medium"
                    >
                      Create
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ---- Panel body ---- */}
        <div className="px-5 py-4 space-y-5">
          {/* ---- Details section ---- */}
          <div>
            <h3
              className={`text-xs font-semibold tracking-wide uppercase ${textSecondary} mb-3`}
            >
              Details
            </h3>
            <div className="space-y-2.5">
              {/* Priority — editable dropdown */}
              <div className="flex items-center gap-3">
                <PriorityIcon
                  size={14}
                  style={{ color: priorityConfig.color }}
                />
                <select
                  value={task.priority}
                  onChange={(e) =>
                    onUpdate({ priority: e.target.value as Priority })
                  }
                  className={`text-sm outline-none cursor-pointer ${selectStyle}`}
                >
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label} priority
                    </option>
                  ))}
                </select>
              </div>

              {/* Status — editable dropdown */}
              <div className="flex items-center gap-3">
                <MoveRight size={14} className={textSecondary} />
                <select
                  value={task.status}
                  onChange={(e) =>
                    onUpdate({ status: e.target.value as TaskStatus })
                  }
                  className={`text-sm outline-none cursor-pointer ${selectStyle}`}
                >
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due date — editable */}
              <div className="flex items-center gap-3">
                <Calendar size={14} className={textSecondary} />
                <input
                  type="date"
                  value={task.due_date || ""}
                  onChange={(e) =>
                    onUpdate({ due_date: e.target.value || null })
                  }
                  className={`text-sm outline-none cursor-pointer ${selectStyle}`}
                />
              </div>

              {/* Assignees */}
              <div ref={memberDropdownRef} className="relative">
                <div className="flex items-start gap-3">
                  <UserPlus size={14} className={`${textSecondary} mt-0.5`} />
                  <div className="flex-1">
                    {/* Always show assigned members */}
                    {taskAssignees.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {taskAssignees.map((member) => (
                          <div key={member.id} className="flex items-center gap-1.5">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-2xs font-medium text-white"
                              style={{ backgroundColor: member.avatar_color }}
                            >
                              {getInitials(member.name)}
                            </div>
                            <span className={`text-xs ${textPrimary}`}>{member.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Single button to open dropdown */}
                    <button
                      onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                      className={`flex items-center gap-1.5 text-xs ${textSecondary} hover:text-accent-mint transition-colors`}
                    >
                      <Plus size={11} />
                      {taskAssignees.length === 0 ? "Add assignee" : "Manage assignees"}
                    </button>

                    {/* Dropdown */}
                    {showMemberDropdown && (
                      <div className={`absolute left-7 mt-1 ${bg} border ${border} rounded-lg shadow-lg p-2 z-20 min-w-[180px]`}>
                        {members.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => handleToggleMember(member.id)}
                            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs ${textPrimary} hover:opacity-80`}
                          >
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-2xs font-medium text-white"
                              style={{ backgroundColor: member.avatar_color }}
                            >
                              {getInitials(member.name)}
                            </span>
                            {member.name}
                            {taskAssignees.some((a) => a.id === member.id) && (
                              <span className="ml-auto text-accent-mint">✓</span>
                            )}
                          </button>
                        ))}
                        {!showNewMember ? (
                          <button
                            onClick={() => setShowNewMember(true)}
                            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-accent-mint"
                          >
                            <UserPlus size={12} /> Add member
                          </button>
                        ) : (
                          <div className="px-2 py-1.5">
                            <input
                              type="text"
                              value={newMemberName}
                              onChange={(e) => setNewMemberName(e.target.value)}
                              placeholder="Name"
                              className={`w-full px-2 py-1 rounded border ${border} ${inputBg} ${textPrimary} text-xs outline-none mb-1`}
                              autoFocus
                              onKeyDown={(e) => e.key === "Enter" && handleCreateNewMember()}
                            />
                            <button onClick={handleCreateNewMember} className="text-2xs text-accent-mint font-medium">
                              Add
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---- Description — editable ---- */}
          <div>
            <h3
              className={`text-xs font-semibold tracking-wide uppercase ${textSecondary} mb-2`}
            >
              Description
            </h3>
            <textarea
              value={task.description || ""}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Add a description..."
              rows={3}
              className={`w-full px-3 py-2.5 rounded-lg ${descBg} border ${border} ${textPrimary} text-sm outline-none focus:border-accent-mint resize-none leading-relaxed`}
            />
          </div>

          {/* Activity and comments in proper order */}
          <div>
            <h3
              className={`text-xs font-semibold tracking-wide uppercase ${textSecondary} mb-3`}
            >
              Activity
            </h3>
            {isLoadingDetail ? (
              <p className={`text-xs ${textSecondary}`}>Loading...</p>
            ) : activity.length === 0 && comments.length === 0 ? (
              <p className={`text-xs ${textSecondary}`}>No activity yet</p>
            ) : (
              <div className="space-y-3">
                {/* Merge activity and comments into one timeline, sorted newest first */}
                {[
                  ...activity.map((a) => ({
                    type: "activity" as const,
                    data: a,
                    time: new Date(a.created_at).getTime(),
                  })),
                  ...comments.map((c) => ({
                    type: "comment" as const,
                    data: c,
                    time: new Date(c.created_at).getTime(),
                  })),
                ]
                  .sort((a, b) => b.time - a.time)
                  .map((item) => {
                    if (item.type === "activity") {
                      const entry = item.data as ActivityEntry;
                      return (
                        <div
                          key={`a-${entry.id}`}
                          className="flex items-start gap-2.5"
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isDark ? "bg-[#1c2128]" : "bg-[#f0f2f5]"
                            }`}
                          >
                            {getActivityIcon(entry.action)}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-xs ${textPrimary} leading-relaxed`}
                            >
                              <span className="font-medium">Guest</span>{" "}
                              {getActivityText(entry)}
                            </p>
                            <p
                              className={`text-[10px] ${textSecondary} mt-0.5`}
                            >
                              {formatRelativeTime(entry.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    } else {
                      const comment = item.data as Comment;
                      return (
                        <div
                          key={`c-${comment.id}`}
                          className="flex items-start gap-2.5"
                        >
                          <div className="w-6 h-6 rounded-full bg-accent-mint flex items-center justify-center flex-shrink-0">
                            <span className="text-2xs font-medium text-white">
                              {comment.author_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-medium ${textPrimary}`}
                              >
                                {comment.author_name}
                              </span>
                              <span
                                className={`text-[10px] ${textSecondary}`}
                              >
                                {formatRelativeTime(comment.created_at)}
                              </span>
                            </div>
                            <p
                              className={`text-xs ${textPrimary} leading-relaxed ${descBg} rounded px-2 py-1.5 mt-1`}
                            >
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  })}
              </div>
            )}
          </div>
        </div>

        {/* ---- Sticky bottom: comment input + delete ---- */}
        <div
          className={`sticky bottom-0 ${bg} border-t ${border} px-5 py-3`}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-accent-mint flex items-center justify-center flex-shrink-0">
              <span className="text-2xs font-medium text-white">G</span>
            </div>
            <div className="flex-1 relative">
              <input
                ref={commentInputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Write a comment..."
                className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${textPrimary} text-xs outline-none focus:border-accent-mint pr-8`}
              />
              {newComment.trim() && (
                <button
                  onClick={handleAddComment}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-accent-mint"
                >
                  <Send size={14} />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 mt-3 text-xs text-priority-high hover:underline"
          >
            <Trash2 size={12} />
            Delete task
          </button>
        </div>
      </div>
    </div>
  );
}