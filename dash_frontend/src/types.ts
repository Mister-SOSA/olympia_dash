import { ReactNode } from "react";

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
    /** 
     * Unique identifier for the widget instance.
     * For singleton widgets: matches the widgetType (e.g., "ClockWidget")
     * For multi-instance widgets: format is "widgetType:instanceId" (e.g., "FanController:fan1")
     * For custom widgets: format is "custom:widgetId" (e.g., "custom:cw_abc123def456")
     */
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    enabled: boolean;
    displayName?: string;
    category?: string;
    description?: string;
    icon?: ReactNode;
    /** 
     * Instance-specific configuration for multi-instance widgets.
     * Stored alongside widget in layout for persistence.
     */
    instanceConfig?: Record<string, any>;
    /**
     * Indicates this is a custom widget (user-created via widget builder)
     */
    isCustom?: boolean;
}

export type PresetType = "grid" | "fullscreen";

export interface DashboardPreset {
    type: PresetType;
    layout: Widget[];
    name?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
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
    item_no: number; // Item number
    date_rcv: string | null; // Date received (nullable)
    qty_ord: number; // Quantity ordered
    qty_recvd: number; // Quantity received
    uom: string; // Unit of measure
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

export interface InventoryMoveRaw {
    xfer_date: string;
    xfer_time: string;
    xfer_user: string;
    xtype: string;
    xfer_part_code: string;
    xfer_qty: number;
    fmid: string;
    toid: string;
    xfer_doc: string;
    xfer_lot: string;
}

export interface InventoryMove {
    moveDate: string;
    moveTime: string;
    moveUser: string;
    transferType: string;
    partCode: string;
    quantity: number;
    fromLocation: string;
    toLocation: string;
    docNumber: string;
    lotNumber: string;
}

export interface PayablesData {
    vend_name_group: string;
    total_pay_value: number;
}

// ============ Admin System Types ============

export interface UserGroup {
    id: number;
    name: string;
    description: string | null;
    color: string;
    created_at: string;
    updated_at: string;
    created_by: number | null;
    member_count?: number;
    widget_count?: number;
    members?: GroupMember[];
    widget_permissions?: GroupWidgetPermission[];
}

export interface GroupMember {
    id: number;
    email: string;
    name: string;
    role: string;
    added_at: string;
}

export interface WidgetPermission {
    id: number;
    user_id?: number;
    group_id?: number;
    widget_id: string;
    access_level: 'view' | 'edit' | 'admin';
    granted_at: string;
    granted_by: number | null;
    expires_at: string | null;
    // For user permissions
    email?: string;
    name?: string;
    // For group permissions
    group_name?: string;
    color?: string;
    permission_type: 'user' | 'group';
}

export interface GroupWidgetPermission {
    widget_id: string;
    access_level: 'view' | 'edit' | 'admin';
    granted_at: string;
    expires_at: string | null;
}

export interface UserWithPermissions {
    id: number;
    email: string;
    name: string;
    role: string;
    is_active: boolean;
    created_at: string;
    last_login: string | null;
    permissions: string[];
    groups?: UserGroup[];
    widget_permissions?: Record<string, 'view' | 'edit' | 'admin'>;
}

export interface BulkPermissionRequest {
    user_ids: number[];
    widget_ids: string[];
    access_level: 'view' | 'edit' | 'admin';
}

export interface WidgetAccessControl {
    permissions: Record<string, 'view' | 'edit' | 'admin'>;
    all_access: boolean;
}

// ============ UniFi Access Entry Logs Types ============

export type AccessResult = 'ACCESS' | 'BLOCKED' | 'SUCCESS' | 'INCOMPLETE' | 'UNKNOWN';
export type AccessDirection = 'entry' | 'exit' | 'call';
export type AccessMethod = 'NFC' | 'Face' | 'PIN' | 'Remote' | 'Apple Wallet' | 'Google Wallet' | 'Fingerprint' | 'QR Code' | 'Unknown';

export interface AccessLogEntry {
    id: string;
    timestamp: string;
    published: number;

    // Actor (person)
    actor_id: string;
    actor_name: string;
    actor_type: 'user' | 'visitor' | 'device';

    // Event details
    result: AccessResult;
    event_type: string;
    message: string;
    direction: AccessDirection;

    // Access method
    access_method: AccessMethod;
    credential_provider: string;

    // Location
    door_name: string;
    floor: string | null;
    building: string | null;

