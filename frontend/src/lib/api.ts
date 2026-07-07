import type { Task, Label, TeamMember, Comment, ActivityEntry } from "../types";

// In development, Vite proxies /api to localhost:8080 (see vite.config.ts).
// In production, both frontend and backend share the same domain, so an empty string means "same origin".
const API_BASE = import.meta.env.VITE_API_URL || "";

// ============================================
// Token management
// ============================================
// We store tokens in localStorage so they survive page refreshes.

const TOKEN_KEY = "kanban_access_token";
const REFRESH_KEY = "kanban_refresh_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ============================================
// Token refresh
// ============================================
// JWTs expire after 1 hour (Supabase default). This function exchanges the refresh_token for new credentials.

async function refreshSession(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    const resp = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!resp.ok) {
      clearTokens();
      return null;
    }

    const data = await resp.json();
    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

// ============================================
// Authenticated fetch wrapper
// ============================================
// Every API call goes through this. It:
//   1. Attaches the JWT token
//   2. If the request fails with 401 (expired), tries refreshing
//   3. Retries the request with the new token

async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = getToken();

  if (!token) {
    token = await refreshSession();
    if (!token) throw new Error("No valid session");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  let resp = await fetch(url, { ...options, headers });

  // If 401 (token expired), try refreshing once
  if (resp.status === 401) {
    token = await refreshSession();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      resp = await fetch(url, { ...options, headers });
    } else {
      throw new Error("Session expired");
    }
  }

  return resp;
}

// ============================================
// Auth
// ============================================

export async function signInAnonymously(): Promise<{
  access_token: string;
  refresh_token: string;
  user: { id: string };
}> {
  // If we already have a token, verify it works before creating a new session
  const existing = getToken();
  if (existing) {
    try {
      const resp = await authFetch(`${API_BASE}/api/tasks`);
      if (resp.ok) {
        // Token is still valid — extract user ID from JWT payload
        const payload = JSON.parse(atob(existing.split(".")[1]));
        return {
          access_token: existing,
          refresh_token: localStorage.getItem(REFRESH_KEY) || "",
          user: { id: payload.sub },
        };
      }
    } catch {
      // Token invalid, fall through to create new session
    }
  }

  // Create a new anonymous session
  const resp = await fetch(`${API_BASE}/api/auth/anonymous`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!resp.ok) throw new Error("Failed to sign in anonymously");

  const data = await resp.json();
  setTokens(data.access_token, data.refresh_token);
  return data;
}

// Extract user ID from the stored JWT
export function getUserId(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub;
  } catch {
    return null;
  }
}

// ============================================
// Tasks
// ============================================

export async function fetchTasks(params?: {
  search?: string;
  priority?: string;
}): Promise<Task[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.priority) query.set("priority", params.priority);

  const url = `${API_BASE}/api/tasks${query.toString() ? "?" + query.toString() : ""}`;
  const resp = await authFetch(url);
  if (!resp.ok) throw new Error("Failed to fetch tasks");
  return resp.json();
}

export async function createTask(task: Partial<Task>): Promise<Task[]> {
  const resp = await authFetch(`${API_BASE}/api/tasks`, {
    method: "POST",
    body: JSON.stringify(task),
  });
  if (!resp.ok) throw new Error("Failed to create task");
  return resp.json();
}

