import React, { useMemo, useRef, useState, memo, useEffect } from "react";
import Widget from "./Widget";
import config from "@/config";
import { POItemData } from "@/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { format } from "date-fns-tz";
import { playNotificationSound } from "@/utils/soundUtils";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";
import { SensitiveCurrency, SensitiveName } from "@/components/ui/SensitiveValue";
import { STATUS_COLORS, BADGE_STYLES } from "@/components/ui/MobileTableCard";

const WIDGET_ID = 'DailyDueInTable';


/* -------------------------------------- */
/* Constants & Helper Functions           */
/* -------------------------------------- */
const STATUS_CODES: { [key: string]: string } = {
    "20": "X", // Cancelled
    "10": "E", // Entered
    "12": "R", // Released
    "14": "V", // Received from Vendor
    "16": "C", // Closed
    "18": "I", // Vendor Invoice Received
    X: "X",
    E: "E",
    R: "R",
    V: "V",
    C: "C",
    I: "I",
};

const RECEIVED_STATUSES = new Set(["V", "C"]);

const normalizeStatus = (statusCode: string): string => STATUS_CODES[statusCode] ?? statusCode;

const RECENT_ORDER_THRESHOLD_DAYS = 30;
const YESTERDAY_OFFSET = 1;

const statusBadge = (statusCode: string) => {
    const status = normalizeStatus(statusCode);
    const badgeClass =
        status === "X"
            ? "badge-danger"
            : status === "V"
                ? "badge-success"
                : "badge-primary";
    return <span className={`badge ${badgeClass}`}>{status}</span>;
};

/**
 * Deduplicate rows by (po_number, item_no). If a duplicate is found,
 * prefer the row with the most "complete" status:
 * 1. Prefer received statuses (V, C) over non-received
 * 2. Among same status category, prefer the row with a valid date_rcv
 * 
 * FIX: The database returns duplicate rows with different statuses.
 * This ensures we always pick the most accurate/complete status.
 */
function deduplicateData(data: POItemData[]): POItemData[] {
    const dedupedMap = new Map<string, POItemData>();

    // Helper to determine which item is "better" (more complete)
    const isBetterItem = (newItem: POItemData, existingItem: POItemData): boolean => {
        const newStatus = normalizeStatus(newItem.po_status);
        const existingStatus = normalizeStatus(existingItem.po_status);
        const newIsReceived = RECEIVED_STATUSES.has(newStatus);
        const existingIsReceived = RECEIVED_STATUSES.has(existingStatus);

        // Prefer received status over non-received
        if (newIsReceived && !existingIsReceived) return true;
        if (!newIsReceived && existingIsReceived) return false;

        // If both same category, prefer the one with receive date
        if (newItem.date_rcv && !existingItem.date_rcv) return true;
        if (!newItem.date_rcv && existingItem.date_rcv) return false;

        // If still tied, prefer the one with higher qty_recvd
        if ((newItem.qty_recvd || 0) > (existingItem.qty_recvd || 0)) return true;

        return false;
    };

    data.forEach((item) => {
        const key = `${item.po_number}-${item.item_no}`;
        if (!dedupedMap.has(key)) {
            dedupedMap.set(key, item);
        } else {
            const existing = dedupedMap.get(key)!;
            if (isBetterItem(item, existing)) {
                dedupedMap.set(key, item);
            }
        }
    });

    return Array.from(dedupedMap.values());
}

/**
 * For each order, find the previous order (if any) for the same part code,
 * and attach its date and unit price.
 * 
 * FIX: Returns NEW objects to avoid mutating original data (which caused
 * inconsistent renders when React compared old vs new data).
 */
