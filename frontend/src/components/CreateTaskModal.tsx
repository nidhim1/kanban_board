import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { STATUS_LABELS, PRIORITY_CONFIG, LABEL_COLORS, MEMBER_COLORS } from "../types";
import type { TaskStatus, Priority, Label, TeamMember } from "../types";

interface CreateTaskModalProps {
  isDark: boolean;
  defaultStatus: TaskStatus;  // Pre-selected based on which column's "+" was clicked
  labels: Label[];
  members: TeamMember[];
  onClose: () => void;
  onCreate: (data: {
    title: string;
    description: string;
    priority: Priority;
    status: TaskStatus;
    due_date: string | null;
    label_ids: string[];
    member_ids: string[];  
  }) => void;
  onCreateLabel: (name: string, color: string) => Promise<string | null>;
  onCreateMember: (name: string, color: string) => Promise<string | null>;
}

function getInitials(name: string): string {
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  }

export function CreateTaskModal({
  isDark,
  defaultStatus,
  labels,
  members,
  onClose,
  onCreate,
  onCreateLabel,
  onCreateMember,
}: CreateTaskModalProps) {
  // ============================================
  // Form state
  // ============================================
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [dueDate, setDueDate] = useState("");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New label creation state
  const [showNewLabel, setShowNewLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].value);

  // Member selection state
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [showNewMember, setShowNewMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");

  // Auto-select newly created labels
  const [knownLabelIds, setKnownLabelIds] = useState<Set<string>>(
    () => new Set(labels.map((l) => l.id))
  );

  // When the labels prop changes (after creating a new label), auto-select any label we haven't seen before
  useEffect(() => {
    const newLabels = labels.filter((l) => !knownLabelIds.has(l.id));
    if (newLabels.length > 0) {
      setSelectedLabelIds((prev) => [
        ...prev,
        ...newLabels.map((l) => l.id),
      ]);
      setKnownLabelIds(new Set(labels.map((l) => l.id)));
    }
  }, [labels]);

  // Refined palette tokens
  const bg = isDark ? "bg-[#1c2128]" : "bg-white";
  const textPrimary = isDark ? "text-[#e8eaed]" : "text-[#1a1e24]";
  const textSecondary = isDark ? "text-[#7a8394]" : "text-[#6b7280]";
  const inputBg = isDark ? "bg-[#0d1117]" : "bg-[#f4f5f7]";
  const border = isDark ? "border-[#2a2f38]" : "border-[#e8eaed]";

  // ============================================
  // Handlers
  // ============================================
  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      let finalLabelIds = [...selectedLabelIds];
      let finalMemberIds = [...selectedMemberIds];

      // If user has a new label in progress, create it and include it
      if (showNewLabel && newLabelName.trim()) {
        const newLabelId = await onCreateLabel(newLabelName.trim(), newLabelColor);
        if (newLabelId) {
          finalLabelIds.push(newLabelId);
        }
      }

      // If user has a new member in progress, create them and include them
      if (showNewMember && newMemberName.trim()) {
        const color = MEMBER_COLORS[members.length % MEMBER_COLORS.length];
        const newMemberId = await onCreateMember(newMemberName.trim(), color);
        if (newMemberId) {
          finalMemberIds.push(newMemberId);
        }
      }

      onCreate({
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        due_date: dueDate || null,
        label_ids: finalLabelIds,
        member_ids: finalMemberIds,
      });
    } catch (err) {
      console.error("Failed to create task:", err);
      setIsSubmitting(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    await onCreateLabel(newLabelName.trim(), newLabelColor);
    setNewLabelName("");
    setShowNewLabel(false);
  };

  const toggleLabel = (id: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleCreateNewMember = async () => {
    if (!newMemberName.trim()) return;
    const color = MEMBER_COLORS[members.length % MEMBER_COLORS.length];
    const newId = await onCreateMember(newMemberName.trim(), color);
    if (newId) {
      setSelectedMemberIds((prev) => [...prev, newId]);
    }
    setNewMemberName("");
    setShowNewMember(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      <div className={`relative ${bg} rounded-xl shadow-2xl w-full max-w-md mx-4 animate-scale-in border ${border}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className={`text-base font-semibold ${textPrimary}`}>
            Create task
          </h2>
          <button
            onClick={onClose}
            className={`w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity ${isDark ? "hover:bg-[#2a2f38]" : "hover:bg-[#f4f5f7]"}`}
          >
            <X size={18} className={textSecondary} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* ---- Title ---- */}
          <div>
            <label className={`block text-[11px] font-medium ${textSecondary} mb-1.5 uppercase tracking-wide`}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${textPrimary} text-sm outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20 transition-all placeholder:text-[#89ca3af] dark:placeholder:text-[#4a556]`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim()) handleSubmit();
              }}
            />
          </div>

          {/* ---- Description ---- */}
          <div>
            <label className={`block text-[11px] font-medium ${textSecondary} mb-1.5 uppercase tracking-wide`}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more detail ..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${textPrimary} text-sm outline-none focus:border-accent-mint transition-colors resize-none placeholder:text-[#8b8d90]`}
            />
          </div>

          {/* ---- Priority + Status ---- */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-[11px] font-medium ${textSecondary} mb-1.5 uppercase tracking-wide`}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${textPrimary} text-sm outline-none focus:border-accent-mint`}
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-medium ${textSecondary} mb-1.5 uppercase tracking-wide`}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${textPrimary} text-sm outline-none focus:border-accent-mint`}
              >
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ---- Assignees ---- */}
          <div>
            <label className={`block text-[11px] font-medium ${textSecondary} mb-1.5 uppercase tracking-wide`}>
              Assignees
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] border transition-all ${
                    selectedMemberIds.includes(member.id)
                      ? "border-accent-mint bg-accent-mint/10 text-accent-mint"
                      : `${isDark ? "border-[#2a2f38] text-[#7a8394]" : "border-[#e8eaed] text-[#6b7280]"} opacity-60 hover:opacity-100`
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-semibold text-white"
                    style={{ backgroundColor: member.avatar_color }}
                  >
                    {getInitials(member.name)}
                  </span>
                  {member.name}
                </button>
              ))}
              {!showNewMember ? (
                <button
                  onClick={() => setShowNewMember(true)}
                  className="text-[11px] text-accent-mint hover:text-accent-mint-hover transition-colors font-medium"
                >
                  + Add member
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Name"
                    className={`px-2 py-1 rounded-lg border ${border} ${inputBg} ${textPrimary} text-xs outline-none focus:border-accent-mint w-24`}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleCreateNewMember()}
                  />
                  <button onClick={handleCreateNewMember} className="text-[11px] text-accent-mint font-medium">Add</button>
                  <button onClick={() => setShowNewMember(false)} className={`text-[11px] ${textSecondary}`}>✕</button>
                </div>
              )}
            </div>
          </div>

          {/* ---- Due date + Labels ---- */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-[11px] font-medium ${textSecondary} mb-1.5 uppercase tracking-wide`}>
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${textPrimary} text-sm outline-none focus:border-accent-mint`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-medium ${textSecondary} mb-1.5 uppercase tracking-wide`}>
                Label
              </label>

              {!showNewLabel ? (
                <div className="space-y-1.5">
                  {/* Existing labels — click to toggle selection */}
                  <div className="flex flex-wrap gap-1">
                    {labels.map((label) => (
                      <button
                        key={label.id}
                        onClick={() => toggleLabel(label.id)}
                        className={`px-2 py-[2px] rounded-full text-[10px] font-semibold transition-all ${
                          selectedLabelIds.includes(label.id)
                            ? "ring-2 ring-accent-mint ring-offset-1"
                            : "opacity-60 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: label.color, color: "#fff" }}
                      >
                        {label.name}
                      </button>
                    ))}
                  </div>
                  {/* Create new label link */}
                  <button
                    onClick={() => setShowNewLabel(true)}
                    className="text-[11px] text-accent-mint hover:text-accent-mint-hover transition-colors font-medium"
                  >
                    + New label
                  </button>
                </div>
              ) : (
                // ---- Inline label creation form ----
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="Label name"
                    className={`w-full px-2 py-1.5 rounded-lg border ${border} ${inputBg} ${textPrimary} text-xs outline-none focus:border-accent-mint`}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateLabel();
                    }}
                  />
                  {/* Color picker — row of colored circles */}
                  <div className="flex gap-1">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setNewLabelColor(c.value)}
                        className={`w-5 h-5 rounded-full transition-all ${
                          newLabelColor === c.value
                            ? "ring-2 ring-accent-mint ring-offset-1 scale-110"
                            : ""
                        }`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateLabel}
                      className="text-[11px] text-accent-mint font-medium"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowNewLabel(false)}
                      className={`text-[11px] ${textSecondary}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ---- Action buttons ---- */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm ${textSecondary} hover:opacity-70 transition-opacity`}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-mint hover:bg-accent-mint-hover text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm shadow-accent-mint/20 min-w-[110px]"
            >
              {isSubmitting ? "Creating..." : "Create task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}