/**
 * Layout Update Source System
 * 
 * This module provides a robust, deterministic way to track the origin of layout changes.
 * Instead of using timing-based heuristics (cooldowns, debouncing) to detect feedback loops,
 * we explicitly tag each layout change with its source.
 * 
 * This is the "professional" approach - deterministic, debuggable, and race-condition-free.
 */

/**
 * The source of a layout update. This allows components to make intelligent decisions
 * about how to handle updates based on their origin.
 * 
 * - 'local-interaction': User directly interacted with the grid (drag, resize, delete)
 * - 'preset-load': Layout came from loading a preset
 * - 'remote-sync': Layout came from another session via WebSocket
 * - 'widget-add': A widget was added via the widget picker
 * - 'widget-remove': A widget was removed
 * - 'initial-load': Initial layout load from storage
 * - 'compact': Layout was compacted via context menu
 */
export type LayoutUpdateSource =
    | 'local-interaction'
    | 'preset-load'
    | 'remote-sync'
    | 'widget-add'
    | 'widget-remove'
    | 'initial-load'
    | 'compact';

/**
 * A tagged layout update that includes the source of the change.
 * This allows components to filter and handle updates appropriately.
 */
export interface LayoutUpdate {
    /** The layout data */
    layout: import('@/types').Widget[];
    /** The source of this update */
    source: LayoutUpdateSource;
    /** Timestamp of the update (for debugging/logging) */
    timestamp: number;
    /** Session ID that originated the update (for remote sync filtering) */
    sessionId?: string;
}

/**
 * Options for saving layout to storage
 */
export interface SaveLayoutOptions {
    /** The source of this layout change */
    source: LayoutUpdateSource;
    /** Whether to sync to server (default: true) */
    sync?: boolean;
    /** Whether to notify local subscribers (default: true based on source) */
    notifyLocal?: boolean;
    /** Custom session ID (for remote sync) */
    sessionId?: string;
}

/**
 * A helper to check if a layout update should trigger a re-render.
 * With react-grid-layout (declarative), this is mainly used for logging
 * and determining sync behavior rather than forcing reloads.
 * 
 * Should re-render when:
 * - A preset is loaded
 * - A widget is added from the picker
 * - Remote sync (but only if widgets were added/removed, not just repositioned)
 * 
 * Already handled by React (no special action needed):
 * - Local interactions (drag/resize) - React state already in sync
 * - Widget removal - React state already updated
 * - Compact - React state already updated
 */
export function shouldReloadGrid(source: LayoutUpdateSource, hasStructuralChange: boolean): boolean {
    switch (source) {
        case 'local-interaction':
            // Never reload for local interactions - state is already in sync
            return false;
        case 'compact':
            // Never reload for compact - state already updated
            return false;
        case 'widget-remove':
            // Never reload for removal - state already updated
            return false;
        case 'preset-load':
            // Always reload for preset loads - this is a wholesale layout replacement
            return true;
        case 'widget-add':
            // Always reload when adding a widget
            return true;
        case 'remote-sync':
            // Only reload for remote sync if there was a structural change
            // (widgets added/removed, not just position changes)
            return hasStructuralChange;
        case 'initial-load':
            // Always reload for initial load
            return true;
        default:
            // Unknown source - be conservative and reload
            return true;
    }
}

/**
 * Compare two layouts to detect structural changes (widgets added or removed).
 * Position changes are not considered structural.
 */
export function detectStructuralChanges(
    oldLayout: import('@/types').Widget[],
    newLayout: import('@/types').Widget[]
): { widgetsAdded: boolean; widgetsRemoved: boolean; addedIds: string[]; removedIds: string[] } {
    const oldIds = new Set(oldLayout.map(w => w.id));
    const newIds = new Set(newLayout.map(w => w.id));

    const addedIds = newLayout.filter(w => !oldIds.has(w.id)).map(w => w.id);
    const removedIds = oldLayout.filter(w => !newIds.has(w.id)).map(w => w.id);

    return {
        widgetsAdded: addedIds.length > 0,
        widgetsRemoved: removedIds.length > 0,
        addedIds,
        removedIds
    };
}

/**
 * Get a human-readable description of a layout update source (for logging/debugging)
 */
export function describeSource(source: LayoutUpdateSource): string {
    const descriptions: Record<LayoutUpdateSource, string> = {
        'local-interaction': 'user drag/resize',
        'preset-load': 'preset loaded',
        'remote-sync': 'sync from other session',
        'widget-add': 'widget added',
        'widget-remove': 'widget removed',
        'initial-load': 'initial load',
        'compact': 'layout compacted'
    };
    return descriptions[source] || source;
}
