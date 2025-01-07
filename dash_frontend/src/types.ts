export interface SalesData {
    month: string;
    total: number;
    year: number;
}

export interface ProcessedSalesData {
    month: string; // Display-friendly month name, e.g., "Aug 2024"
    currentYear: number; // Total sales for the current year in that month
    lastYear: number; // Total sales for the last year in that month
};

export interface CustomerData {
    bus_name: string;            // Business name
    total_sales_dollars: number; // Total sales dollars
}

