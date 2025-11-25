/**
 * Widget Registry - Auto-discovery and registration system
 * 
 * To add a new widget:
 * 1. Create your widget component in /components/widgets/
 * 2. Export a `widgetConfig` from your widget file
 * 3. Import and add it to the WIDGET_CONFIGS array below
 * 
 * The widget config should follow the WidgetConfig interface.
 */

import React from "react";

// ============================================
// Widget Configuration Interface
// ============================================

export interface WidgetConfig {
    /** Unique identifier for the widget */
    id: string;
    /** Display title shown in the picker */
    title: string;
    /** Short description of what the widget does */
    description: string;
    /** Primary category for grouping */
    category: WidgetCategory;
    /** Optional subcategory for finer grouping */
    subcategory?: string;
    /** Tags for enhanced search and filtering */
    tags?: string[];
    /** Default grid size */
    defaultSize: {
        w: number;
        h: number;
    };
    /** Minimum allowed size (optional) */
    minSize?: {
        w: number;
        h: number;
    };
    /** Maximum allowed size (optional) */
    maxSize?: {
        w: number;
        h: number;
    };
    /** Icon component for the widget (optional) */
    icon?: React.ComponentType<{ className?: string }>;
    /** Whether this widget is in beta/experimental */
    beta?: boolean;
    /** Whether this widget is deprecated */
    deprecated?: boolean;
    /** Version this widget was added */
    since?: string;
    /** Search keywords that aren't in title/description */
    searchKeywords?: string[];
}

// ============================================
// Category Definitions
// ============================================

export type WidgetCategory =
    | "Sales"
    | "Purchasing"
    | "Inventory"
    | "AP"
    | "Utilities"
    | "Reports"
    | "Analytics"
    | "Operations";

export const CATEGORY_ORDER: WidgetCategory[] = [
    "Sales",
    "Purchasing",
    "Inventory",
    "AP",
    "Analytics",
    "Reports",
    "Operations",
    "Utilities",
];

export const CATEGORY_METADATA: Record<WidgetCategory, {
    label: string;
    description: string;
    color: string;
}> = {
    Sales: {
        label: "Sales",
        description: "Sales metrics and customer data",
        color: "emerald"
    },
    Purchasing: {
        label: "Purchasing",
        description: "Purchase orders and vendor management",
        color: "blue"
    },
    Inventory: {
        label: "Inventory",
        description: "Stock levels and movement tracking",
        color: "amber"
    },
    AP: {
        label: "Accounts Payable",
        description: "Vendor payments and accounts",
        color: "purple"
    },
    Analytics: {
        label: "Analytics",
        description: "Advanced charts and data analysis",
        color: "cyan"
    },
    Reports: {
        label: "Reports",
        description: "Detailed reports and exports",
        color: "indigo"
    },
    Operations: {
        label: "Operations",
        description: "Daily operations and workflows",
        color: "orange"
    },
    Utilities: {
        label: "Utilities",
        description: "Clocks, weather, and general tools",
        color: "gray"
    },
};

// ============================================
// Widget Configurations
// ============================================

/**
 * All widget configurations.
 * Add new widgets here - they will automatically appear in the picker.
 */
