"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { WidgetPermissionsProvider } from "@/contexts/WidgetPermissionsContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { WidgetSettingsDialogProvider } from "@/contexts/WidgetSettingsDialogContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <SettingsProvider>
                <PrivacyProvider>
                    <WidgetPermissionsProvider>
                        <AnalyticsProvider>
                            <WidgetSettingsDialogProvider>
                                {children}
                            </WidgetSettingsDialogProvider>
                        </AnalyticsProvider>
                    </WidgetPermissionsProvider>
                </PrivacyProvider>
            </SettingsProvider>
        </ThemeProvider>
    );
}

