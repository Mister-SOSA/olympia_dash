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