    // Metadata
    log_key: string;
    tag: string;
}

export interface AccessLogResponse {
    success: boolean;
    data: AccessLogEntry[];
    total: number;
    error?: string;
}

// ============ Custom Widget Builder Types ============

/**
 * Visualization types supported by the custom widget builder
 */
export type VisualizationType =
    | 'bar'          // Bar chart
    | 'line'         // Line chart
    | 'pie'          // Pie/donut chart
    | 'table'        // Data table
    | 'single_value' // Big number display
    | 'gauge'        // Circular gauge
    | 'custom';      // Custom template (future)

/**
 * Data source configuration for custom widgets
 */
export interface DataSourceConfig {
    /** Type of data source */
    type: 'none' | 'query_registry' | 'api_endpoint' | 'static';

    /** For query_registry: the registered query ID */
    queryId?: string;

    /** Parameters to pass to the query */
    params?: Record<string, any>;

    /** For api_endpoint: the endpoint path */
    endpoint?: string;

    /** HTTP method for api_endpoint */
    method?: 'GET' | 'POST';

    /** For static: the static data */
    staticData?: any[];

    /** Refresh interval in milliseconds (0 = no refresh) */
    refreshInterval?: number;
}

/**
 * Series configuration for multi-series charts
 */
export interface ChartSeriesConfig {
    field: string;
    label?: string;
    color?: string;
}

/**
 * Reference line configuration
 */
export interface ReferenceLineConfig {
    value: number;
    label?: string;
    color?: string;
}

/**
 * Table column configuration
 */
export interface TableColumnConfig {
    field: string;
    label?: string;
    header?: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    format?: 'text' | 'number' | 'currency' | 'date' | 'percent';
    decimals?: number;
    sortable?: boolean;
}

/**
 * Gauge zone configuration
 */
export interface GaugeZoneConfig {
    min: number;
    max: number;
    color: string;
}

/**
 * Threshold configuration for single value
 */
export interface ThresholdConfig {
    danger?: number;
    warning?: number;
    success?: number;
}

/**
 * Visualization configuration for custom widgets
 * 
 * This interface supports all visualization types with a flexible schema.
 * Each visualization type uses a subset of these properties.
 */
export interface VisualizationConfig {
    // ============================================
    // Common Field Mappings
    // ============================================

    /** Primary field for X axis */
    xAxisField?: string;
    /** Primary field for Y axis */
    yAxisField?: string;
    /** Field for names/labels */
    nameField?: string;
    /** Field for values */
    valueField?: string;
    /** Field for comparison values */
    comparisonField?: string;
    /** Multiple series configuration */
    series?: ChartSeriesConfig[];

    // ============================================
    // Legacy/Alias Field Mappings (backwards compat)
    // ============================================

    /** @deprecated Use xAxisField */
    xField?: string;
    /** @deprecated Use yAxisField */
    yField?: string | string[];
    /** Field for series grouping */
    seriesField?: string;
    /** Field for labels */
    labelField?: string;

    // ============================================
    // Display Options
    // ============================================

    /** Show chart grid lines */
    showGrid?: boolean;
    /** Show legend */
    showLegend?: boolean;
    /** Show tooltip on hover */
    showTooltip?: boolean;
    /** Show data point labels */
    showLabels?: boolean;
    /** Show the value display */
    showValue?: boolean;
    /** Show min/max labels */
    showMinMax?: boolean;
    /** Show trend indicator */
    showTrend?: boolean;
    /** Show area fill under line */
    showArea?: boolean;
    /** Show data point dots */
    showDots?: boolean;
    /** Show table header */
    showHeader?: boolean;

    // ============================================
    // Chart-Specific Options
    // ============================================

    /** Stack bars/areas */
    stacked?: boolean;
    /** Use curved lines (vs straight) */
    curved?: boolean;
    /** Chart orientation */
    orientation?: 'vertical' | 'horizontal';
    /** Donut mode for pie charts */
    donut?: boolean;

    // ============================================
    // Style Options
    // ============================================

    /** Value format type */
    valueFormat?: 'number' | 'currency' | 'percent' | 'text' | 'date';
    /** Use compact number formatting (1K, 1M, etc.) */
    compactValues?: boolean;
    /** Decimal places */
    decimals?: number;
    /** Value prefix */
    prefix?: string;
    /** Value suffix */
    suffix?: string;
    /** Display label */
    label?: string;
    /** Comparison label */
    comparisonLabel?: string;
    /** Icon (for single value) */
    icon?: string;

    // ============================================
    // Chart Styling
    // ============================================

    /** Bar corner radius */
    barRadius?: number;
    /** Line stroke width */
    strokeWidth?: number;
    /** Dot size for line charts */
    dotSize?: number;
    /** Padding angle for pie charts */
    paddingAngle?: number;
    /** Inner radius for donut charts */
    innerRadius?: number;
    /** Outer radius for pie/donut charts */
    outerRadius?: number;
    /** Start angle for pie/gauge */
    startAngle?: number;
    /** End angle for pie/gauge */
    endAngle?: number;
    /** Arc width for gauge */
    arcWidth?: number;

