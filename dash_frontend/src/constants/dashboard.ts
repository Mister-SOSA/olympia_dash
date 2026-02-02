export const LOCAL_STORAGE_KEY = "dashboard_layout";
// Note: COLUMN_COUNT is now user-configurable via settings (grid.columns)
// Default values are in constants/settings.ts GRID_SETTINGS
export const DEFAULT_COLUMN_COUNT = 11; // Fallback if settings haven't loaded
export const DEFAULT_CELL_HEIGHT = 80; // Fallback cell height
export const MIN_CELL_HEIGHT = 40; // Minimum cell height to prevent squishing
export const MIN_WIDGET_WIDTH = 2; // Minimum widget width in columns
export const MIN_WIDGET_HEIGHT = 2; // Minimum widget height in rows
// Note: Grid dimensions are now synced across all sessions via user preferences
// This prevents layout sync issues between different aspect ratio screens