export const WIDGET_CONFIGS: WidgetConfig[] = [
    // ─────────────────────────────────────────
    // Sales Widgets
    // ─────────────────────────────────────────
    {
        id: "Overview",
        title: "Sales Overview",
        description: "Key sales metrics at a glance - YTD, monthly, weekly, and daily totals",
        category: "Sales",
        subcategory: "Metrics",
        tags: ["kpi", "summary", "dashboard"],
        defaultSize: { w: 12, h: 2 },
        minSize: { w: 6, h: 2 },
        searchKeywords: ["revenue", "performance", "summary"],
    },
    {
        id: "SalesByDayBar",
        title: "Sales by Day",
        description: "Daily sales breakdown in a bar chart format",
        category: "Sales",
        subcategory: "Charts",
        tags: ["chart", "bar", "daily", "trend"],
        defaultSize: { w: 4, h: 4 },
        minSize: { w: 3, h: 3 },
    },
    {
        id: "SalesByMonthBar",
        title: "Sales by Month",
        description: "Monthly sales visualization with bar charts",
        category: "Sales",
        subcategory: "Charts",
        tags: ["chart", "bar", "monthly", "trend"],
        defaultSize: { w: 4, h: 4 },
        minSize: { w: 3, h: 3 },
    },
    {
        id: "SalesByMonthComparisonBar",
        title: "Sales Month Comparison",
        description: "Compare sales performance across different months",
        category: "Sales",
        subcategory: "Charts",
        tags: ["chart", "comparison", "yoy", "analysis"],
        defaultSize: { w: 4, h: 4 },
        minSize: { w: 3, h: 3 },
        searchKeywords: ["year over year", "compare"],
    },
    {
        id: "TopCustomersThisYearPie",
        title: "Top Customers",
        description: "Pie chart showing top customers by sales volume this year",
        category: "Sales",
        subcategory: "Customers",
        tags: ["pie", "chart", "customers", "ranking"],
        defaultSize: { w: 6, h: 5 },
        minSize: { w: 4, h: 4 },
    },

    // ─────────────────────────────────────────
    // Purchasing Widgets
    // ─────────────────────────────────────────
    {
        id: "OutstandingOrdersTable",
        title: "Outstanding Orders",
        description: "Table of all outstanding purchase orders awaiting fulfillment",
        category: "Purchasing",
        subcategory: "Orders",
        tags: ["table", "orders", "pending", "po"],
        defaultSize: { w: 12, h: 5 },
        minSize: { w: 6, h: 4 },
        searchKeywords: ["purchase order", "open orders"],
    },
    {
        id: "DailyDueInTable",
        title: "Daily Due In",
        description: "Items scheduled to arrive today from all vendors",
        category: "Purchasing",
        subcategory: "Receiving",
        tags: ["table", "receiving", "today", "schedule"],
        defaultSize: { w: 12, h: 5 },
        minSize: { w: 6, h: 4 },
        searchKeywords: ["arrivals", "deliveries", "incoming"],
    },
    {
        id: "DailyDueInHiddenVendTable",
        title: "Daily Due In (Maintenance)",
        description: "Maintenance-only items due in today",
        category: "Purchasing",
        subcategory: "Receiving",
        tags: ["table", "maintenance", "hidden", "internal"],
        defaultSize: { w: 12, h: 5 },
        minSize: { w: 6, h: 4 },
    },

    // ─────────────────────────────────────────
    // Accounts Payable Widgets
    // ─────────────────────────────────────────
    {
        id: "Top5PayablesYTD",
        title: "Top 5 Payables YTD",
        description: "Year-to-date breakdown of top 5 vendor payable accounts",
        category: "AP",
        subcategory: "Vendors",
        tags: ["pie", "chart", "vendors", "payables", "ranking"],
        defaultSize: { w: 6, h: 5 },
        minSize: { w: 4, h: 4 },
        searchKeywords: ["accounts payable", "expenses", "spending"],
    },

    // ─────────────────────────────────────────
    // Inventory Widgets
    // ─────────────────────────────────────────
    {
        id: "DailyMovesByUser",
        title: "Daily Moves by User",
        description: "Track inventory movements grouped by user for the day",
        category: "Inventory",
        subcategory: "Movements",
        tags: ["chart", "users", "activity", "daily"],
        defaultSize: { w: 6, h: 4 },
        minSize: { w: 4, h: 3 },
        searchKeywords: ["warehouse", "staff", "productivity"],
    },
    {
        id: "InventoryMovesLog",
        title: "Inventory Moves Log",
        description: "Detailed log of all recent inventory movements",
        category: "Inventory",
        subcategory: "Movements",
        tags: ["table", "log", "history", "audit"],
        defaultSize: { w: 12, h: 6 },
        minSize: { w: 8, h: 4 },
        searchKeywords: ["transactions", "history", "audit trail"],
    },
    {
        id: "DailyProductionPutawaysBar",
        title: "Daily Production Putaways",
        description: "Bar chart showing production putaway activity by day",
        category: "Inventory",
        subcategory: "Production",
        tags: ["chart", "bar", "production", "putaway"],
        defaultSize: { w: 4, h: 4 },
        minSize: { w: 3, h: 3 },
    },
    {
        id: "TopProductUnitSales",
        title: "Top Product Sales",
        description: "Ranking of top selling products by unit volume",
        category: "Inventory",
        subcategory: "Products",
        tags: ["table", "products", "ranking", "units"],
        defaultSize: { w: 12, h: 6 },
        minSize: { w: 6, h: 4 },
        searchKeywords: ["best sellers", "popular", "items"],
    },
    {
        id: "MachineStockStatus",
        title: "Machine Stock Status",
        description: "Current stock levels and status for production machines",
        category: "Inventory",
        subcategory: "Machines",
        tags: ["status", "machines", "stock", "levels"],
        defaultSize: { w: 4, h: 6 },
        minSize: { w: 3, h: 4 },
        searchKeywords: ["equipment", "production line"],
    },

    // ─────────────────────────────────────────
    // Utility Widgets
    // ─────────────────────────────────────────
    {
        id: "ClockWidget",
        title: "Clock",
        description: "Digital clock with customizable format and timezone",
        category: "Utilities",
        subcategory: "Time",
        tags: ["clock", "time", "display"],
        defaultSize: { w: 3, h: 2 },
        minSize: { w: 2, h: 1 },
    },
    {
        id: "DateWidget",
        title: "Date",
        description: "Current date display with formatting options",
        category: "Utilities",
        subcategory: "Time",
        tags: ["date", "calendar", "display"],
        defaultSize: { w: 3, h: 2 },
        minSize: { w: 2, h: 1 },
    },
    {
        id: "Humidity",
        title: "Humidity",
        description: "Current humidity level from connected sensors",
        category: "Utilities",
        subcategory: "Environment",
        tags: ["sensor", "environment", "monitoring"],
        defaultSize: { w: 3, h: 2 },
        minSize: { w: 2, h: 2 },
        searchKeywords: ["weather", "climate", "conditions"],
    },
    {
        id: "BeefPricesChart",
        title: "USDA Beef Prices",
        description: "USDA National beef prices for Chemical Lean Fresh 50% and 85%",
        category: "Utilities",
        subcategory: "Market Data",
        tags: ["chart", "prices", "usda", "market"],
        defaultSize: { w: 6, h: 4 },
        minSize: { w: 4, h: 3 },
        searchKeywords: ["commodity", "meat", "pricing"],
    },
];

