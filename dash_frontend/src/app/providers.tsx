"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { WidgetPermissionsProvider } from "@/contexts/WidgetPermissionsContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { WidgetSettingsDialogProvider } from "@/contexts/WidgetSettingsDialogContext";
import { ACInfinityProvider } from "@/contexts/ACInfinityContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <SettingsProvider>
                <PrivacyProvider>
                    <WidgetPermissionsProvider>
                        <AnalyticsProvider>
                            <ACInfinityProvider>
                                <WidgetSettingsDialogProvider>
                                    {children}
                                </WidgetSettingsDialogProvider>
                            </ACInfinityProvider>
                        </AnalyticsProvider>
                    </WidgetPermissionsProvider>
                </PrivacyProvider>
            </SettingsProvider>
        </ThemeProvider>
    );
}

