import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export type AdminTab = 'overview' | 'users' | 'logs' | 'devices' | 'groups' | 'permissions' | 'activity' | 'analytics' | 'database';

interface UseAdminKeyboardShortcutsProps {
    activeTab: AdminTab;
    setActiveTab: (tab: AdminTab) => void;
    onRefresh: () => void;
    onExport?: () => void;
    onSearch?: () => void;
}

const TABS: AdminTab[] = ['overview', 'analytics', 'users', 'groups', 'permissions', 'activity', 'logs', 'devices', 'database'];

export function useAdminKeyboardShortcuts({
    activeTab,
    setActiveTab,
    onRefresh,
    onExport,
    onSearch
}: UseAdminKeyboardShortcutsProps) {
    const handleKeyPress = useCallback((e: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in input fields
        if (
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            e.target instanceof HTMLSelectElement
        ) {
            return;
        }

        // Alt + Number (1-9) to switch tabs
        if (e.altKey && e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            const tabIndex = parseInt(e.key) - 1;
            if (TABS[tabIndex]) {
                setActiveTab(TABS[tabIndex]);
                toast.info(`Switched to ${TABS[tabIndex]}`, {
                    duration: 1500
                });
            }
        }

        // Alt + R to refresh
        if (e.altKey && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            onRefresh();
            toast.success('Refreshing data...', {
                duration: 1500
            });
        }

        // Alt + E to export (if available)
        if (e.altKey && e.key.toLowerCase() === 'e' && onExport) {
            e.preventDefault();
            onExport();
        }

        // Alt + F or Cmd/Ctrl + F to focus search (if available)
        if (((e.altKey || e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') && onSearch) {
            e.preventDefault();
            onSearch();
        }

        // Show shortcuts help with Alt + /
        if (e.altKey && e.key === '/') {
            e.preventDefault();
            toast.info('Keyboard Shortcuts', {
                description: 'Alt+1-9: Switch tabs • Alt+R: Refresh • Alt+E: Export • Alt+F: Search',
                duration: 4000
            });
        }
    }, [activeTab, setActiveTab, onRefresh, onExport, onSearch]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [handleKeyPress]);

    return {
        shortcuts: {
            switchTab: 'Alt + 1-9',
            refresh: 'Alt + R',
            export: 'Alt + E',
            search: 'Alt + F',
            help: 'Alt + /'
        }
    };
}