function computePreviousOrderDetails(data: POItemData[]): POItemData[] {
    const ordersByPartCode = new Map<string, POItemData[]>();

    data.forEach((item) => {
        if (!ordersByPartCode.has(item.part_code)) {
            ordersByPartCode.set(item.part_code, []);
        }
        ordersByPartCode.get(item.part_code)!.push(item);
    });

    ordersByPartCode.forEach((orders) => {
        orders.sort((a, b) => new Date(a.date_orderd).getTime() - new Date(b.date_orderd).getTime());
    });

    // Return NEW objects instead of mutating
    return data.map((item) => {
        const ordersForPart = ordersByPartCode.get(item.part_code)!;
        const currentDate = new Date(item.date_orderd).getTime();

        let lastOrder: POItemData | null = null;
        for (let i = ordersForPart.length - 1; i >= 0; i--) {
            if (new Date(ordersForPart[i].date_orderd).getTime() < currentDate) {
                lastOrder = ordersForPart[i];
                break;
            }
        }

        return {
            ...item,
            last_order_date: lastOrder ? lastOrder.date_orderd : null,
            last_order_unit_price: lastOrder ? lastOrder.unit_price : null,
        };
    });
}

/**
 * Filter orders to those that are "recent" based on:
 *   - date_orderd is within RECENT_ORDER_THRESHOLD_DAYS, and
 *   - vend_prom_date (formatted as a date string) matches yesterday.
 */
function filterRecentOrders(data: POItemData[]): POItemData[] {
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() - RECENT_ORDER_THRESHOLD_DAYS);

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - YESTERDAY_OFFSET);
    const yesterdayStr = yesterday.toDateString();

    return data.filter((item) => {
        const orderDate = new Date(item.date_orderd);
        const vendPromDateStr = item.vend_prom_date
            ? new Date(item.vend_prom_date).toDateString()
            : null;
        return orderDate >= thresholdDate && vendPromDateStr === yesterdayStr;
    });
}

/**
 * Remove rows for vendors that should be hidden.
 */
function removeHiddenVendors(data: POItemData[]): POItemData[] {
    return data.filter(
        (item) => !config.HIDDEN_OUTSTANDING_VENDOR_CODES.includes(item.vend_code)
    );
}

/**
 * Sort orders based on user preference.
 * 
 * FIX: Returns a NEW sorted array to avoid mutating original data.
 */
function sortOrders(data: POItemData[], sortBy: 'vendor' | 'date' | 'poNumber' = 'vendor'): POItemData[] {
    return [...data].sort((a, b) => {
        switch (sortBy) {
            case 'date':
                return new Date(b.date_orderd).getTime() - new Date(a.date_orderd).getTime();
            case 'poNumber':
                return a.po_number.localeCompare(b.po_number);
            case 'vendor':
            default:
                const vendorComparison = a.vend_name.localeCompare(b.vend_name);
                if (vendorComparison !== 0) return vendorComparison;
                const poComparison = a.po_number.localeCompare(b.po_number);
                if (poComparison !== 0) return poComparison;
                return a.part_code.localeCompare(b.part_code);
        }
    });
}

/**
 * Helper to format a date.
 */
function formatDate(date: any): string {
    if (!date) return "N/A";
    return format(new Date(date), "MMM d, yyyy");
}

interface TableRowData {
    isGrouped: boolean;
    poNumber: string;
    poStatusLabel: string;
    vendName: string;
    partCode: string;
    partDescription: string;
    recentUnitPrice: string;
    dateOrdered: string;
    vendorPromiseDate: string;
    lastOrderDate: string;
    lastOrderUnitPrice: string;
    qtyOrdered: string;
    qtyRecvd: string;
    itemNo: string;
}

// Memoized table row component
const MemoizedTableRow = memo(({
    row,
    isHighlighted
}: {
    row: TableRowData;
    isHighlighted: boolean;
}) => {
    return (
        <TableRow
            className={`
                ${row.poStatusLabel === "X" ? "cancelled-po" : ""}
                ${row.isGrouped ? "grouped-po" : ""}
                ${RECEIVED_STATUSES.has(row.poStatusLabel) ? "received-po" : ""}
                ${isHighlighted ? "new-status-v-row" : ""}
            `}
        >
            <TableCell className="font-black" style={{ color: 'var(--table-text-primary)' }}>{row.poNumber}</TableCell>
            <TableCell className="font-black">{statusBadge(row.poStatusLabel)}</TableCell>
            <TableCell style={{ color: 'var(--table-text-primary)' }}>
                <SensitiveName value={row.vendName} />
            </TableCell>
            <TableCell style={{ color: 'var(--table-text-primary)' }}>{row.partCode}</TableCell>
            <TableCell className="text-right" style={{ color: 'var(--table-text-primary)' }}>{row.qtyOrdered}</TableCell>
            <TableCell className="text-right" style={{ color: 'var(--table-text-primary)' }}>{row.qtyRecvd}</TableCell>
            <TableCell className="text-right" style={{ color: 'var(--table-text-secondary)' }}>{row.dateOrdered}</TableCell>
            <TableCell className="text-right" style={{ color: 'var(--table-text-secondary)' }}>{row.lastOrderDate}</TableCell>
            <TableCell className="text-right row-secondary">
                <div className="table-dollars">
                    <SensitiveCurrency value={`$${row.recentUnitPrice}`} style={{ color: 'var(--table-text-primary)' }} />
                </div>
            </TableCell>
            <TableCell className="text-right row-secondary">
                <div className="table-dollars">
                    <SensitiveCurrency value={`$${row.lastOrderUnitPrice}`} style={{ color: 'var(--table-text-primary)' }} />
                </div>
            </TableCell>
        </TableRow>
    );
});

