import { createContext, useContext } from "react";
import { useAiToolsState } from "../hooks/useAiToolsState.js";

const ToolsContext = createContext(null);

export function ToolsProvider({ children }) {
  const value = useAiToolsState();
  return <ToolsContext.Provider value={value}>{children}</ToolsContext.Provider>;
}

export function useTools() {
  const ctx = useContext(ToolsContext);
  if (!ctx) throw new Error("useTools must be used within ToolsProvider");
  return ctx;
}
