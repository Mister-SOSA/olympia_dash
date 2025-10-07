export const LOCAL_STORAGE_KEY = "dashboard_layout";
export const COLUMN_COUNT = 11;
export const CELL_HEIGHT = 50; // Fallback cell height
export const MIN_CELL_HEIGHT = 80; // Minimum cell height to prevent squishing
export const MIN_WIDGET_WIDTH = 2; // Minimum widget width in columns
export const MIN_WIDGET_HEIGHT = 2; // Minimum widget height in rows
// Note: Actual cell height is dynamically calculated for square cells
// with viewport awareness to balance square aspect ratio and screen fit
// Minimum widget dimensions prevent users from creating unusably small widgets