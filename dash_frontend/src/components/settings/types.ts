/**
 * Settings Types and Constants
 * Extracted from SettingsMenu.tsx for better organization
 */

import {
    MdPalette,
    MdTune,
    MdKeyboard,
    MdPerson,
    MdSchedule,
    MdNotifications,
    MdStorage,
    MdVisibilityOff,
    MdDock,
    MdRefresh,
    MdGridOn,
    MdViewCompact,
} from "react-icons/md";

// =============================================================================
// Types
// =============================================================================

export type SettingsView =
    | 'account'
    | 'appearance'
    | 'layout'
    | 'navigation'
    | 'dock'
    | 'widgets'
    | 'regional'
    | 'notifications'
    | 'privacy'
    | 'presets'
    | 'shortcuts'
    | 'advanced';

export interface NavigationItem {
    id: SettingsView;
    icon: React.ElementType;
    label: string;
    badge?: string;
}

// =============================================================================
// Navigation Configuration
// =============================================================================

export const NAVIGATION_ITEMS: NavigationItem[] = [
    { id: 'account', icon: MdPerson, label: 'Account' },
    { id: 'appearance', icon: MdPalette, label: 'Appearance' },
    { id: 'layout', icon: MdGridOn, label: 'Layout & Grid', badge: 'Beta' },
    { id: 'navigation', icon: MdViewCompact, label: 'Navigation', badge: 'New' },
    { id: 'dock', icon: MdDock, label: 'Dock' },
    { id: 'widgets', icon: MdTune, label: 'Widgets' },
    { id: 'regional', icon: MdSchedule, label: 'Regional' },
    { id: 'notifications', icon: MdNotifications, label: 'Notifications' },
    { id: 'privacy', icon: MdVisibilityOff, label: 'Privacy', badge: 'Beta' },
    { id: 'presets', icon: MdRefresh, label: 'Preset Cycle', badge: 'Beta' },
    { id: 'shortcuts', icon: MdKeyboard, label: 'Shortcuts' },
    { id: 'advanced', icon: MdStorage, label: 'Advanced' },
];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get badge colors based on badge type
 */
export const getBadgeColors = (badge: string): React.CSSProperties => {
    const badgeLower = badge.toLowerCase();

    if (badgeLower === 'beta') {
        return {
            backgroundColor: 'var(--badge-warning-bg)',
            color: 'var(--badge-warning-text)',
            borderColor: 'var(--badge-warning-border)'
        };
    }
    if (badgeLower === 'new') {
        return {
            backgroundColor: 'var(--badge-success-bg)',
            color: 'var(--badge-success-text)',
            borderColor: 'var(--badge-success-border)'
        };
    }
    // Default to primary
    return {
        backgroundColor: 'var(--badge-primary-bg)',
        color: 'var(--badge-primary-text)',
        borderColor: 'var(--badge-primary-border)'
    };
};
