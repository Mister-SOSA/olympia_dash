"use client";

import {
    MdAccessTime,
    MdPieChart,
    MdShowChart,
    MdBarChart,
    MdTableChart,
    MdPeople,
    MdLocalShipping,
    MdTrendingUp,
    MdTimeline,
    MdAttachMoney,
    MdShoppingCart,
    MdInventory,
    MdReceipt,
    MdDescription,
    MdTune,
    MdBuild,
} from "react-icons/md";
import type { WidgetCategory } from "@/components/widgets/registry";

// Category icons mapping
export const CATEGORY_ICONS: Record<WidgetCategory, React.ComponentType<{ className?: string }>> = {
    Sales: MdAttachMoney,
    Purchasing: MdShoppingCart,
    Inventory: MdInventory,
    AP: MdReceipt,
    Analytics: MdBarChart,
    Reports: MdDescription,
    Operations: MdTune,
    Utilities: MdBuild,
};

// Animation presets for consistent motion
export const SPRING_TRANSITION = { type: "spring", stiffness: 400, damping: 30 };

/** Get icon based on widget type */
export const getWidgetTypeIcon = (widgetId: string): React.ComponentType<{ className?: string }> => {
    const id = widgetId.toLowerCase();
    if (id.includes("clock") || id.includes("date")) return MdAccessTime;
    if (id.includes("pie")) return MdPieChart;
    if (id.includes("line") || id.includes("cumulative")) return MdShowChart;
    if (id.includes("bar") || id.includes("chart")) return MdBarChart;
    if (id.includes("table") || id.includes("log") || id.includes("orders")) return MdTableChart;
    if (id.includes("customer") || id.includes("user")) return MdPeople;
    if (id.includes("due") || id.includes("delivery")) return MdLocalShipping;
    if (id.includes("overview") || id.includes("summary")) return MdTrendingUp;
    if (id.includes("status") || id.includes("tracker")) return MdTimeline;
    return MdBarChart;
};

/** Safe haptic feedback - fails silently on unsupported devices */
export const vibrate = (pattern: number | number[] = 10) => {
    try {
        navigator.vibrate?.(pattern);
    } catch {
        // Vibration not supported
    }
};
