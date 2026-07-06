// ============================================
// Date formatting utilities
// Used by TaskCard (due dates) and TaskDetailPanel (activity timestamps)
// ============================================

// Returns true if the due date has passed
export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr + "T23:59:59");
  return due < new Date();
}

// Returns true if due within the next 2 days (but not overdue)
export function isDueSoon(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr + "T23:59:59");
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  const daysLeft = diff / (1000 * 60 * 60 * 24);
  return daysLeft >= 0 && daysLeft <= 2;
}

// Formats a date as "Jul 10" or "Jul 10, 2025" (if different year)
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  if (date.getFullYear() === now.getFullYear()) {
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Formats a timestamp as relative time: "5 minutes ago", "2 hours ago", etc.
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return formatDate(dateStr);
}

// Formats completion date: "Completed Jul 10"
export function formatCompletedDate(dateStr: string): string {
  return `Completed ${formatDate(dateStr)}`;
}