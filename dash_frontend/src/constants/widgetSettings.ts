/**
 * Widget-Specific Settings System
 * 
 * This module defines the settings schema for each widget type.
 * Settings are stored per-widget-instance using the widget ID as key.
 */

import { TIMEZONE_OPTIONS, DATE_FORMAT_OPTIONS } from './settings';

// ============================================
// SETTING FIELD TYPES
// ============================================

export type SettingFieldType = 
    | 'toggle'      // Boolean on/off
    | 'select'      // Dropdown selection
    | 'number'      // Numeric input
    | 'text'        // Text input
    | 'color'       // Color picker
    | 'slider';     // Range slider

export interface BaseSettingField {
    key: string;
    label: string;
    description?: string;
    type: SettingFieldType;
}

export interface ToggleSettingField extends BaseSettingField {
    type: 'toggle';
    default: boolean;
}

export interface SelectSettingField extends BaseSettingField {
    type: 'select';
    default: string;
    options: { value: string; label: string }[];
}

export interface NumberSettingField extends BaseSettingField {
    type: 'number';
    default: number;
    min?: number;
    max?: number;
    step?: number;
}

export interface TextSettingField extends BaseSettingField {
    type: 'text';
    default: string;
    placeholder?: string;
    maxLength?: number;
}

export interface ColorSettingField extends BaseSettingField {
    type: 'color';
    default: string;
}

export interface SliderSettingField extends BaseSettingField {
    type: 'slider';
    default: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
}

export type SettingField = 
    | ToggleSettingField 
    | SelectSettingField 
    | NumberSettingField 
    | TextSettingField 
    | ColorSettingField
    | SliderSettingField;

export interface WidgetSettingsSchema {
    widgetId: string;
    title: string;
    description?: string;
    sections: {
        title: string;
        fields: SettingField[];
    }[];
}

// ============================================
// COMMON SETTING PRESETS (reusable)
// ============================================

const TIMEZONE_FIELD: SelectSettingField = {
    key: 'timezone',
    type: 'select',
    label: 'Timezone',
    description: 'Display time in this timezone',
    default: 'America/Chicago',
    options: TIMEZONE_OPTIONS.map(tz => ({ value: tz.value, label: tz.label })),
};

const CLOCK_FORMAT_FIELD: SelectSettingField = {
    key: 'clockFormat',
    type: 'select',
    label: 'Clock Format',
    description: '12-hour or 24-hour format',
    default: '12h',
    options: [
        { value: '12h', label: '12-hour (AM/PM)' },
        { value: '24h', label: '24-hour' },
    ],
};

const SHOW_SECONDS_FIELD: ToggleSettingField = {
    key: 'showSeconds',
    type: 'toggle',
    label: 'Show Seconds',
    description: 'Display seconds in the time',
    default: true,
};

const DATE_FORMAT_FIELD: SelectSettingField = {
    key: 'dateFormat',
    type: 'select',
    label: 'Date Format',
    description: 'How dates are displayed',
    default: 'MMM DD, YYYY',
    options: DATE_FORMAT_OPTIONS.map(df => ({ 
        value: df.value, 
        label: `${df.label} (${df.example})` 
    })),
};

// ============================================
// WIDGET-SPECIFIC SETTINGS SCHEMAS
// ============================================

