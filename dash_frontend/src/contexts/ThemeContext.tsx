"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { preferencesService } from "@/lib/preferences";

export type Theme = "slate" | "ocean" | "forest" | "sunset" | "midnight" | "dawn" | "nordic" | "coral" | "crimson" | "neon" | "monokai" | "dracula" | "tokyo-night" | "gruvbox" | "catppuccin" | "cyberpunk" | "github" | "solarized" | "one-light" | "lavender" | "mint" | "cream" | "rose" | "sky";

export const THEMES = [
    { id: "slate" as Theme, name: "Slate", colors: ["#2563eb", "#9333ea", "#374151"], category: "dark" },
    { id: "ocean" as Theme, name: "Ocean", colors: ["#00a8e8", "#00d4aa", "#1a4259"], category: "dark" },
    { id: "forest" as Theme, name: "Forest", colors: ["#4ade80", "#fbbf24", "#2e4a2e"], category: "dark" },
    { id: "sunset" as Theme, name: "Sunset", colors: ["#f97316", "#ec4899", "#4d2f52"], category: "dark" },
    { id: "midnight" as Theme, name: "Midnight", colors: ["#06b6d4", "#8b5cf6", "#1c2438"], category: "dark" },
    { id: "crimson" as Theme, name: "Crimson", colors: ["#dc2626", "#f97316", "#451a24"], category: "dark" },
    { id: "neon" as Theme, name: "Neon", colors: ["#00ffff", "#ff00ff", "#1e1e2e"], category: "dark" },
    { id: "monokai" as Theme, name: "Monokai", colors: ["#f92672", "#a6e22e", "#272822"], category: "dark" },
    { id: "dracula" as Theme, name: "Dracula", colors: ["#bd93f9", "#ff79c6", "#282a36"], category: "dark" },
    { id: "tokyo-night" as Theme, name: "Tokyo Night", colors: ["#7aa2f7", "#bb9af7", "#1a1b26"], category: "dark" },
    { id: "gruvbox" as Theme, name: "Gruvbox", colors: ["#fe8019", "#b8bb26", "#282828"], category: "dark" },
    { id: "catppuccin" as Theme, name: "Catppuccin", colors: ["#89b4fa", "#f5c2e7", "#1e1e2e"], category: "dark" },
    { id: "cyberpunk" as Theme, name: "Cyberpunk", colors: ["#00ff9f", "#ff2a6d", "#0a0e27"], category: "dark" },
    { id: "dawn" as Theme, name: "Dawn", colors: ["#db2777", "#a855f7", "#fbcfe8"], category: "light" },
    { id: "nordic" as Theme, name: "Nordic", colors: ["#0ea5e9", "#3b82f6", "#e2e8f0"], category: "light" },
    { id: "coral" as Theme, name: "Coral", colors: ["#f97316", "#f43f5e", "#fed7aa"], category: "light" },
    { id: "github" as Theme, name: "GitHub", colors: ["#0969da", "#6e7781", "#ffffff"], category: "light" },
    { id: "solarized" as Theme, name: "Solarized", colors: ["#268bd2", "#2aa198", "#fdf6e3"], category: "light" },
    { id: "one-light" as Theme, name: "One Light", colors: ["#4078f2", "#50a14f", "#fafafa"], category: "light" },
    { id: "lavender" as Theme, name: "Lavender", colors: ["#9b87f5", "#d4c5f9", "#f5f3ff"], category: "light" },
    { id: "mint" as Theme, name: "Mint", colors: ["#10b981", "#6ee7b7", "#f0fdf4"], category: "light" },
    { id: "cream" as Theme, name: "Cream", colors: ["#d97706", "#92400e", "#fffbeb"], category: "light" },
    { id: "rose" as Theme, name: "Rose", colors: ["#e11d48", "#9f1239", "#fff1f2"], category: "light" },
    { id: "sky" as Theme, name: "Sky", colors: ["#0ea5e9", "#0284c7", "#f0f9ff"], category: "light" },
] as const;

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("slate");
    const [mounted, setMounted] = useState(false);

    // Load theme from preferences on mount
    useEffect(() => {
        setMounted(true);
        const savedTheme = preferencesService.get<Theme>("theme", "slate");
        if (savedTheme && THEMES.some(t => t.id === savedTheme)) {
            applyTheme(savedTheme);
            setThemeState(savedTheme);
        }
    }, []);

    const setTheme = async (newTheme: Theme) => {
        applyTheme(newTheme);
        setThemeState(newTheme);

        // Save to preferences
        preferencesService.set("theme", newTheme);
    };

    // Don't render until we've loaded the theme from preferences
    if (!mounted) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}

// Apply theme by adding/removing CSS classes on document element
function applyTheme(theme: Theme) {
    if (typeof document === "undefined") return;

    // Remove all theme classes
    THEMES.forEach(t => {
        document.documentElement.classList.remove(`theme-${t.id}`);
    });

    // Add the new theme class
    document.documentElement.classList.add(`theme-${theme}`);
}