// Helper to get status badge style
const getStatusBadgeStyle = (status: string) => {
    if (status === 'X') return BADGE_STYLES.error;
    if (RECEIVED_STATUSES.has(status)) return BADGE_STYLES.success;
    return BADGE_STYLES.primary;
};

// Helper to get status indicator color
const getStatusIndicatorColor = (status: string) => {
    if (status === 'X') return STATUS_COLORS.cancelled;
    if (RECEIVED_STATUSES.has(status)) return STATUS_COLORS.received;
    if (status === 'R') return STATUS_COLORS.released;
    if (status === 'E') return STATUS_COLORS.entered;
    return STATUS_COLORS.default;
};

// Memoized mobile card component for compact view
const MobileCardRow = memo(({
    row,
    isHighlighted
}: {
    row: TableRowData;
    isHighlighted: boolean;
}) => {
    const isReceived = RECEIVED_STATUSES.has(row.poStatusLabel);
    const isCancelled = row.poStatusLabel === 'X';

    return (
        <div
            className={`
                mobile-table-card
                ${isHighlighted ? "new-status-v-row" : ""}
                ${isCancelled ? "cancelled" : ""}
                ${isReceived ? "received" : ""}
            `}
        >
            {/* Status indicator */}
            <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md"
                style={{ backgroundColor: getStatusIndicatorColor(row.poStatusLabel) }}
            />

            <div className="pl-3 pr-3 py-2">
                {/* Row 1: Vendor + Status */}
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        <SensitiveName value={row.vendName} />
                    </span>
                    <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={getStatusBadgeStyle(row.poStatusLabel)}
                    >
                        {row.poStatusLabel}
                    </span>
                </div>

                {/* Row 2: Part + Qty + Price */}
                <div className="flex items-center justify-between gap-2 mt-1.5 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{row.partCode}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                            {row.qtyOrdered}{row.qtyRecvd !== '-' && <span style={{ color: 'var(--value-positive)' }}> → {row.qtyRecvd}</span>}
                        </span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        <SensitiveCurrency value={`$${row.recentUnitPrice}`} />
                    </span>
                </div>

                {/* Row 3: PO + Date */}
                <div className="flex items-center justify-between gap-2 mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="font-mono">PO {row.poNumber}</span>
                    <span>{row.dateOrdered}</span>
                </div>
            </div>
        </div>
    );
});
MobileCardRow.displayName = 'MobileCardRow';

/**
 * Map the processed data into the format expected by the table.
 */