export const WIDGET_SETTINGS_SCHEMAS: Record<string, WidgetSettingsSchema> = {
    // Clock Widget
    ClockWidget: {
        widgetId: 'ClockWidget',
        title: 'Clock Settings',
        description: 'Configure how the clock is displayed',
        sections: [
            {
                title: 'Display',
                fields: [
                    CLOCK_FORMAT_FIELD,
                    SHOW_SECONDS_FIELD,
                    TIMEZONE_FIELD,
                ],
            },
        ],
    },

    // Date Widget
    DateWidget: {
        widgetId: 'DateWidget',
        title: 'Date Settings',
        description: 'Configure how the date is displayed',
        sections: [
            {
                title: 'Display',
                fields: [
                    DATE_FORMAT_FIELD,
                    TIMEZONE_FIELD,
                    {
                        key: 'showDayOfWeek',
                        type: 'toggle',
                        label: 'Show Day of Week',
                        description: 'Display the day name (e.g., Monday)',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Sales by Day Bar Chart
    SalesByDayBar: {
        widgetId: 'SalesByDayBar',
        title: 'Sales by Day Settings',
        sections: [
            {
                title: 'Display',
                fields: [
                    {
                        key: 'daysToShow',
                        type: 'select',
                        label: 'Days to Display',
                        description: 'Number of days to show in the chart',
                        default: '7',
                        options: [
                            { value: '7', label: 'Last 7 days' },
                            { value: '14', label: 'Last 14 days' },
                            { value: '30', label: 'Last 30 days' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'showLabels',
                        type: 'toggle',
                        label: 'Show Value Labels',
                        description: 'Display values on bars',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
            {
                title: 'Style',
                fields: [
                    {
                        key: 'barColor',
                        type: 'color',
                        label: 'Bar Color',
                        description: 'Color of the chart bars',
                        default: '#3b82f6',
                    } as ColorSettingField,
                ],
            },
        ],
    },

    // Sales by Month Bar Chart
    SalesByMonthBar: {
        widgetId: 'SalesByMonthBar',
        title: 'Sales by Month Settings',
        sections: [
            {
                title: 'Display',
                fields: [
                    {
                        key: 'monthsToShow',
                        type: 'select',
                        label: 'Months to Display',
                        description: 'Number of months to show',
                        default: '6',
                        options: [
                            { value: '3', label: 'Last 3 months' },
                            { value: '6', label: 'Last 6 months' },
                            { value: '12', label: 'Last 12 months' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'showLabels',
                        type: 'toggle',
                        label: 'Show Value Labels',
                        description: 'Display values on bars',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Top Customers Pie Chart
    TopCustomersThisYearPie: {
        widgetId: 'TopCustomersThisYearPie',
        title: 'Top Customers Settings',
        sections: [
            {
                title: 'Display',
                fields: [
                    {
                        key: 'customersToShow',
                        type: 'select',
                        label: 'Customers to Display',
                        description: 'Number of top customers to show',
                        default: '5',
                        options: [
                            { value: '5', label: 'Top 5' },
                            { value: '10', label: 'Top 10' },
                            { value: '15', label: 'Top 15' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'showLegend',
                        type: 'toggle',
                        label: 'Show Legend',
                        description: 'Display the color legend',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showPercentages',
                        type: 'toggle',
                        label: 'Show Percentages',
                        description: 'Display percentage values',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Table Widgets - Common settings
    OutstandingOrdersTable: {
        widgetId: 'OutstandingOrdersTable',
        title: 'Outstanding Orders Settings',
        sections: [
            {
                title: 'Display',
                fields: [
                    {
                        key: 'rowsPerPage',
                        type: 'select',
                        label: 'Rows per Page',
                        description: 'Number of rows to display',
                        default: '25',
                        options: [
                            { value: '10', label: '10 rows' },
                            { value: '25', label: '25 rows' },
                            { value: '50', label: '50 rows' },
                            { value: '100', label: '100 rows' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'compactRows',
                        type: 'toggle',
                        label: 'Compact Rows',
                        description: 'Reduce row height for more data',
                        default: false,
                    } as ToggleSettingField,
                    {
                        key: 'highlightOverdue',
                        type: 'toggle',
                        label: 'Highlight Overdue',
                        description: 'Highlight overdue orders',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
            {
                title: 'Notifications',
                fields: [
                    {
                        key: 'soundOnNewOrder',
                        type: 'toggle',
                        label: 'Sound on New Order',
                        description: 'Play sound when new order arrives',
                        default: false,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    DailyDueInTable: {
        widgetId: 'DailyDueInTable',
        title: 'Daily Due In Settings',
        sections: [
            {
                title: 'Display',
                fields: [
                    {
                        key: 'rowsPerPage',
                        type: 'select',
                        label: 'Rows per Page',
                        description: 'Number of rows to display',
                        default: '25',
                        options: [
                            { value: '10', label: '10 rows' },
                            { value: '25', label: '25 rows' },
                            { value: '50', label: '50 rows' },
                            { value: '100', label: '100 rows' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'compactRows',
                        type: 'toggle',
                        label: 'Compact Rows',
                        description: 'Reduce row height for more data',
                        default: false,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    DailyDueInHiddenVendTable: {
        widgetId: 'DailyDueInHiddenVendTable',
        title: 'Daily Due In (Maintenance) Settings',
        sections: [
            {
                title: 'Display',
                fields: [
                    {
                        key: 'rowsPerPage',
                        type: 'select',
                        label: 'Rows per Page',
                        description: 'Number of rows to display',
                        default: '25',
                        options: [
                            { value: '10', label: '10 rows' },
                            { value: '25', label: '25 rows' },
                            { value: '50', label: '50 rows' },
                            { value: '100', label: '100 rows' },
                        ],
                    } as SelectSettingField,
                ],
            },
        ],
    },

    // Inventory Moves Log
    InventoryMovesLog: {
        widgetId: 'InventoryMovesLog',
        title: 'Inventory Moves Log Settings',
        sections: [
            {
                title: 'Display',
                fields: [
                    {
                        key: 'rowsPerPage',
                        type: 'select',
                        label: 'Rows per Page',
                        description: 'Number of rows to display',
                        default: '50',
                        options: [
                            { value: '25', label: '25 rows' },
                            { value: '50', label: '50 rows' },
                            { value: '100', label: '100 rows' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'groupByUser',
                        type: 'toggle',
                        label: 'Group by User',
                        description: 'Group moves by user',
                        default: false,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Daily Moves by User
    DailyMovesByUser: {
        widgetId: 'DailyMovesByUser',
        title: 'Daily Moves Settings',
        sections: [
            {
                title: 'Display',
                fields: [
                    {
                        key: 'showLabels',
                        type: 'toggle',
                        label: 'Show Labels',
                        description: 'Display user labels on bars',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'sortOrder',
                        type: 'select',
                        label: 'Sort Order',
                        description: 'How to sort the bars',
                        default: 'desc',
                        options: [
                            { value: 'desc', label: 'Highest first' },
                            { value: 'asc', label: 'Lowest first' },
                            { value: 'alpha', label: 'Alphabetical' },
                        ],
                    } as SelectSettingField,
                ],
            },
        ],
    },

    // Humidity Widget
    Humidity: {
        widgetId: 'Humidity',
        title: 'Humidity Settings',
        sections: [
            {
                title: 'Alerts',
                fields: [
                    {
                        key: 'alertEnabled',
                        type: 'toggle',
                        label: 'Enable Alerts',
                        description: 'Alert when humidity exceeds threshold',
                        default: false,
                    } as ToggleSettingField,
                    {
                        key: 'alertThreshold',
                        type: 'slider',
                        label: 'Alert Threshold',
                        description: 'Alert when humidity exceeds this value',
                        default: 80,
                        min: 50,
                        max: 100,
                        step: 5,
                        unit: '%',
                    } as SliderSettingField,
                ],
            },
        ],
    },

    // Beef Prices Chart
    BeefPricesChart: {
        widgetId: 'BeefPricesChart',
        title: 'Beef Prices Settings',
        sections: [
            {
                title: 'Display',
                fields: [
                    {
                        key: 'daysToShow',
                        type: 'select',
                        label: 'Days to Display',
                        description: 'Number of days of price history',
                        default: '30',
                        options: [
                            { value: '7', label: 'Last 7 days' },
                            { value: '14', label: 'Last 14 days' },
                            { value: '30', label: 'Last 30 days' },
                            { value: '90', label: 'Last 90 days' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'showBoth',
                        type: 'toggle',
                        label: 'Show Both Grades',
                        description: 'Display both 50% and 85% lean',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Top Product Sales
    TopProductUnitSales: {
        widgetId: 'TopProductUnitSales',
        title: 'Top Product Sales Settings',
        sections: [
            {
                title: 'Display',
                fields: [
                    {
                        key: 'productsToShow',
                        type: 'select',
                        label: 'Products to Display',
                        description: 'Number of top products to show',
                        default: '10',
                        options: [
                            { value: '5', label: 'Top 5' },
                            { value: '10', label: 'Top 10' },
                            { value: '20', label: 'Top 20' },
                            { value: '50', label: 'Top 50' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'sortBy',
                        type: 'select',
                        label: 'Sort By',
                        description: 'How to rank products',
                        default: 'units',
                        options: [
                            { value: 'units', label: 'Units Sold' },
                            { value: 'revenue', label: 'Revenue' },
                        ],
                    } as SelectSettingField,
                ],
            },
        ],
    },

    // Machine Stock Status
    MachineStockStatus: {
        widgetId: 'MachineStockStatus',
        title: 'Machine Stock Settings',
        sections: [
            {
                title: 'Display',
                fields: [
                    {
                        key: 'showEmptyBins',
                        type: 'toggle',
                        label: 'Show Empty Bins',
                        description: 'Include bins with zero stock',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'highlightLowStock',
                        type: 'toggle',
                        label: 'Highlight Low Stock',
                        description: 'Highlight items below threshold',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'lowStockThreshold',
                        type: 'slider',
                        label: 'Low Stock Threshold',
                        description: 'Highlight when stock is below this',
                        default: 10,
                        min: 1,
                        max: 50,
                        step: 1,
                        unit: ' units',
                    } as SliderSettingField,
                ],
            },
        ],
    },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get settings schema for a widget
 */
export function getWidgetSettingsSchema(widgetId: string): WidgetSettingsSchema | null {
    return WIDGET_SETTINGS_SCHEMAS[widgetId] || null;
}

/**
 * Check if a widget has configurable settings
 */
export function widgetHasSettings(widgetId: string): boolean {
    return widgetId in WIDGET_SETTINGS_SCHEMAS;
}

/**
 * Get default settings for a widget
 */
export function getWidgetDefaultSettings(widgetId: string): Record<string, any> {
    const schema = WIDGET_SETTINGS_SCHEMAS[widgetId];
    if (!schema) return {};

    const defaults: Record<string, any> = {};
    for (const section of schema.sections) {
        for (const field of section.fields) {
            defaults[field.key] = field.default;
        }
    }
    return defaults;
}