export async function updateTask(
  id: string,
  updates: Partial<Task>
): Promise<Task[]> {
  const resp = await authFetch(`${API_BASE}/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!resp.ok) throw new Error("Failed to update task");
  return resp.json();
}

export async function deleteTask(id: string): Promise<void> {
  const resp = await authFetch(`${API_BASE}/api/tasks/${id}`, {
    method: "DELETE",
  });
  if (!resp.ok) throw new Error("Failed to delete task");
}

export async function reorderTasks(
  items: { id: string; status: string; position: number }[]
): Promise<void> {
  const resp = await authFetch(`${API_BASE}/api/tasks/reorder`, {
    method: "PUT",
    body: JSON.stringify(items),
  });
  if (!resp.ok) throw new Error("Failed to reorder tasks");
}

// ============================================
// Labels
// ============================================

export async function fetchLabels(): Promise<Label[]> {
  const resp = await authFetch(`${API_BASE}/api/labels`);
  if (!resp.ok) throw new Error("Failed to fetch labels");
  return resp.json();
}

export async function createLabel(label: Partial<Label>): Promise<Label[]> {
  const resp = await authFetch(`${API_BASE}/api/labels`, {
    method: "POST",
    body: JSON.stringify(label),
  });
  if (!resp.ok) throw new Error("Failed to create label");
  return resp.json();
}

export async function deleteLabel(id: string): Promise<void> {
  const resp = await authFetch(`${API_BASE}/api/labels/${id}`, {
    method: "DELETE",
  });
  if (!resp.ok) throw new Error("Failed to delete label");
}

export async function assignLabel(
  taskId: string,
  labelId: string
): Promise<void> {
  const resp = await authFetch(`${API_BASE}/api/task-labels`, {
    method: "POST",
    body: JSON.stringify({ task_id: taskId, label_id: labelId }),
  });
  if (!resp.ok) throw new Error("Failed to assign label");
}

export async function removeLabel(
  taskId: string,
  labelId: string
): Promise<void> {
  const resp = await authFetch(
    `${API_BASE}/api/task-labels/${taskId}/${labelId}`,
    { method: "DELETE" }
  );
  if (!resp.ok) throw new Error("Failed to remove label");
}

// ============================================
// Team Members
// ============================================

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const resp = await authFetch(`${API_BASE}/api/team`);
  if (!resp.ok) throw new Error("Failed to fetch team");
  return resp.json();
}

export async function createTeamMember(
  member: Partial<TeamMember>
): Promise<TeamMember[]> {
  const resp = await authFetch(`${API_BASE}/api/team`, {
    method: "POST",
    body: JSON.stringify(member),
  });
  if (!resp.ok) throw new Error("Failed to create team member");
  return resp.json();
}

export async function deleteTeamMember(id: string): Promise<void> {
  const resp = await authFetch(`${API_BASE}/api/team/${id}`, {
    method: "DELETE",
  });
  if (!resp.ok) throw new Error("Failed to delete team member");
}

export async function assignMember(
  taskId: string,
  memberId: string
): Promise<void> {
  const resp = await authFetch(`${API_BASE}/api/task-assignees`, {
    method: "POST",
    body: JSON.stringify({ task_id: taskId, member_id: memberId }),
  });
  if (!resp.ok) throw new Error("Failed to assign member");
}

export async function removeMember(
  taskId: string,
  memberId: string
): Promise<void> {
  const resp = await authFetch(
    `${API_BASE}/api/task-assignees/${taskId}/${memberId}`,
    { method: "DELETE" }
  );
  if (!resp.ok) throw new Error("Failed to remove member");
}

// ============================================
// Comments
// ============================================

export async function fetchComments(taskId: string): Promise<Comment[]> {
  const resp = await authFetch(`${API_BASE}/api/tasks/${taskId}/comments`);
  if (!resp.ok) throw new Error("Failed to fetch comments");
  return resp.json();
}

export async function createComment(
  taskId: string,
  content: string,
  userId: string,
  authorName: string
): Promise<Comment[]> {
  const resp = await authFetch(`${API_BASE}/api/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content, user_id: userId, author_name: authorName }),
  });
  if (!resp.ok) throw new Error("Failed to create comment");
  return resp.json();
}

// ============================================
// Activity
// ============================================

export async function fetchActivity(taskId: string): Promise<ActivityEntry[]> {
  const resp = await authFetch(`${API_BASE}/api/tasks/${taskId}/activity`);
  if (!resp.ok) throw new Error("Failed to fetch activity");
  return resp.json();
}