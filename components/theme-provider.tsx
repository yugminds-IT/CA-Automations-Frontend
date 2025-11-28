"use client"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps, useTheme as useNextTheme } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

export function useTheme() {
  const { theme, setTheme } = useNextTheme()

  return {
    theme,
    toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
  }
}
