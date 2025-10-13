import React from "react";
import { Widget } from "@/types";

// Single source of truth for all widgets
export interface WidgetDefinition {
    id: string;
    component: React.ComponentType;
    title: string;
    category: string;
    description?: string;
    defaultSize: {
        w: number;
        h: number;
    };
}

// Auto-register widgets - just import and add to this array
export const WIDGETS: WidgetDefinition[] = [
    // Sales widgets
    {
        id: "Overview",
        component: React.lazy(() => import("@/components/widgets/Overview")),
        title: "Sales Overview",
        category: "💸 Sales",
        description: "Displays an overview of sales metrics",
        defaultSize: { w: 4, h: 4 }
    },
    {
        id: "SalesByDayBar",
        component: React.lazy(() => import("@/components/widgets/SalesByDayBar")),
        title: "Sales by Day",
        category: "💸 Sales",
        description: "Displays sales dollars by day",
        defaultSize: { w: 4, h: 4 }
    },
    {
        id: "SalesByMonthBar",
        component: React.lazy(() => import("@/components/widgets/SalesByMonthBar")),
        title: "Sales by Month",
        category: "💸 Sales",
        description: "Displays sales dollars by month",
        defaultSize: { w: 4, h: 4 }
    },
    {
        id: "SalesByMonthComparisonBar",
        component: React.lazy(() => import("@/components/widgets/SalesByMonthComparisonBar")),
        title: "Sales Month Comparison",
        category: "💸 Sales",
        description: "Compares sales across months",
        defaultSize: { w: 4, h: 4 }
    },
    {
        id: "TopCustomersThisYearPie",
        component: React.lazy(() => import("@/components/widgets/TopCustomersThisYearPie")),
        title: "Top Customers",
        category: "💸 Sales",
        description: "Shows top customers by sales volume",
        defaultSize: { w: 4, h: 4 }
    },

    // Purchasing widgets
    {
        id: "OutstandingOrdersTable",
        component: React.lazy(() => import("@/components/widgets/OutstandingOrdersTable")),
        title: "Outstanding Orders",
        category: "🧾 Purchasing",
        description: "Shows outstanding purchase orders",
        defaultSize: { w: 6, h: 4 }
    },
    {
        id: "DailyDueInTable",
        component: React.lazy(() => import("@/components/widgets/DailyDueInTable")),
        title: "Daily Due In",
        category: "🧾 Purchasing",
        description: "Shows items due in today",
        defaultSize: { w: 6, h: 4 }
    },
    {
        id: "DailyDueInHiddenVendTable",
        component: React.lazy(() => import("@/components/widgets/DailyDueInHiddenVendTable")),
        title: "Daily Due In (Maintenance Only)",
        category: "🧾 Purchasing",
        description: "Shows maintenance items due in today",
        defaultSize: { w: 6, h: 4 }
    },

    // Inventory widgets
    {
        id: "DailyMovesByUser",
        component: React.lazy(() => import("@/components/widgets/DailyMovesByUser")),
        title: "Daily Moves by User",
        category: "📦 Inventory",
        description: "Shows inventory moves by user",
        defaultSize: { w: 4, h: 4 }
    },
    {
        id: "InventoryMovesLog",
        component: React.lazy(() => import("@/components/widgets/InventoryMovesLog")),
        title: "Inventory Moves Log",
        category: "📦 Inventory",
        description: "Log of recent inventory movements",
        defaultSize: { w: 6, h: 4 }
    },
    {
        id: "DailyProductionPutawaysBar",
        component: React.lazy(() => import("@/components/widgets/DailyProductionPutawaysBar")),
        title: "Daily Production Putaways",
        category: "📦 Inventory",
        description: "Shows daily production putaway activity",
        defaultSize: { w: 4, h: 4 }
    },
    {
        id: "TopProductUnitSales",
        component: React.lazy(() => import("@/components/widgets/TopProductUnitSales")),
        title: "Top Product Sales",
        category: "📦 Inventory",
        description: "Shows top selling products by units",
        defaultSize: { w: 4, h: 4 }
    },
    {
        id: "MachineStockStatus",
        component: React.lazy(() => import("@/components/widgets/MachineStockStatus")),
        title: "Machine Stock Status",
        category: "📦 Inventory",
        description: "Shows stock status for machines",
        defaultSize: { w: 6, h: 4 }
    },

    // Utility widgets
    {
        id: "ClockWidget",
        component: React.lazy(() => import("@/components/widgets/ClockWidget")),
        title: "Clock",
        category: "🔧 Utilities",
        description: "Displays current time",
        defaultSize: { w: 2, h: 2 }
    },
    {
        id: "DateWidget",
        component: React.lazy(() => import("@/components/widgets/DateWidget")),
        title: "Date",
        category: "🔧 Utilities",
        description: "Displays current date",
        defaultSize: { w: 2, h: 2 }
    },
    {
        id: "Humidity",
        component: React.lazy(() => import("@/components/widgets/Humidity")),
        title: "Humidity",
        category: "🔧 Utilities",
        description: "Shows current humidity level",
        defaultSize: { w: 2, h: 2 }
    }
];

// Helper functions
export const getWidgetById = (id: string) => WIDGETS.find(w => w.id === id);
export const getWidgetsByCategory = () => {
    return WIDGETS.reduce((acc, widget) => {
        if (!acc[widget.category]) acc[widget.category] = [];
        acc[widget.category].push(widget);
        return acc;
    }, {} as Record<string, WidgetDefinition[]>);
};

// Legacy compatibility - convert new format to old Widget format
export const masterWidgetList: Widget[] = WIDGETS.map(widget => ({
    id: widget.id,
    x: 0,
    y: 0,
    w: widget.defaultSize.w,
    h: widget.defaultSize.h,
    enabled: false,
    displayName: widget.title,
    category: widget.category,
    description: widget.description
}));