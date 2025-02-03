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

export interface Widget {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    enabled: boolean;
}
// Type for the raw data returned from the API
export interface POItemData {
    po_number: string; // Purchase order number
    vend_name: string; // Vendor name
    vend_code: string; // Vendor code
    part_code: string; // Code of the part
    part_desc: string; // Description of the part
    unit_price: number; // Unit price
    date_orderd: string; // Date ordered (should be ISO string)
    vend_prom_date: string; // Vendor promised date (should be ISO string)
    date_prom_user: string | null; // User promised date (nullable)
    recent_unit_price: number; // Recent unit price
    recent_date_orderd: string | null; // Recent date ordered (nullable)
    last_order_date: string | null; // Last order date (nullable)
    last_order_unit_price: number | null; // Last order unit price (nullable)
    po_status: string; // Purchase order status
    isGrouped: boolean; // Whether the row is a grouped row
}

export interface POItemTableData {
    poNumber: string;
    vendName: string;
    vendCode: string;
    partCode: string;
    partDescription: string;
    unitPrice: number;
    dateOrdered: string; // Formatted date as string
    vendorPromiseDate: string; // Formatted date as string
    userPromisedDate: string; // "N/A" or formatted date as string
    recentUnitPrice: string; // Formatted unit price as string
    lastOrderDate: string; // "N/A" or formatted date as string
    POStatus: string; // Purchase order status
    isGrouped: boolean; // Whether the row is a grouped row
}