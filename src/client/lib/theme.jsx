import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "pos-app:theme";
const THEME_CLASSES = ["dark", "ocean", "forest"];

export const THEMES = [
  { id: "light",  label: "Light",  color: "oklch(1 0 0)" },
  { id: "dark",   label: "Dark",   color: "oklch(0.141 0.005 285.823)" },
  { id: "ocean",  label: "Ocean",  color: "oklch(0.17 0.04 240)" },
  { id: "forest", label: "Forest", color: "oklch(0.16 0.03 145)" },
];

const THEME_IDS = THEMES.map((t) => t.id);
const ThemeContext = createContext(null);

function readStored() {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return THEME_IDS.includes(t) ? t : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  THEME_CLASSES.forEach((c) => root.classList.remove(c));
  if (theme !== "light") root.classList.add(theme);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStored);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    applyTheme(readStored());
  }, []);

  const setTheme = useCallback((next) => {
    if (THEME_IDS.includes(next)) setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, THEMES }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
