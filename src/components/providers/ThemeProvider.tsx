"use client";

import { createContext, ReactNode, useContext } from "react";
import { Theme } from "react-daisyui";
import { useStoredValue, writeStoredValue } from "@/libs/storedValue";

const THEME_KEY = "theme";
const DEFAULT_THEME = "retro";

const ThemeContext = createContext<
  | undefined
  | {
      theme: string;
      setTheme: (theme: string) => void;
    }
>(undefined);

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useStoredValue(THEME_KEY, DEFAULT_THEME);

  const customSetTheme = (theme: string) => {
    document.querySelector("html")?.setAttribute("data-theme", theme);
    writeStoredValue(THEME_KEY, theme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: customSetTheme }}>
      <Theme dataTheme={theme} className="min-h-screen bg-base-100">
        {children}
      </Theme>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined)
    throw new Error("ThemeContext provider not found.");
  return context;
}
