import { useState, useEffect } from "react";
import { useTheme } from "./hooks/useTheme";
import * as api from "./lib/api";

export default function App() {
  const { isDark, toggle } = useTheme();
  const [status, setStatus] = useState("Loading...");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const session = await api.signInAnonymously();
        setUserId(session.user.id);
        setStatus("Connected to backend!");
      } catch (err) {
        setStatus("Failed to connect. Is the Go server running?");
        console.error(err);
      }
    }
    init();
  }, []);

  return (
    <div
      className={`min-h-screen flex items-center justify-center ${
        isDark ? "bg-board-bg-dark" : "bg-board-bg-light"
      }`}
    >
      <div className="text-center space-y-4">
        <h1
          className={`text-2xl font-semibold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Sprint Board
        </h1>
        <p className={isDark ? "text-gray-400" : "text-gray-600"}>{status}</p>
        {userId && (
          <p className="text-xs text-accent-mint">User: {userId}</p>
        )}
        <button
          onClick={toggle}
          className="px-4 py-2 rounded-lg bg-accent-mint hover:bg-accent-mint-hover text-white text-sm font-medium"
        >
          Toggle {isDark ? "Light" : "Dark"} Mode
        </button>
      </div>
    </div>
  );
}