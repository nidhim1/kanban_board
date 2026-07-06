// ============================================
// Database model types. These mirror the Supabase table schemas exactly.
// ============================================

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type Priority = "low" | "normal" | "high";

export interface Label {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar_color: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

// Task includes embedded relations from PostgREST.
// When we GET /api/tasks, PostgREST nests related data:
//   task_labels → array of {label_id, labels: Label}
//   task_assignees → array of {member_id, team_members: TeamMember}
//   comments → array of {count: number}
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  position: number;
  user_id: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  task_labels?: { label_id: string; labels: Label }[];
  task_assignees?: { member_id: string; team_members: TeamMember }[];
  comments?: { count: number }[];
}

// ============================================
// UI configuration constants
// Used by components to render columns, priorities, etc.
// ============================================

export interface Column {
  id: TaskStatus;
  title: string;
  dotColor: string;
}

// The four Kanban columns in display order
export const COLUMNS: Column[] = [
  { id: "todo", title: "TO DO", dotColor: "#8b8d90" },
  { id: "in_progress", title: "IN PROGRESS", dotColor: "#378ADD" },
  { id: "in_review", title: "IN REVIEW", dotColor: "#7F77DD" },
  { id: "done", title: "DONE", dotColor: "#1D9E75" },
];

// Human-readable status names for dropdowns
export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
};

// Priority display config — color, background, and arrow direction
export const PRIORITY_CONFIG: Record <
  Priority,
  {
    label: string;
    color: string;
    bg: string;
    textColor: string;
    icon: "up" | "dash" | "down";
  }
> = {
  high: {
    label: "High",
    color: "#E24B4A",
    bg: "#FCEBEB",
    textColor: "#A32D2D",
    icon: "up",
  },
  normal: {
    label: "Normal",
    color: "#BA7517",
    bg: "#FAEEDA",
    textColor: "#633806",
    icon: "dash",
  },
  low: {
    label: "Low",
    color: "#1D9E75",
    bg: "#E1F5EE",
    textColor: "#085041",
    icon: "down",
  },
};

// Color options for creating new labels
export const LABEL_COLORS = [
  { name: "Blue", value: "#378ADD" },
  { name: "Red", value: "#E24B4A" },
  { name: "Amber", value: "#BA7517" },
  { name: "Green", value: "#1D9E75" },
  { name: "Purple", value: "#7F77DD" },
  { name: "Coral", value: "#D85A30" },
  { name: "Pink", value: "#D4537E" },
  { name: "Teal", value: "#0F6E56" },
];

// Color options for team member avatars
export const MEMBER_COLORS = [
  "#378ADD",
  "#E24B4A",
  "#BA7517",
  "#1D9E75",
  "#7F77DD",
  "#D85A30",
  "#D4537E",
  "#0F6E56",
];