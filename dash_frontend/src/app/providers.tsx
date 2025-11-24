"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { WidgetPermissionsProvider } from "@/contexts/WidgetPermissionsContext";
import { SettingsProvider } from "@/contexts/SettingsContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <SettingsProvider>
                <WidgetPermissionsProvider>
                    {children}
                </WidgetPermissionsProvider>
            </SettingsProvider>
        </ThemeProvider>
    );
}

