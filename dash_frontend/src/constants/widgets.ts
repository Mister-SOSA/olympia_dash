/**
 * Widget Constants - Re-exports from the registry for backward compatibility
 * 
 * NOTE: The canonical widget definitions now live in:
 * @/components/widgets/registry.ts
 * 
 * This file provides backward compatibility for existing code that imports from here.
 * For new code, prefer importing directly from the registry.
 */

import React from "react";
import { Widget } from "@/types";
import {
    DollarSign,
    ShoppingCart,
    Package,
    Wrench,
    Receipt,
    BarChart3,
    FileText,
    Settings2,
} from "lucide-react";

// Re-export from registry for new code
export {
    WIDGET_CONFIGS,
    WIDGET_COMPONENTS,
    CATEGORY_ORDER,
    CATEGORY_METADATA,
    getWidgetConfig,
    getWidgetComponent,
    getAvailableCategories,
    getSubcategories,
    getAllTags,
    searchWidgets,
    groupWidgetsByCategory,
    getWidgetCountByCategory,
} from "@/components/widgets/registry";

export type {
    WidgetConfig,
    WidgetCategory,
} from "@/components/widgets/registry";

import type { WidgetConfig } from "@/components/widgets/registry";

import {
    WIDGET_CONFIGS,
    WIDGET_COMPONENTS,
    getWidgetsByCategory as getWidgetsByCategoryFromRegistry,
} from "@/components/widgets/registry";

// ============================================
// Legacy Types (for backward compatibility)
// ============================================

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

// ============================================
// Legacy Category Icons
// ============================================

export const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    "Sales": DollarSign,
    "Purchasing": ShoppingCart,
    "Inventory": Package,
    "Utilities": Wrench,
    "AP": Receipt,
    "Analytics": BarChart3,
    "Reports": FileText,
    "Operations": Settings2,
};

// ============================================
// Legacy WIDGETS Array (for backward compatibility)
// ============================================

/**
 * @deprecated Use WIDGET_CONFIGS from registry instead
 * This is maintained for backward compatibility with existing code
 */
export const WIDGETS: WidgetDefinition[] = WIDGET_CONFIGS.map((config: WidgetConfig) => ({
    id: config.id,
    component: WIDGET_COMPONENTS[config.id] || React.lazy(() => Promise.resolve({ default: () => null })),
    title: config.title,
    category: config.category,
    description: config.description,
    defaultSize: config.defaultSize,
}));

// ============================================
// Legacy Helper Functions
// ============================================

/**
 * @deprecated Use getWidgetConfig from registry instead
 */
export const getWidgetById = (id: string): WidgetDefinition | undefined => {
    return WIDGETS.find(w => w.id === id);
};

/**
 * @deprecated Use groupWidgetsByCategory from registry instead
 */
export const getWidgetsByCategory = (): Record<string, WidgetDefinition[]> => {
    return WIDGETS.reduce((acc, widget) => {
        if (!acc[widget.category]) acc[widget.category] = [];
        acc[widget.category].push(widget);
        return acc;
    }, {} as Record<string, WidgetDefinition[]>);
};

// ============================================
// Legacy masterWidgetList (for backward compatibility)
// ============================================

/**
 * @deprecated Create Widget objects from WIDGET_CONFIGS instead
 */
export const masterWidgetList: Widget[] = WIDGET_CONFIGS.map((config: WidgetConfig) => ({
    id: config.id,
    x: 0,
    y: 0,
    w: config.defaultSize.w,
    h: config.defaultSize.h,
    enabled: false,
    displayName: config.title,
    category: config.category,
    description: config.description
}));