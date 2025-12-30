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
    | 'slider'      // Range slider
    | 'itemList';   // List of items (strings) with add/remove/paste capabilities

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

export interface AsyncSelectSettingField extends BaseSettingField {
    type: 'asyncSelect';
    default: string;
    /** API endpoint to fetch options from */
    optionsEndpoint: string;
    /** Path to the array of options in the response (e.g., "data") */
    optionsPath: string;
    /** Field name for the option value */
    valueField: string;
    /** Field name for the option label */
    labelField: string;
    /** Optional field to check if option is disabled (e.g., offline controllers) */
    disabledField?: string;
    /** Placeholder when nothing is selected */
    placeholder?: string;
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

export interface ItemListSettingField extends BaseSettingField {
    type: 'itemList';
    default: string[];
    placeholder?: string;
    maxItems?: number;
    allowDuplicates?: boolean;
    validation?: RegExp;
    validationMessage?: string;
}

export type SettingField =
    | ToggleSettingField
    | SelectSettingField
    | AsyncSelectSettingField
    | NumberSettingField
    | TextSettingField
    | ColorSettingField
    | SliderSettingField
    | ItemListSettingField;

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

    // Outstanding Orders Table
    OutstandingOrdersTable: {
        widgetId: 'OutstandingOrdersTable',
        title: 'Outstanding Orders Settings',
        sections: [
            {
                title: 'Notifications',
                fields: [
                    {
                        key: 'playSoundOnReceived',
                        type: 'toggle',
                        label: 'Sound on Status Change',
                        description: 'Play notification when order status changes to Received',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
            {
                title: 'Sorting & Filtering',
                fields: [
                    {
                        key: 'sortBy',
                        type: 'select',
                        label: 'Sort By',
                        description: 'Primary sort order for orders',
                        default: 'vendor',
                        options: [
                            { value: 'vendor', label: 'Vendor Name' },
                            { value: 'date', label: 'Date Ordered' },
                            { value: 'overdue', label: 'Days Overdue' },
                            { value: 'poNumber', label: 'PO Number' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'maxRows',
                        type: 'slider',
                        label: 'Maximum Rows',
                        description: 'Limit the number of rows displayed (0 = unlimited)',
                        default: 0,
                        min: 0,
                        max: 100,
                        step: 10,
                    } as SliderSettingField,
                ],
            },
            {
                title: 'Alerts',
                fields: [
                    {
                        key: 'overdueAlertThreshold',
                        type: 'slider',
                        label: 'Overdue Alert Threshold',
                        description: 'Highlight orders overdue by this many days or more',
                        default: 7,
                        min: 1,
                        max: 30,
                        step: 1,
                        unit: ' days',
                    } as SliderSettingField,
                ],
            },
        ],
    },

    // Daily Due In Table
    DailyDueInTable: {
        widgetId: 'DailyDueInTable',
        title: 'Daily Due In Settings',
        sections: [
            {
                title: 'Notifications',
                fields: [
                    {
                        key: 'playSoundOnReceived',
                        type: 'toggle',
                        label: 'Sound on Status Change',
                        description: 'Play notification when order status changes to Received',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
            {
                title: 'Sorting & Filtering',
                fields: [
                    {
                        key: 'sortBy',
                        type: 'select',
                        label: 'Sort By',
                        description: 'Primary sort order for orders',
                        default: 'vendor',
                        options: [
                            { value: 'vendor', label: 'Vendor Name' },
                            { value: 'date', label: 'Date Ordered' },
                            { value: 'poNumber', label: 'PO Number' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'maxRows',
                        type: 'slider',
                        label: 'Maximum Rows',
                        description: 'Limit the number of rows displayed (0 = unlimited)',
                        default: 0,
                        min: 0,
                        max: 100,
                        step: 10,
                    } as SliderSettingField,
                ],
            },
        ],
    },

    // Inventory Moves Log
    InventoryMovesLog: {
        widgetId: 'InventoryMovesLog',
        title: 'Inventory Moves Settings',
        sections: [
            {
                title: 'Time Display',
                fields: [
                    {
                        key: 'useRelativeTime',
                        type: 'toggle',
                        label: 'Use Relative Time',
                        description: 'Show "5 min ago" instead of exact time for recent moves',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'relativeTimeThreshold',
                        type: 'slider',
                        label: 'Relative Time Window',
                        description: 'Show relative time for moves within this many minutes',
                        default: 60,
                        min: 15,
                        max: 120,
                        step: 15,
                        unit: ' min',
                    } as SliderSettingField,
                ],
            },
            {
                title: 'Filtering',
                fields: [
                    {
                        key: 'filterByType',
                        type: 'select',
                        label: 'Filter by Type',
                        description: 'Show only specific transfer types',
                        default: 'all',
                        options: [
                            { value: 'all', label: 'All Types' },
                            { value: 'PUTAWY', label: 'Putaways Only' },
                            { value: 'SHIPMNT', label: 'Shipments Only' },
                            { value: 'LOCCHG', label: 'Location Changes Only' },
                        ],
                    } as SelectSettingField,
                ],
            },
            {
                title: 'Notifications',
                fields: [
                    {
                        key: 'highlightNewMoves',
                        type: 'toggle',
                        label: 'Highlight New Moves',
                        description: 'Flash animation on newly added rows',
                        default: true,
                    } as ToggleSettingField,
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
                title: 'Display',
                fields: [
                    {
                        key: 'showGaugeLabels',
                        type: 'toggle',
                        label: 'Show Level Labels',
                        description: 'Display Low/Good/High labels on gauge',
                        default: false,
                    } as ToggleSettingField,
                ],
            },
            {
                title: 'Thresholds',
                fields: [
                    {
                        key: 'lowThreshold',
                        type: 'slider',
                        label: 'Low Humidity Threshold',
                        description: 'Below this value is considered low (orange)',
                        default: 30,
                        min: 10,
                        max: 50,
                        step: 5,
                        unit: '%',
                    } as SliderSettingField,
                    {
                        key: 'highThreshold',
                        type: 'slider',
                        label: 'High Humidity Threshold',
                        description: 'Above this value is considered high (red)',
                        default: 60,
                        min: 50,
                        max: 90,
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
                title: 'Data Series',
                fields: [
                    {
                        key: 'show50Lean',
                        type: 'toggle',
                        label: 'Show 50% Lean',
                        description: 'Display 50% lean beef price line',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'show85Lean',
                        type: 'toggle',
                        label: 'Show 85% Lean',
                        description: 'Display 85% lean beef price line',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showBeefHeart',
                        type: 'toggle',
                        label: 'Show Beef Heart',
                        description: 'Display beef heart price line',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
            {
                title: 'Default View',
                fields: [
                    {
                        key: 'defaultTimeRange',
                        type: 'select',
                        label: 'Default Time Range',
                        description: 'Initial time range when widget loads',
                        default: '180d',
                        options: [
                            { value: '7d', label: '7 Days' },
                            { value: '30d', label: '1 Month' },
                            { value: '90d', label: '3 Months' },
                            { value: '180d', label: '6 Months' },
                            { value: 'all', label: 'All Data' },
                        ],
                    } as SelectSettingField,
                ],
            },
        ],
    },

    // Top Product Unit Sales
    TopProductUnitSales: {
        widgetId: 'TopProductUnitSales',
        title: 'Top Product Sales Settings',
        sections: [
            {
                title: 'Display',
                fields: [
                    {
                        key: 'highlightTopThree',
                        type: 'toggle',
                        label: 'Highlight Top 3',
                        description: 'Visually emphasize the top 3 products',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showPercentageChange',
                        type: 'toggle',
                        label: 'Show % Change Badges',
                        description: 'Display percentage change between periods',
                        default: true,
                    } as ToggleSettingField,
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
                        key: 'defaultTab',
                        type: 'select',
                        label: 'Default Tab (Compact View)',
                        description: 'Which cost center tab to show first',
                        default: 'cc1',
                        options: [
                            { value: 'cc1', label: 'Cost Center 1 (Available)' },
                            { value: 'cc2', label: 'Cost Center 2 (Queue)' },
                            { value: 'cc5', label: 'Cost Center 5 (Repair)' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'showMachineDescriptions',
                        type: 'toggle',
                        label: 'Show Descriptions',
                        description: 'Display part descriptions (when space allows)',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Sales by Month Bar Chart
    SalesByMonthBar: {
        widgetId: 'SalesByMonthBar',
        title: 'Monthly Sales Chart Settings',
        sections: [
            {
                title: 'Data Range',
                fields: [
                    {
                        key: 'defaultMonthsBack',
                        type: 'slider',
                        label: 'Months to Display',
                        description: 'How many months of history to show (when space allows)',
                        default: 12,
                        min: 3,
                        max: 24,
                        step: 1,
                        unit: ' months',
                    } as SliderSettingField,
                ],
            },
            {
                title: 'Display',
                fields: [
                    {
                        key: 'showProjection',
                        type: 'toggle',
                        label: 'Show Current Month Projection',
                        description: 'Display projected total for incomplete current month',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showYearOverYear',
                        type: 'toggle',
                        label: 'Show Year-over-Year Change',
                        description: 'Display percentage change vs same month last year',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Sales by Day Bar Chart
    SalesByDayBar: {
        widgetId: 'SalesByDayBar',
        title: 'Daily Sales Chart Settings',
        sections: [
            {
                title: 'Data Range',
                fields: [
                    {
                        key: 'defaultDaysBack',
                        type: 'slider',
                        label: 'Days to Display',
                        description: 'How many days of history to show (when space allows)',
                        default: 14,
                        min: 7,
                        max: 30,
                        step: 1,
                        unit: ' days',
                    } as SliderSettingField,
                ],
            },
            {
                title: 'Display',
                fields: [
                    {
                        key: 'highlightToday',
                        type: 'toggle',
                        label: 'Highlight Today',
                        description: 'Visually emphasize today\'s bar',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showWeekendShading',
                        type: 'toggle',
                        label: 'Show Weekend Shading',
                        description: 'Dim weekend bars to distinguish from weekdays',
                        default: false,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Sales YTD Cumulative Line Chart
    SalesYTDCumulativeLine: {
        widgetId: 'SalesYTDCumulativeLine',
        title: 'YTD Cumulative Sales Settings',
        description: 'Configure the year-to-date cumulative sales line chart',
        sections: [
            {
                title: 'Defaults',
                fields: [
                    {
                        key: 'defaultTimeRange',
                        type: 'select',
                        label: 'Default Time Range',
                        description: 'Initial time range when widget loads',
                        default: 'ytd',
                        options: [
                            { value: 'ytd', label: 'Year to Date' },
                            { value: 'comparison', label: 'Compare vs Last Year' },
                            { value: 'lastYear', label: 'Last Year Only' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'defaultAggregation',
                        type: 'select',
                        label: 'Default Aggregation',
                        description: 'How to group data points',
                        default: 'weekly',
                        options: [
                            { value: 'weekly', label: 'Weekly' },
                            { value: 'monthly', label: 'Monthly' },
                        ],
                    } as SelectSettingField,
                ],
            },
            {
                title: 'Display',
                fields: [
                    {
                        key: 'showArea',
                        type: 'toggle',
                        label: 'Show Area Fill',
                        description: 'Fill the area under the line with a gradient',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Sales by Month Comparison Bar Chart
    SalesByMonthComparisonBar: {
        widgetId: 'SalesByMonthComparisonBar',
        title: 'Monthly Comparison Settings',
        sections: [
            {
                title: 'Display',
                fields: [
                    {
                        key: 'showProjection',
                        type: 'toggle',
                        label: 'Show Current Month Projection',
                        description: 'Display projected total for incomplete current month',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showPercentageDiff',
                        type: 'toggle',
                        label: 'Show % Difference',
                        description: 'Display percentage difference between years',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Top Customers This Year Pie
    TopCustomersThisYearPie: {
        widgetId: 'TopCustomersThisYearPie',
        title: 'Top Customers Settings',
        sections: [
            {
                title: 'Data',
                fields: [
                    {
                        key: 'maxCustomersShown',
                        type: 'slider',
                        label: 'Number of Customers',
                        description: 'Number of top customers to display',
                        default: 5,
                        min: 3,
                        max: 10,
                        step: 1,
                    } as SliderSettingField,
                    {
                        key: 'showOtherCategory',
                        type: 'toggle',
                        label: 'Show "Other" Category',
                        description: 'Group remaining customers into "Other" slice',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'sortOrder',
                        type: 'select',
                        label: 'Sort Order',
                        description: 'How to order customers in the legend',
                        default: 'value',
                        options: [
                            { value: 'value', label: 'By Sales Amount (Desc)' },
                            { value: 'name', label: 'Alphabetically by Name' },
                        ],
                    } as SelectSettingField,
                ],
            },
            {
                title: 'Display',
                fields: [
                    {
                        key: 'showPercentages',
                        type: 'toggle',
                        label: 'Show Percentages',
                        description: 'Display percentage labels on chart',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Top 5 Payables YTD Pie
    Top5PayablesYTD: {
        widgetId: 'Top5PayablesYTD',
        title: 'Top Payables Settings',
        sections: [
            {
                title: 'Data',
                fields: [
                    {
                        key: 'maxVendorsShown',
                        type: 'slider',
                        label: 'Number of Vendors',
                        description: 'Number of top vendors to display',
                        default: 5,
                        min: 3,
                        max: 10,
                        step: 1,
                    } as SliderSettingField,
                    {
                        key: 'showOtherCategory',
                        type: 'toggle',
                        label: 'Show "Other" Category',
                        description: 'Group remaining vendors into "Other" slice',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'sortOrder',
                        type: 'select',
                        label: 'Sort Order',
                        description: 'How to order vendors in the legend',
                        default: 'value',
                        options: [
                            { value: 'value', label: 'By Amount (Desc)' },
                            { value: 'name', label: 'Alphabetically by Name' },
                        ],
                    } as SelectSettingField,
                ],
            },
            {
                title: 'Display',
                fields: [
                    {
                        key: 'showPercentages',
                        type: 'toggle',
                        label: 'Show Percentages',
                        description: 'Display percentage labels on chart',
                        default: true,
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
                title: 'Data',
                fields: [
                    {
                        key: 'sortOrder',
                        type: 'select',
                        label: 'Sort Users By',
                        description: 'How to order users in the chart',
                        default: 'count',
                        options: [
                            { value: 'count', label: 'Move Count (Desc)' },
                            { value: 'name', label: 'Alphabetically by Name' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'minMovesThreshold',
                        type: 'slider',
                        label: 'Minimum Moves to Display',
                        description: 'Only show users with at least this many moves',
                        default: 1,
                        min: 1,
                        max: 20,
                        step: 1,
                    } as SliderSettingField,
                ],
            },
            {
                title: 'Display',
                fields: [
                    {
                        key: 'showSummary',
                        type: 'toggle',
                        label: 'Show Summary Header',
                        description: 'Display total moves and users count at top',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showPercentages',
                        type: 'toggle',
                        label: 'Show Percentages',
                        description: 'Display percentage of total on each bar',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showLabels',
                        type: 'toggle',
                        label: 'Show Bar Labels',
                        description: 'Display count labels on bars',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Daily Production Putaways Bar
    DailyProductionPutawaysBar: {
        widgetId: 'DailyProductionPutawaysBar',
        title: 'Daily Putaways Settings',
        sections: [
            {
                title: 'Data',
                fields: [
                    {
                        key: 'sortOrder',
                        type: 'select',
                        label: 'Sort Products By',
                        description: 'How to order products in the chart',
                        default: 'quantity',
                        options: [
                            { value: 'quantity', label: 'Quantity (Desc)' },
                            { value: 'name', label: 'Alphabetically by Name' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'groupByUOM',
                        type: 'toggle',
                        label: 'Group by Unit of Measure',
                        description: 'Separate products by their unit of measure',
                        default: false,
                    } as ToggleSettingField,
                ],
            },
            {
                title: 'Display',
                fields: [
                    {
                        key: 'showPercentages',
                        type: 'toggle',
                        label: 'Show Percentages',
                        description: 'Display percentage of total on each bar',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showUOM',
                        type: 'toggle',
                        label: 'Show Unit of Measure',
                        description: 'Display units (lbs, cases, etc.) in labels',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showLabels',
                        type: 'toggle',
                        label: 'Show Bar Labels',
                        description: 'Display quantity labels on bars',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Overview Widget
    Overview: {
        widgetId: 'Overview',
        title: 'Overview Settings',
        sections: [
            {
                title: 'Visible Metrics',
                fields: [
                    {
                        key: 'showYTD',
                        type: 'toggle',
                        label: 'Show Sales YTD',
                        description: 'Display year-to-date sales metric',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showThisMonth',
                        type: 'toggle',
                        label: 'Show Sales This Month',
                        description: 'Display current month sales metric',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showLast7Days',
                        type: 'toggle',
                        label: 'Show Last 7 Days',
                        description: 'Display rolling 7-day sales metric',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showToday',
                        type: 'toggle',
                        label: 'Show Sales Today',
                        description: 'Display today\'s sales metric',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
            {
                title: 'Comparison',
                fields: [
                    {
                        key: 'showComparison',
                        type: 'toggle',
                        label: 'Show % Change',
                        description: 'Display percentage change vs previous period',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'comparisonBaseline',
                        type: 'select',
                        label: 'Compare Against',
                        description: 'What period to compare current metrics against',
                        default: 'lastYear',
                        options: [
                            { value: 'lastYear', label: 'Same Period Last Year' },
                            { value: 'lastPeriod', label: 'Previous Period (e.g., Last Month)' },
                        ],
                    } as SelectSettingField,
                ],
            },
        ],
    },

    // Daily Due In Hidden Vendors Table
    DailyDueInHiddenVendTable: {
        widgetId: 'DailyDueInHiddenVendTable',
        title: 'Daily Due In (Maintenance) Settings',
        sections: [
            {
                title: 'Notifications',
                fields: [
                    {
                        key: 'playSoundOnReceived',
                        type: 'toggle',
                        label: 'Sound on Status Change',
                        description: 'Play notification when order status changes to Received',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
            {
                title: 'Sorting',
                fields: [
                    {
                        key: 'sortBy',
                        type: 'select',
                        label: 'Sort By',
                        description: 'Primary sort order for orders',
                        default: 'vendor',
                        options: [
                            { value: 'vendor', label: 'Vendor Name' },
                            { value: 'date', label: 'Date Ordered' },
                            { value: 'poNumber', label: 'PO Number' },
                        ],
                    } as SelectSettingField,
                ],
            },
        ],
    },

    // Entry Logs Widget (UniFi Access)
    EntryLogsWidget: {
        widgetId: 'EntryLogsWidget',
        title: 'Entry Logs Settings',
        description: 'Configure door access log display and filtering',
        sections: [
            {
                title: 'Time Display',
                fields: [
                    {
                        key: 'useRelativeTime',
                        type: 'toggle',
                        label: 'Use Relative Time',
                        description: 'Show "5 min ago" instead of exact time for recent entries',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'relativeTimeThreshold',
                        type: 'slider',
                        label: 'Relative Time Window',
                        description: 'Show relative time for entries within this many minutes',
                        default: 60,
                        min: 15,
                        max: 120,
                        step: 15,
                        unit: ' min',
                    } as SliderSettingField,
                ],
            },
            {
                title: 'Filtering',
                fields: [
                    {
                        key: 'showIntercomEvents',
                        type: 'toggle',
                        label: 'Show Intercom Events',
                        description: 'Include doorbell calls, missed calls, and intercom activity',
                        default: false,
                    } as ToggleSettingField,
                    {
                        key: 'filterByResult',
                        type: 'select',
                        label: 'Filter by Result',
                        description: 'Show only specific access results',
                        default: 'all',
                        options: [
                            { value: 'all', label: 'All Results' },
                            { value: 'ACCESS', label: 'Access Granted Only' },
                            { value: 'BLOCKED', label: 'Blocked/Denied Only' },
                            { value: 'SUCCESS', label: 'Successful Actions Only' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'filterByDoor',
                        type: 'select',
                        label: 'Filter by Door',
                        description: 'Show only specific doors',
                        default: 'all',
                        options: [
                            { value: 'all', label: 'All Doors' },
                            { value: 'door 1', label: 'Door 1 (Main Entry)' },
                            { value: 'door 12', label: 'Door 12' },
                            { value: '2nd floor', label: '2nd Floor Office' },
                        ],
                    } as SelectSettingField,
                ],
            },
            {
                title: 'Display Options',
                fields: [
                    {
                        key: 'showAccessMethod',
                        type: 'toggle',
                        label: 'Show Access Method',
                        description: 'Display how access was granted (NFC, Face, PIN, etc.)',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'highlightNewEntries',
                        type: 'toggle',
                        label: 'Highlight New Entries',
                        description: 'Flash animation when new access events appear',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Inventory Tracker Widget
    InventoryTracker: {
        widgetId: 'InventoryTracker',
        title: 'Inventory Tracker Settings',
        description: 'Configure which items to track and how to display inventory data',
        sections: [
            {
                title: 'Tracked Items',
                fields: [
                    {
                        key: 'trackedItems',
                        type: 'itemList',
                        label: 'Item Codes',
                        description: 'Add part codes to track. You can type individual codes or paste a comma-separated list.',
                        default: [],
                        placeholder: 'Enter part code...',
                        maxItems: 100,
                        allowDuplicates: false,
                    } as ItemListSettingField,
                ],
            },
            {
                title: 'Data Display',
                fields: [
                    {
                        key: 'primaryDataPoint',
                        type: 'select',
                        label: 'Primary Data Point',
                        description: 'The main quantity to highlight for each item',
                        default: 'available',
                        options: [
                            { value: 'available', label: 'Available' },
                            { value: 'on_hand', label: 'On Hand' },
                            { value: 'on_hold', label: 'On Hold' },
                            { value: 'prod_sced', label: 'Scheduled Production' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'lowStockThreshold',
                        type: 'slider',
                        label: 'Low Stock Threshold',
                        description: 'Items with primary quantity at or below this are marked as low stock',
                        default: 10,
                        min: 0,
                        max: 100,
                        step: 5,
                        unit: ' units',
                    } as SliderSettingField,
                ],
            },
            {
                title: 'Display Options',
                fields: [
                    {
                        key: 'showDescription',
                        type: 'toggle',
                        label: 'Show Description',
                        description: 'Display part descriptions in the table',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showSummary',
                        type: 'toggle',
                        label: 'Show Summary Cards',
                        description: 'Display summary statistics at the top of the widget',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showSearch',
                        type: 'toggle',
                        label: 'Show Search Bar',
                        description: 'Allow filtering items by search query',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
        ],
    },

    // Fan Controller Widget (Multi-Instance)
    // Note: This widget supports multiple instances - each instance can control a different fan
    // Controller selection is done via the dropdown in the widget itself
    FanController: {
        widgetId: 'FanController',
        title: 'Fan Controller Settings',
        description: 'Configure which AC Infinity controller this widget monitors',
        sections: [
            {
                title: 'Controller',
                fields: [
                    {
                        key: 'selectedFan',
                        type: 'asyncSelect',
                        label: 'Select Controller',
                        description: 'Choose which AC Infinity controller this widget monitors',
                        default: '',
                        optionsEndpoint: '/api/ac-infinity/controllers',
                        optionsPath: 'data',
                        valueField: 'deviceId',
                        labelField: 'deviceName',
                        disabledField: 'isOnline',
                        placeholder: 'Select a controller...',
                    } as AsyncSelectSettingField,
                    {
                        key: 'customName',
                        type: 'text',
                        label: 'Custom Name',
                        description: 'Override the default controller name with a custom label',
                        default: '',
                        placeholder: 'e.g., Grow Room Controller',
                        maxLength: 30,
                    } as TextSettingField,
                ],
            },
            {
                title: 'Display Options',
                fields: [
                    {
                        key: 'displayMode',
                        type: 'select',
                        label: 'Display Mode',
                        description: 'How much information to show',
                        default: 'detailed',
                        options: [
                            { value: 'compact', label: 'Compact - Basic info' },
                            { value: 'detailed', label: 'Detailed - All info with ports' },
                        ],
                    } as SelectSettingField,
                    {
                        key: 'showTemperature',
                        type: 'toggle',
                        label: 'Show Temperature',
                        description: 'Display the temperature reading from the controller\'s sensor',
                        default: true,
                    } as ToggleSettingField,
                    {
                        key: 'showHumidity',
                        type: 'toggle',
                        label: 'Show Humidity',
                        description: 'Display the humidity reading from the controller\'s sensor',
                        default: true,
                    } as ToggleSettingField,
                ],
            },
        ],
    },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract the widget type from a widget ID.
 * For multi-instance widgets, the ID format is "WidgetType:instanceId".
 * For singleton widgets, the ID is just the widget type.
 */
function getWidgetTypeFromId(widgetId: string): string {
    return widgetId.includes(':') ? widgetId.split(':')[0] : widgetId;
}

/**
 * Get settings schema for a widget
 * Handles both singleton IDs ("ClockWidget") and instance IDs ("FanController:abc123")
 */
export function getWidgetSettingsSchema(widgetId: string): WidgetSettingsSchema | null {
    const widgetType = getWidgetTypeFromId(widgetId);
    return WIDGET_SETTINGS_SCHEMAS[widgetType] || null;
}

/**
 * Check if a widget has configurable settings
 * Handles both singleton IDs ("ClockWidget") and instance IDs ("FanController:abc123")
 */
export function widgetHasSettings(widgetId: string): boolean {
    const widgetType = getWidgetTypeFromId(widgetId);
    return widgetType in WIDGET_SETTINGS_SCHEMAS;
}

/**
 * Get default settings for a widget
 * Handles both singleton IDs ("ClockWidget") and instance IDs ("FanController:abc123")
 */
export function getWidgetDefaultSettings(widgetId: string): Record<string, any> {
    const widgetType = getWidgetTypeFromId(widgetId);
    const schema = WIDGET_SETTINGS_SCHEMAS[widgetType];
    if (!schema) return {};

    const defaults: Record<string, any> = {};
    for (const section of schema.sections) {
        for (const field of section.fields) {
            defaults[field.key] = field.default;
        }
    }
    return defaults;
}
