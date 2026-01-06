/**
 * Dashboard Components and Hooks
 * 
 * This module exports all extracted dashboard functionality for cleaner imports.
 */

// Types and utilities
export {
    deepClone,
    mergePreset,
    findNextPresetIndex,
    shouldIgnoreGlobalHotkeys,
    createTempLayout,
    NON_TEXT_INPUT_TYPES,
    TABLE_WIDGET_IDS,
} from './types';

export type {
    DashboardState,
    DashboardUIState,
    SettingsViewType,
    PresetDialogType,
} from './types';

// Components
export { FullscreenWidget } from './FullscreenWidget';

// Hooks
export { useDashboardAuth } from './useDashboardAuth';
export { useDashboardPreferences } from './useDashboardPreferences';
export { useDashboardKeyboard } from './useDashboardKeyboard';
export { useDashboardPresets } from './useDashboardPresets';
export { useDashboardLayout } from './useDashboardLayout';
