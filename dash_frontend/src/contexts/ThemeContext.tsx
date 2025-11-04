"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { preferencesService } from "@/lib/preferences";

export type Theme = "slate" | "ocean" | "forest" | "sunset" | "midnight" | "dawn" | "nordic" | "coral" | "crimson" | "neon";

export const THEMES = [
    { id: "slate" as Theme, name: "Slate", description: "Modern gray with blue/purple accents", colors: ["#2563eb", "#9333ea", "#374151"] },
    { id: "ocean" as Theme, name: "Ocean", description: "Deep blues and teals", colors: ["#00a8e8", "#00d4aa", "#1a4259"] },
    { id: "forest" as Theme, name: "Forest", description: "Greens and earth tones", colors: ["#4ade80", "#fbbf24", "#2e4a2e"] },
    { id: "sunset" as Theme, name: "Sunset", description: "Warm oranges and purples", colors: ["#f97316", "#ec4899", "#4d2f52"] },
    { id: "midnight" as Theme, name: "Midnight", description: "Very dark with cyan accents", colors: ["#06b6d4", "#8b5cf6", "#1c2438"] },
    { id: "dawn" as Theme, name: "Dawn", description: "Light mode - Soft pinks and purples", colors: ["#db2777", "#a855f7", "#fbcfe8"] },
    { id: "nordic" as Theme, name: "Nordic", description: "Light mode - Clean Scandinavian design", colors: ["#0ea5e9", "#3b82f6", "#cbd5e1"] },
    { id: "coral" as Theme, name: "Coral", description: "Light mode - Warm coral and peach tones", colors: ["#f97316", "#f43f5e", "#fdba74"] },
    { id: "crimson" as Theme, name: "Crimson", description: "Dark mode - Red and black intensity", colors: ["#dc2626", "#f97316", "#451a24"] },
    { id: "neon" as Theme, name: "Neon", description: "Dark mode - Vibrant neon colors", colors: ["#00ffff", "#ff00ff", "#1e1e2e"] },
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

