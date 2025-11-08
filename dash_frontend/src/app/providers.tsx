"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { WidgetPermissionsProvider } from "@/contexts/WidgetPermissionsContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <WidgetPermissionsProvider>
                {children}
            </WidgetPermissionsProvider>
        </ThemeProvider>
    );
}

