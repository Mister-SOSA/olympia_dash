/**
 * Base type for data entries with a unique identifier and timestamp.
 */
export interface BaseData {
    id: string;         // Unique identifier for the data row
    timestamp: Date;    // Precise timestamp for sorting and date operations
}

/**
 * Flexible sales data type to handle multiple resolutions (daily, weekly, monthly, etc.).
 */
export interface SalesData {
    period: string; // e.g., "2024-01"
    total: number;  // Total sales
    year: number;   // e.g., 2024
}

/**
 * Processed sales data type for charts, widgets, or summaries.
 */
export interface ProcessedSalesData {
    period: string;            // Period identifier (e.g., "2025-01-10", "2025-W02", "2025-01")
    periodLabel: string;       // Human-readable label for display
    currentPeriodSales: number; // Sales for the current period
    previousPeriodSales: number; // Sales for the previous period
}

/**
 * Customer data type for tracking sales performance by customer.
 */
export interface CustomerData extends BaseData {
    businessName: string; // Business name
    totalSales: number;   // Total sales dollars
    color: string;        // Display color for charts
}