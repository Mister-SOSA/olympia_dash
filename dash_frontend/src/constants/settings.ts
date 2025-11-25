/**
 * User Settings Constants
 * 
 * Centralized source of truth for all user preference keys,
 * default values, and validation rules.
 */

// ============================================
// APPEARANCE SETTINGS
// ============================================
export const APPEARANCE_SETTINGS = {
    theme: {
        key: 'theme',
        default: 'slate' as const,
        label: 'Theme',
        description: 'Dashboard color scheme',
    },
    animations: {
        key: 'appearance.animations',
        default: true,
        label: 'Animations',
        description: 'Enable smooth transitions and effects',
    },
    compactMode: {
        key: 'appearance.compactMode',
        default: false,
        label: 'Compact Mode',
        description: 'Reduce padding and margins for denser layouts',
    },
    fontSize: {
        key: 'appearance.fontSize',
        default: 'medium' as const,
        options: ['small', 'medium', 'large'] as const,
        label: 'Font Size',
        description: 'Base font size for the dashboard',
    },
} as const;

// ============================================
// DATE & TIME SETTINGS
// ============================================
export const TIMEZONE_OPTIONS = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
] as const;

export const DATE_FORMAT_OPTIONS = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/31/2025' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '31/12/2025' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2025-12-31' },
    { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY', example: 'Dec 31, 2025' },
    { value: 'DD MMM YYYY', label: 'DD MMM YYYY', example: '31 Dec 2025' },
    { value: 'MMMM DD, YYYY', label: 'MMMM DD, YYYY', example: 'December 31, 2025' },
] as const;

export const DATETIME_SETTINGS = {
    timezone: {
        key: 'datetime.timezone',
        default: 'America/Chicago',
        label: 'Timezone',
        description: 'Display dates and times in this timezone',
    },
    dateFormat: {
        key: 'datetime.dateFormat',
        default: 'MMM DD, YYYY' as const,
        label: 'Date Format',
        description: 'How dates are displayed',
    },
    clockFormat: {
        key: 'datetime.clockFormat',
        default: '12h' as const,
        options: ['12h', '24h'] as const,
        label: 'Clock Format',
        description: '12-hour or 24-hour time',
    },
    showSeconds: {
        key: 'datetime.showSeconds',
        default: true,
        label: 'Show Seconds',
        description: 'Display seconds in clock widgets',
    },
} as const;

// ============================================
// DASHBOARD SETTINGS
// ============================================
export const DASHBOARD_SETTINGS = {
    autoSave: {
        key: 'dashboard.autoSave',
        default: true,
        label: 'Auto-save Layout',
        description: 'Automatically save widget positions',
    },
    confirmDelete: {
        key: 'dashboard.confirmDelete',
        default: true,
        label: 'Confirm Widget Removal',
        description: 'Ask for confirmation before removing widgets',
    },
    autoCompact: {
        key: 'dashboard.autoCompact',
        default: false,
        label: 'Auto-compact Layout',
        description: 'Automatically fill gaps when widgets are removed',
    },
} as const;

// ============================================
// DOCK SETTINGS
// ============================================
export const DOCK_SETTINGS = {
    autoHide: {
        key: 'dock.autoHide',
        default: true,
        label: 'Auto-hide Dock',
        description: 'Hide dock until mouse approaches bottom of screen',
    },
    magnification: {
        key: 'dock.magnification',
        default: true,
        label: 'Magnification',
        description: 'Enlarge icons when hovering over the dock',
    },
    showLabels: {
        key: 'dock.showLabels',
        default: false,
        label: 'Show Labels',
        description: 'Display labels below dock icons',
    },
    showActiveIndicator: {
        key: 'dock.showActiveIndicator',
        default: true,
        label: 'Active Preset Indicator',
        description: 'Show glowing dot on active preset',
    },
    triggerDistance: {
        key: 'dock.triggerDistance',
        default: 20,
        options: [10, 20, 40, 60] as const,
        label: 'Trigger Distance',
        description: 'How close to bottom edge to show dock (pixels)',
    },
} as const;

// ============================================
// DRAG HANDLE SETTINGS
// ============================================
export const DRAG_HANDLE_SETTINGS = {
    showOnHover: {
        key: 'dragHandle.showOnHover',
        default: true,
        label: 'Show on Hover',
        description: 'Only show drag handle when hovering over widget',
    },
    alwaysShow: {
        key: 'dragHandle.alwaysShow',
        default: false,
        label: 'Always Visible',
        description: 'Keep drag handles visible at all times',
    },
    showResizeHandles: {
        key: 'dragHandle.showResizeHandles',
        default: true,
        label: 'Resize Handles',
        description: 'Show corner handles for resizing widgets',
    },
} as const;

// ============================================
// WIDGET SETTINGS
// ============================================
export const REFRESH_INTERVAL_OPTIONS = [
    { value: 10, label: '10 seconds', description: 'Fast updates' },
    { value: 30, label: '30 seconds', description: 'Default' },
    { value: 60, label: '1 minute', description: 'Standard' },
    { value: 300, label: '5 minutes', description: 'Power saving' },
    { value: 600, label: '10 minutes', description: 'Minimal updates' },
    { value: 0, label: 'Manual only', description: 'No auto-refresh' },
] as const;

