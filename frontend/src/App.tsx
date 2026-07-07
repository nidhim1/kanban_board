import { useState, useEffect, useCallback } from "react";
import { useTheme } from "./hooks/useTheme";
import { Header } from "./components/Header";
import { Board } from "./components/Board";
import { CreateTaskModal } from "./components/CreateTaskModal";
import { TaskDetailPanel } from "./components/TaskDetailPanel";
import * as api from "./lib/api";
import type { Task, Label, TeamMember, TaskStatus, Priority } from "./types";

export default function App() {
  const { isDark, toggle: toggleTheme } = useTheme();

  // ============================================
  // Auth state
  // ============================================
  const [isAuthed, setIsAuthed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Data state
  // ============================================
  const [tasks, setTasks] = useState<Task[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);

  // ============================================
  // UI state
  // ============================================
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createInStatus, setCreateInStatus] = useState<TaskStatus>("todo");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Keep the detail panel in sync with the latest task data. When tasks are refreshed (after update/reorder), the panel should show the fresh data, not the stale snapshot.
  const currentTask = selectedTask
    ? tasks.find((t) => t.id === selectedTask.id) || null
    : null;

  // ============================================
  // Initialize: create anonymous session on first load
  // ============================================
  useEffect(() => {
    async function init() {
      try {
        const session = await api.signInAnonymously();
        setUserId(session.user.id);
        setIsAuthed(true);
      } catch (err) {
        setError("Failed to initialize session. Please refresh.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // ============================================
  // Load all data after auth succeeds
  // ============================================
  const loadData = useCallback(async () => {
    if (!isAuthed) return;
    try {
      const [tasksData, labelsData, membersData] = await Promise.all([
        api.fetchTasks(),
        api.fetchLabels(),
        api.fetchTeamMembers(),
      ]);
      setTasks(tasksData);
      setLabels(labelsData);
      setMembers(membersData);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load board data.");
    }
  }, [isAuthed]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // Task creation
  // ============================================
  const handleCreateTask = async (data: {
    title: string;
    description: string;
    priority: Priority;
    status: TaskStatus;
    due_date: string | null;
    label_ids: string[];
  }) => {
    if (!userId) return;
    try {
      // Calculate position: put new task at the bottom of its column
      const maxPos = tasks
        .filter((t) => t.status === data.status)
        .reduce((max, t) => Math.max(max, t.position), -1);

      const created = await api.createTask({
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date,
        position: maxPos + 1,
        user_id: userId,
      });

      // Assign selected labels to the new task
      if (created.length > 0) {
        for (const labelId of data.label_ids) {
          await api.assignLabel(created[0].id, labelId);
        }
      }

      // Refresh all data and close the modal
      await loadData();
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  // ============================================
  // Label creation (used by both modal and detail panel later)
  // ============================================
  const handleCreateLabel = async (name: string, color: string) => {
    if (!userId) return;
    try {
      await api.createLabel({ name, color, user_id: userId });
      const updated = await api.fetchLabels();
      setLabels(updated);
    } catch (err) {
      console.error("Failed to create label:", err);
    }
  };

  // ============================================
  // Task update and delete
  // ============================================
  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      await api.updateTask(id, updates);
      await loadData();
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setSelectedTask(null);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  // ============================================
  // Member creation
  // ============================================
  const handleCreateMember = async (name: string, color: string) => {
    if (!userId) return;
    try {
      await api.createTeamMember({ name, avatar_color: color, user_id: userId });
      const updated = await api.fetchTeamMembers();
      setMembers(updated);
    } catch (err) {
      console.error("Failed to create member:", err);
    }
  };

  // ============================================
  // Filter logic
  // ============================================
  // Tasks are filtered client-side for instant feedback. The full dataset is always in memory - we just hide non-matching cards.

  const filteredTasks = tasks.filter((task) => {
    // Search filter — match title or description
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    // No active filters means show everything
    if (activeFilters.length === 0) return true;

    // Check if task matches any active filter
    for (const filter of activeFilters) {
      if (filter === "high" && task.priority === "high") return true;

      // Check label filters
      const taskLabelNames =
        task.task_labels?.map((tl) => tl.labels?.name?.toLowerCase()) || [];
      if (taskLabelNames.includes(filter.toLowerCase())) return true;
    }

    return false;
  });

  // ============================================
  // Computed stats for the header
  // ============================================
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === "done") return false;
    return new Date(t.due_date + "T23:59:59") < new Date();
  }).length;
  const dueTodayTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === "done") return false;
    const today = new Date().toISOString().split("T")[0];
    return t.due_date === today;
  }).length;

  // ============================================
  // Loading and error states
  // ============================================
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-board-bg-light">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent-mint/10 mb-4">
            <svg
              className="w-6 h-6 text-accent-mint animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="60"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent-mint text-white rounded-lg hover:bg-accent-mint-hover"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // Main render
  // ============================================
  return (
    <div
      className={`min-h-screen ${isDark ? "bg-board-bg-dark" : "bg-board-bg-light"}`}
    >
      <Header
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onNewTask={() => {
          setCreateInStatus("todo");
          setShowCreateModal(true);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalTasks={totalTasks}
        doneTasks={doneTasks}
        overdueTasks={overdueTasks}
        dueTodayTasks={dueTodayTasks}
        memberCount={members.length}
        labels={labels}
        activeFilters={activeFilters}
        onToggleFilter={(filter) => {
          setActiveFilters((prev) =>
            prev.includes(filter)
              ? prev.filter((f) => f !== filter)
              : [...prev, filter]
          );
        }}
        onClearFilters={() => setActiveFilters([])}
      />

      <Board
        tasks={filteredTasks}
        isDark={isDark}
        onOpenCreate={(status) => {
          setCreateInStatus(status);
          setShowCreateModal(true);
        }}
        onSelectTask={(task) => {
          setSelectedTask(task);
        }}
        onReorder={async (items) => {
          // Optimistic update — move cards instantly in the UI
          setTasks((prev) => {
            const updated = [...prev];
            for (const item of items) {
              const idx = updated.findIndex((t) => t.id === item.id);
              if (idx !== -1) {
                updated[idx] = {
                  ...updated[idx],
                  status: item.status as TaskStatus,
                  position: item.position,
                };
              }
            }
            return updated;
          });

          // Then persist to the backend
          try {
            await api.reorderTasks(items);
            await loadData(); // Refresh to get updated completed_at, etc.
          } catch (err) {
            console.error("Failed to reorder:", err);
            await loadData(); // Revert on failure
          }
        }}
      />

      {showCreateModal && (
        <CreateTaskModal
          isDark={isDark}
          defaultStatus={createInStatus}
          labels={labels}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTask}
          onCreateLabel={handleCreateLabel}
        />
      )}

      {currentTask && (
        <TaskDetailPanel
          task={currentTask}
          isDark={isDark}
          labels={labels}
          members={members}
          userId={userId}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updates) => handleUpdateTask(currentTask.id, updates)}
          onDelete={() => handleDeleteTask(currentTask.id)}
          onRefresh={loadData}
          onCreateLabel={handleCreateLabel}
          onCreateMember={handleCreateMember}
        />
      )}
    </div>
  );
}