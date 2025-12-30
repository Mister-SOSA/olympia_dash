/**
 * WidgetSettingsDialogContext
 * 
 * Provides a way for widgets to request opening their settings dialog.
 * This allows widgets to include a "Configure" button that opens the settings.
 */

import React, { createContext, useContext, useCallback, useState } from 'react';

interface WidgetSettingsDialogContextType {
    /** Request to open settings for a widget */
    openSettings: (widgetId: string, widgetTitle: string) => void;
    /** Currently selected widget for settings (if any) */
    selectedWidget: { id: string; title: string } | null;
    /** Whether the settings dialog is open */
    isOpen: boolean;
    /** Close the settings dialog */
    closeSettings: () => void;
}

const WidgetSettingsDialogContext = createContext<WidgetSettingsDialogContextType | null>(null);

export function WidgetSettingsDialogProvider({ children }: { children: React.ReactNode }) {
    const [selectedWidget, setSelectedWidget] = useState<{ id: string; title: string } | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const openSettings = useCallback((widgetId: string, widgetTitle: string) => {
        setSelectedWidget({ id: widgetId, title: widgetTitle });
        setIsOpen(true);
    }, []);

    const closeSettings = useCallback(() => {
        setIsOpen(false);
        setSelectedWidget(null);
    }, []);

    return (
        <WidgetSettingsDialogContext.Provider value={{ openSettings, selectedWidget, isOpen, closeSettings }}>
            {children}
        </WidgetSettingsDialogContext.Provider>
    );
}

export function useWidgetSettingsDialog() {
    const context = useContext(WidgetSettingsDialogContext);
    if (!context) {
        throw new Error('useWidgetSettingsDialog must be used within a WidgetSettingsDialogProvider');
    }
    return context;
}