function mapToTableData(data: POItemData[]): TableRowData[] {
    return data.map((item) => {
        const correctedVendPromDate = item.vend_prom_date
            ? formatDate(
                new Date(
                    new Date(item.vend_prom_date).setDate(
                        new Date(item.vend_prom_date).getDate() + 1
                    )
                )
            )
            : "N/A";
        return {
            isGrouped: item.isGrouped,
            poNumber: item.po_number,
            poStatusLabel: normalizeStatus(item.po_status),
            vendName: item.vend_name,
            partCode: item.part_code,
            partDescription: item.part_desc,
            recentUnitPrice: `${new Intl.NumberFormat("en-US", {
                minimumFractionDigits: 4,
                maximumFractionDigits: 4,
            }).format(item.unit_price)}`,
            dateOrdered: item.date_orderd
                ? formatDate(
                    new Date(
                        new Date(item.date_orderd).setDate(
                            new Date(item.date_orderd).getDate() + 1
                        )
                    )
                )
                : "N/A",
            vendorPromiseDate: correctedVendPromDate,
            lastOrderDate: item.last_order_date
                ? formatDate(
                    new Date(
                        new Date(item.last_order_date).setDate(
                            new Date(item.last_order_date).getDate() + 1
                        )
                    )
                )
                : "N/A",
            lastOrderUnitPrice: item.last_order_unit_price
                ? `${new Intl.NumberFormat("en-US", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                }).format(item.last_order_unit_price)}`
                : "N/A",
            qtyOrdered:
                item.qty_ord !== undefined && item.uom
                    ? `${new Intl.NumberFormat("en-US").format(item.qty_ord)} ${item.uom}`
                    : "N/A",
            qtyRecvd:
                item.qty_recvd !== undefined && item.uom && item.qty_recvd > 0
                    ? `${new Intl.NumberFormat("en-US").format(item.qty_recvd)} ${item.uom}`
                    : "-",
            itemNo: `${item.po_number}-${item.item_no}`,
        };
    });
}

/**
 * Process raw API data into table-ready format.
 * This is a pure function with no side effects.
 */
function processRawData(rawData: POItemData[], sortBy: 'vendor' | 'date' | 'poNumber'): TableRowData[] {
    let processedData = deduplicateData(rawData);
    processedData = computePreviousOrderDetails(processedData);
    const recentOrders = filterRecentOrders(processedData);
    let mergedData = removeHiddenVendors(recentOrders);
    mergedData = sortOrders(mergedData, sortBy);
    return mapToTableData(mergedData);
}

/* -------------------------------------- */
/* Inner Table Component (handles data)   */
/* -------------------------------------- */
interface DailyDueInTableContentProps {
    data: POItemData[] | null;
    loading: boolean;
}

/**
 * FIX: Separated the table content into its own memoized component.
 * This prevents the infinite render loop that was caused by calling
 * state updates inside the render callback.
 * 
 * The previous code had:
 *   renderTable -> processData -> setTimeout(setTableData) -> re-render -> renderTable...
 * 
 * Now we use useMemo for data processing, which only runs when data actually changes.
 */
