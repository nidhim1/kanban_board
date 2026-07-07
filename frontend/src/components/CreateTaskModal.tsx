import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { STATUS_LABELS, PRIORITY_CONFIG, LABEL_COLORS } from "../types";
import type { TaskStatus, Priority, Label } from "../types";

interface CreateTaskModalProps {
  isDark: boolean;
  defaultStatus: TaskStatus;  // Pre-selected based on which column's "+" was clicked
  labels: Label[];
  onClose: () => void;
  onCreate: (data: {
    title: string;
    description: string;
    priority: Priority;
    status: TaskStatus;
    due_date: string | null;
    label_ids: string[];
  }) => void;
  onCreateLabel: (name: string, color: string) => void;
}

export function CreateTaskModal({
  isDark,
  defaultStatus,
  labels,
  onClose,
  onCreate,
  onCreateLabel,
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

  // New label creation state
  const [showNewLabel, setShowNewLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].value);

  // Track label IDs we've already seen, so we can detect new ones
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

  // ============================================
  // Theme-aware styles
  // ============================================
  const bg = isDark ? "bg-board-card-dark" : "bg-white";
  const textPrimary = isDark ? "text-[#e8eaed]" : "text-[#1a1e24]";
  const textSecondary = isDark ? "text-[#8b8d90]" : "text-[#6b6e73]";
  const inputBg = isDark ? "bg-[#1e2228]" : "bg-[#f5f3ee]";
  const border = isDark ? "border-[#363a42]" : "border-[#e0dbd2]";

  // ============================================
  // Handlers
  // ============================================
  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      due_date: dueDate || null,
      label_ids: selectedLabelIds,
    });
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

  // Close modal on Escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={handleKeyDown}>
      {/* ---- Backdrop — click to close ---- */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* ---- Modal card ---- */}
      <div
        className={`relative ${bg} rounded-xl shadow-xl w-full max-w-md mx-4 animate-scale-in`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className={`text-lg font-semibold ${textPrimary}`}>
            Create task
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
          >
            <X size={18} className={textSecondary} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* ---- Title ---- */}
          <div>
            <label className={`block text-xs font-medium ${textSecondary} mb-1.5`}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Design the checkout flow"
              className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${textPrimary} text-sm outline-none focus:border-accent-mint transition-colors placeholder:text-[#8b8d90]`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim()) handleSubmit();
              }}
            />
          </div>

          {/* ---- Description ---- */}
          <div>
            <label className={`block text-xs font-medium ${textSecondary} mb-1.5`}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more detail about this task..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${textPrimary} text-sm outline-none focus:border-accent-mint transition-colors resize-none placeholder:text-[#8b8d90]`}
            />
          </div>

          {/* ---- Priority + Status (side by side) ---- */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium ${textSecondary} mb-1.5`}>
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
              <label className={`block text-xs font-medium ${textSecondary} mb-1.5`}>
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

          {/* ---- Due date + Labels (side by side) ---- */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium ${textSecondary} mb-1.5`}>
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
              <label className={`block text-xs font-medium ${textSecondary} mb-1.5`}>
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
                        className={`px-2 py-0.5 rounded text-2xs font-medium transition-all ${
                          selectedLabelIds.includes(label.id)
                            ? "ring-2 ring-accent-mint ring-offset-1"
                            : "opacity-70 hover:opacity-100"
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
                    className="text-2xs text-accent-mint hover:underline"
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
                    className={`w-full px-2 py-1.5 rounded border ${border} ${inputBg} ${textPrimary} text-xs outline-none focus:border-accent-mint`}
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
                        className={`w-5 h-5 rounded-full ${
                          newLabelColor === c.value
                            ? "ring-2 ring-accent-mint ring-offset-1"
                            : ""
                        }`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateLabel}
                      className="text-2xs text-accent-mint font-medium"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowNewLabel(false)}
                      className={`text-2xs ${textSecondary}`}
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
              disabled={!title.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-mint hover:bg-accent-mint-hover text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Create task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}