export const WIDGET_SETTINGS = {
    defaultRefreshInterval: {
        key: 'widgets.defaultRefreshInterval',
        default: 30,
        label: 'Default Refresh Interval',
        description: 'How often widgets update by default (in seconds)',
    },
    showRefreshIndicators: {
        key: 'widgets.showRefreshIndicators',
        default: true,
        label: 'Refresh Indicators',
        description: 'Show countdown rings on widgets',
    },
    showWidgetTitles: {
        key: 'widgets.showWidgetTitles',
        default: true,
        label: 'Widget Titles',
        description: 'Show titles on widget headers',
    },
    tableRowsPerPage: {
        key: 'widgets.tableRowsPerPage',
        default: 25,
        options: [10, 25, 50, 100] as const,
        label: 'Table Rows',
        description: 'Default number of rows in table widgets',
    },
} as const;

// ============================================
// NOTIFICATION SETTINGS
// ============================================
export const NOTIFICATION_SETTINGS = {
    sound: {
        key: 'notifications.sound',
        default: true,
        label: 'Sound Notifications',
        description: 'Play sound for important alerts',
    },
    volume: {
        key: 'notifications.volume',
        default: 50,
        min: 0,
        max: 100,
        label: 'Notification Volume',
        description: 'Volume level for audio notifications',
    },
    desktopNotifications: {
        key: 'notifications.desktop',
        default: false,
        label: 'Desktop Notifications',
        description: 'Show browser notifications for alerts',
    },
    toastPosition: {
        key: 'notifications.toastPosition',
        default: 'bottom-right' as const,
        options: ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'] as const,
        label: 'Toast Position',
        description: 'Where toast notifications appear',
    },
    toastDuration: {
        key: 'notifications.toastDuration',
        default: 4000,
        options: [2000, 4000, 6000, 8000] as const,
        label: 'Toast Duration',
        description: 'How long toasts stay visible (ms)',
    },
} as const;

// ============================================
// DATA & PRIVACY SETTINGS
// ============================================
export const DATA_SETTINGS = {
    numberFormat: {
        key: 'data.numberFormat',
        default: 'en-US' as const,
        options: ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES'] as const,
        label: 'Number Format',
        description: 'How numbers and currencies are displayed',
    },
    currencySymbol: {
        key: 'data.currencySymbol',
        default: '$' as const,
        label: 'Currency Symbol',
        description: 'Symbol used for monetary values',
    },
    cacheEnabled: {
        key: 'data.cacheEnabled',
        default: true,
        label: 'Enable Caching',
        description: 'Cache data locally for faster loading',
    },
} as const;

// ============================================
// KEYBOARD SETTINGS
// ============================================
export const KEYBOARD_SETTINGS = {
    enableHotkeys: {
        key: 'keyboard.enableHotkeys',
        default: true,
        label: 'Enable Hotkeys',
        description: 'Allow keyboard shortcuts',
    },
} as const;

// ============================================
// ALL SETTINGS COMBINED (for iteration)
// ============================================
export const ALL_SETTINGS = {
    ...APPEARANCE_SETTINGS,
    ...DATETIME_SETTINGS,
    ...DASHBOARD_SETTINGS,
    ...DOCK_SETTINGS,
    ...DRAG_HANDLE_SETTINGS,
    ...WIDGET_SETTINGS,
    ...NOTIFICATION_SETTINGS,
    ...DATA_SETTINGS,
    ...KEYBOARD_SETTINGS,
} as const;

// ============================================
// TYPE EXPORTS
// ============================================
export type TimezoneOption = typeof TIMEZONE_OPTIONS[number]['value'];
export type DateFormatOption = typeof DATE_FORMAT_OPTIONS[number]['value'];
export type ClockFormat = '12h' | '24h';
export type FontSize = 'small' | 'medium' | 'large';
export type ToastPosition = typeof NOTIFICATION_SETTINGS.toastPosition.options[number];
export type NumberFormat = typeof DATA_SETTINGS.numberFormat.options[number];

// Settings categories for UI organization
export const SETTINGS_CATEGORIES = [
    {
        id: 'appearance',
        label: 'Appearance',
        description: 'Theme, fonts, and visual settings',
        settings: APPEARANCE_SETTINGS,
    },
    {
        id: 'datetime',
        label: 'Date & Time',
        description: 'Timezone and format preferences',
        settings: DATETIME_SETTINGS,
    },
    {
        id: 'dashboard',
        label: 'Dashboard',
        description: 'Layout and behavior settings',
        settings: DASHBOARD_SETTINGS,
    },
    {
        id: 'dock',
        label: 'Dock',
        description: 'Dock visibility and behavior',
        settings: DOCK_SETTINGS,
    },
    {
        id: 'widgets',
        label: 'Widgets',
        description: 'Widget refresh and display settings',
        settings: WIDGET_SETTINGS,
    },
    {
        id: 'notifications',
        label: 'Notifications',
        description: 'Sound and alert preferences',
        settings: NOTIFICATION_SETTINGS,
    },
    {
        id: 'data',
        label: 'Data & Formats',
        description: 'Number and currency formatting',
        settings: DATA_SETTINGS,
    },
    {
        id: 'keyboard',
        label: 'Keyboard',
        description: 'Keyboard shortcuts',
        settings: KEYBOARD_SETTINGS,
    },
] as const;