    // ============================================
    // Data Options
    // ============================================

    /** Minimum value (gauge) */
    minValue?: number;
    /** Maximum value (gauge) */
    maxValue?: number;
    /** Target value (gauge, single value) */
    target?: number;
    /** Reference lines */
    referenceLines?: ReferenceLineConfig[];
    /** Thresholds for value coloring */
    thresholds?: ThresholdConfig;
    /** Gauge zones */
    zones?: GaugeZoneConfig[];
    /** Invert trend direction (down is good) */
    invertTrend?: boolean;

    // ============================================
    // Table Options
    // ============================================

    /** Table columns configuration */
    columns?: TableColumnConfig[];
    /** Enable striped rows */
    striped?: boolean;
    /** Compact table mode */
    compact?: boolean;
    /** Enable sorting */
    sortable?: boolean;
    /** Maximum rows to display */
    maxRows?: number;
    /** Default sort configuration */
    defaultSort?: { field: string; direction: 'asc' | 'desc' };

    // ============================================
    // Color Configuration
    // ============================================

    /** Color configuration object */
    colors?: {
        primary?: string;
        secondary?: string;
        palette?: string[];
    };

    // ============================================
    // Legacy Nested Options (backwards compat)
    // ============================================

    /** @deprecated Use flat properties instead */
    chartOptions?: {
        showLegend?: boolean;
        showGrid?: boolean;
        showTooltip?: boolean;
        stacked?: boolean;
        horizontal?: boolean;
        animate?: boolean;
    };

    /** @deprecated Use flat properties instead */
    tableConfig?: {
        columns?: TableColumnConfig[];
        sortable?: boolean;
        pagination?: boolean;
        pageSize?: number;
    };

    /** @deprecated Use flat properties instead */
    singleValueConfig?: {
        prefix?: string;
        suffix?: string;
        format?: 'number' | 'currency' | 'percent';
        decimals?: number;
        comparison?: {
            field: string;
            label: string;
        };
    };

    /** @deprecated Use flat properties instead */
    gaugeConfig?: {
        min?: number;
        max?: number;
        thresholds?: Array<{ value: number; color: string }>;
        unit?: string;
    };

    /** Index signature for any additional custom properties */
    [key: string]: any;
}

/**
 * Custom widget definition stored in database
 */
export interface CustomWidgetDefinition {
    /** Unique widget ID (e.g., "cw_abc123def456") */
    id: string;

    /** User who created this widget */
    creator_id: number;
    creator_email?: string;
    creator_name?: string;

    /** Widget metadata */
    title: string;
    description?: string;
    category: string;

    /** Visualization configuration */
    visualization_type: VisualizationType;

    /** Data source configuration */
    data_source: DataSourceConfig;

    /** Full visualization config */
    config: VisualizationConfig;

    /** Size constraints */
    default_size: { w: number; h: number };
    min_size?: { w: number; h: number };
    max_size?: { w: number; h: number };

    /** Optional custom settings schema */
    settings_schema?: any;

    /** Sharing flags */
    is_shared: boolean;
    is_template: boolean;

    /** Version for conflict resolution */
    version: number;

    /** Timestamps */
    created_at: string;
    updated_at: string;

    /** Access level (when queried with user context) */
    access_level?: 'owner' | 'view' | 'edit' | 'admin';
}

/**
 * Request payload for creating a custom widget
 */
export interface CreateCustomWidgetRequest {
    title: string;
    description?: string;
    category?: string;
    visualization_type: VisualizationType;
    data_source: DataSourceConfig;
    config: VisualizationConfig;
    default_size?: { w: number; h: number };
    min_size?: { w: number; h: number };
    max_size?: { w: number; h: number };
    settings_schema?: any;
    is_template?: boolean;
}

/**
 * Request payload for updating a custom widget
 */
export interface UpdateCustomWidgetRequest {
    title?: string;
    description?: string;
    category?: string;
    visualization_type?: VisualizationType;
    data_source?: DataSourceConfig;
    config?: VisualizationConfig;
    default_size?: { w: number; h: number };
    min_size?: { w: number; h: number };
    max_size?: { w: number; h: number };
    settings_schema?: any;
    is_shared?: boolean;
}

/**
 * API response for custom widget operations
 */
export interface CustomWidgetResponse {
    success: boolean;
    widget?: CustomWidgetDefinition;
    widgets?: CustomWidgetDefinition[];
    templates?: CustomWidgetDefinition[];
    count?: number;
    message?: string;
    error?: string;
}