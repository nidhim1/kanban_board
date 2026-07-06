import { useState, useEffect, useCallback } from "react";

// Custom hook for dark/light mode toggle.
// Persists the preference in localStorage so it survives page refreshes. Falls back to the OS preference if no stored value exists.
export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("kanban_theme");
    if (stored) return stored === "dark";
    // Fall back to OS-level dark mode preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Apply the .dark class to <body> whenever the theme changes
  useEffect(() => {
    document.body.classList.toggle("dark", isDark);
    localStorage.setItem("kanban_theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggle = useCallback(() => setIsDark((prev) => !prev), []);

  return { isDark, toggle };
}