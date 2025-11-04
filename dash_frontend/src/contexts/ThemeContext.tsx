"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { preferencesService } from "@/lib/preferences";

export type Theme = "slate" | "ocean" | "forest" | "sunset" | "midnight";

export const THEMES = [
    { id: "slate" as Theme, name: "Slate", description: "Modern gray with blue/purple accents", colors: ["#2563eb", "#9333ea", "#374151"] },
    { id: "ocean" as Theme, name: "Ocean", description: "Deep blues and teals", colors: ["#00a8e8", "#00d4aa", "#1a4259"] },
    { id: "forest" as Theme, name: "Forest", description: "Greens and earth tones", colors: ["#4ade80", "#fbbf24", "#2e4a2e"] },
    { id: "sunset" as Theme, name: "Sunset", description: "Warm oranges and purples", colors: ["#f97316", "#ec4899", "#4d2f52"] },
    { id: "midnight" as Theme, name: "Midnight", description: "Very dark with cyan accents", colors: ["#06b6d4", "#8b5cf6", "#1c2438"] },
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

