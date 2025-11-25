"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { WidgetPermissionsProvider } from "@/contexts/WidgetPermissionsContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <SettingsProvider>
                <PrivacyProvider>
                    <WidgetPermissionsProvider>
                        {children}
                    </WidgetPermissionsProvider>
                </PrivacyProvider>
            </SettingsProvider>
        </ThemeProvider>
    );
}