const DailyDueInTableContent = memo(({ data, loading }: DailyDueInTableContentProps) => {
    // Widget-specific settings
    const { settings } = useWidgetSettings(WIDGET_ID);
    const playSoundOnReceived = settings.playSoundOnReceived as boolean;
    const sortBy = settings.sortBy as 'vendor' | 'date' | 'poNumber';
    const maxRows = settings.maxRows as number;

    // Track previous order statuses to detect changes
    const previousStatusesRef = useRef<Map<string, string>>(new Map());
    const lastTriggeredRef = useRef<Map<string, number>>(new Map());
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasInitializedRef = useRef(false);

    const [newStatusVRows, setNewStatusVRows] = useState<Set<string>>(new Set());

    // Cooldown period to prevent re-triggering for oscillating data
    const TRIGGER_COOLDOWN_MS = 60000; // 1 minute cooldown

    // Process data with useMemo - only recomputes when data or sortBy changes
    // This is the KEY FIX for the infinite render loop
    const tableData = useMemo(() => {
        if (!data || data.length === 0) {
            return [];
        }
        return processRawData(data, sortBy);
    }, [data, sortBy]);

    // Handle status change detection in useEffect (not during render!)
    useEffect(() => {
        if (tableData.length === 0) return;

        // Skip the first data load - we only want to detect CHANGES, not initial state
        if (!hasInitializedRef.current) {
            tableData.forEach((row) => {
                previousStatusesRef.current.set(row.itemNo, row.poStatusLabel);
            });
            hasInitializedRef.current = true;
            return;
        }

        const newStatusVSet = new Set<string>();
        const now = Date.now();

        tableData.forEach((row) => {
            const itemKey = row.itemNo;
            const currentStatus = row.poStatusLabel;
            const previousStatus = previousStatusesRef.current.get(itemKey);
            const lastTriggered = lastTriggeredRef.current.get(itemKey) || 0;

            // Only trigger if:
            // 1. We have a previous status (not a brand new item)
            // 2. Current status is received (V or C)
            // 3. Previous status was NOT received
            // 4. We haven't triggered for this item within the cooldown period
            if (
                previousStatus !== undefined &&
                RECEIVED_STATUSES.has(currentStatus) &&
                !RECEIVED_STATUSES.has(previousStatus) &&
                (now - lastTriggered) > TRIGGER_COOLDOWN_MS
            ) {
                newStatusVSet.add(itemKey);
                lastTriggeredRef.current.set(itemKey, now);
            }

            previousStatusesRef.current.set(itemKey, currentStatus);
        });

        if (newStatusVSet.size > 0) {
            if (playSoundOnReceived) {
                playNotificationSound();
            }

            setNewStatusVRows(newStatusVSet);

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                setNewStatusVRows(new Set());
            }, 3000);
        }
    }, [tableData, playSoundOnReceived]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    if (!data || data.length === 0) {
        return <div className="widget-empty">No orders found</div>;
    }

    if (tableData.length === 0) {
        return <div className="widget-empty">No orders due today</div>;
    }

    // Apply maxRows limit if set (0 means unlimited)
    const displayData = maxRows > 0 ? tableData.slice(0, maxRows) : tableData;

    return (
        <ScrollArea className="h-full w-full border-2 border-border rounded-md @container">
            <TooltipProvider delayDuration={200}>
                {/* Mobile Card View - shown at smaller sizes */}
                <div className="@2xl:hidden mobile-cards-container">
                    {displayData.map((row) => (
                        <MobileCardRow
                            key={row.itemNo}
                            row={row}
                            isHighlighted={newStatusVRows.has(row.itemNo)}
                        />
                    ))}
                </div>

                {/* Table View - shown at larger sizes */}
                <div className="hidden @2xl:block">
                    <Table className="text-left outstanding-orders-table" style={{ color: 'var(--table-text-primary)' }}>
                        <TableHeader className="sticky top-0 z-10" style={{ backgroundColor: 'var(--table-header-bg)' }}>
                            <TableRow>
                                <TableHead style={{ color: 'var(--table-text-primary)' }}>PO Number</TableHead>
                                <TableHead style={{ color: 'var(--table-text-primary)' }}>Status</TableHead>
                                <TableHead style={{ color: 'var(--table-text-primary)' }}>Vendor</TableHead>
                                <TableHead style={{ color: 'var(--table-text-primary)' }}>Part Code</TableHead>
                                <TableHead className="text-right" style={{ color: 'var(--table-text-primary)' }}>Qty Ordered</TableHead>
                                <TableHead className="text-right" style={{ color: 'var(--table-text-primary)' }}>Qty Received</TableHead>
                                <TableHead className="text-right" style={{ color: 'var(--table-text-primary)' }}>Date Ordered</TableHead>
                                <TableHead className="text-right" style={{ color: 'var(--table-text-primary)' }}>Prev. Order</TableHead>
                                <TableHead className="text-right" style={{ color: 'var(--table-text-primary)' }}>Unit Price</TableHead>
                                <TableHead className="text-right" style={{ color: 'var(--table-text-primary)' }}>Prev. Price</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayData.map((row) => (
                                <MemoizedTableRow
                                    key={row.itemNo}
                                    row={row}
                                    isHighlighted={newStatusVRows.has(row.itemNo)}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TooltipProvider>
        </ScrollArea>
    );
});

/* -------------------------------------- */
/* DailyDueInTable Component (wrapper)    */
/* -------------------------------------- */
export default function DailyDueInTable() {
    const widgetPayload = useMemo(
        () => ({
            module: "DailyDueInTable",
            queryId: "DailyDueInTable"
        }),
        []
    );

    return (
        <Widget
            endpoint="/api/widgets"
            payload={widgetPayload}
            title="Daily Due In"
            refreshInterval={8000}
        >
            {(data: POItemData[] | null, loading: boolean) => (
                <DailyDueInTableContent data={data} loading={loading} />
            )}
        </Widget>
    );
}