// ============================================
// Widget Component Lazy Loading Map
// ============================================

/**
 * Lazy-loaded widget components.
 * This keeps the initial bundle small by only loading widgets when needed.
 */
export const WIDGET_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
    Overview: React.lazy(() => import("./Overview")),
    SalesByDayBar: React.lazy(() => import("./SalesByDayBar")),
    SalesByMonthBar: React.lazy(() => import("./SalesByMonthBar")),
    SalesByMonthComparisonBar: React.lazy(() => import("./SalesByMonthComparisonBar")),
    TopCustomersThisYearPie: React.lazy(() => import("./TopCustomersThisYearPie")),
    OutstandingOrdersTable: React.lazy(() => import("./OutstandingOrdersTable")),
    DailyDueInTable: React.lazy(() => import("./DailyDueInTable")),
    DailyDueInHiddenVendTable: React.lazy(() => import("./DailyDueInHiddenVendTable")),
    Top5PayablesYTD: React.lazy(() => import("./Top5PayablesYTD")),
    DailyMovesByUser: React.lazy(() => import("./DailyMovesByUser")),
    InventoryMovesLog: React.lazy(() => import("./InventoryMovesLog")),
    DailyProductionPutawaysBar: React.lazy(() => import("./DailyProductionPutawaysBar")),
    TopProductUnitSales: React.lazy(() => import("./TopProductUnitSales")),
    MachineStockStatus: React.lazy(() => import("./MachineStockStatus")),
    ClockWidget: React.lazy(() => import("./ClockWidget")),
    DateWidget: React.lazy(() => import("./DateWidget")),
    Humidity: React.lazy(() => import("./Humidity")),
    BeefPricesChart: React.lazy(() => import("./BeefPricesChart")),
};

// ============================================
// Registry Helper Functions
// ============================================

/** Get a widget config by ID */
export const getWidgetConfig = (id: string): WidgetConfig | undefined => {
    return WIDGET_CONFIGS.find(w => w.id === id);
};

/** Get a widget component by ID */
export const getWidgetComponent = (id: string): React.LazyExoticComponent<React.ComponentType> | undefined => {
    return WIDGET_COMPONENTS[id];
};

/** Get all widgets in a category */
export const getWidgetsByCategory = (category?: WidgetCategory): WidgetConfig[] => {
    if (!category) return WIDGET_CONFIGS;
    return WIDGET_CONFIGS.filter(w => w.category === category);
};

/** Get all unique categories that have widgets */
export const getAvailableCategories = (): WidgetCategory[] => {
    const categories = new Set(WIDGET_CONFIGS.map(w => w.category));
    return CATEGORY_ORDER.filter(c => categories.has(c));
};

/** Get all unique subcategories within a category */
export const getSubcategories = (category: WidgetCategory): string[] => {
    const subcategories = new Set(
        WIDGET_CONFIGS
            .filter(w => w.category === category && w.subcategory)
            .map(w => w.subcategory!)
    );
    return Array.from(subcategories).sort();
};

/** Get all unique tags across all widgets */
export const getAllTags = (): string[] => {
    const tags = new Set<string>();
    WIDGET_CONFIGS.forEach(w => w.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
};

/** Search widgets by query string */
export const searchWidgets = (query: string, widgets: WidgetConfig[] = WIDGET_CONFIGS): WidgetConfig[] => {
    if (!query.trim()) return widgets;

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

    return widgets.filter(widget => {
        const searchableText = [
            widget.title,
            widget.description,
            widget.category,
            widget.subcategory,
            ...(widget.tags || []),
            ...(widget.searchKeywords || []),
        ].join(" ").toLowerCase();

        return terms.every(term => searchableText.includes(term));
    });
};

/** Group widgets by category */
export const groupWidgetsByCategory = (widgets: WidgetConfig[] = WIDGET_CONFIGS): Record<WidgetCategory, WidgetConfig[]> => {
    const grouped = {} as Record<WidgetCategory, WidgetConfig[]>;

    CATEGORY_ORDER.forEach(category => {
        const categoryWidgets = widgets.filter(w => w.category === category);
        if (categoryWidgets.length > 0) {
            grouped[category] = categoryWidgets;
        }
    });

    return grouped;
};

/** Get widget count by category */
export const getWidgetCountByCategory = (): Record<WidgetCategory, number> => {
    const counts = {} as Record<WidgetCategory, number>;
    CATEGORY_ORDER.forEach(category => {
        counts[category] = WIDGET_CONFIGS.filter(w => w.category === category).length;
    });
    return counts;
};
