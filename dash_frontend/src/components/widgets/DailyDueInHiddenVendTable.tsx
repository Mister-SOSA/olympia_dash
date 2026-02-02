import React, { useMemo, useRef, useState, useCallback, memo, useEffect } from "react";
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
import { Package, Calendar, DollarSign, Hash, FileText, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";
import { BADGE_STYLES, STATUS_COLORS } from "@/components/ui/MobileTableCard";

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
 * prefer the row with a valid date_rcv.
 */
function deduplicateData(data: POItemData[]): POItemData[] {
    const dedupedMap = new Map<string, POItemData>();
    data.forEach((item) => {
        const key = `${item.po_number}-${item.item_no}`;
        if (!dedupedMap.has(key)) {
            dedupedMap.set(key, item);
        } else {
            const existing = dedupedMap.get(key);
            if (existing && !existing.date_rcv && item.date_rcv) {
                dedupedMap.set(key, item);
            }
        }
    });
    return Array.from(dedupedMap.values());
}

/**
 * For each order, find the previous order (if any) for the same part code,
 * and attach its date and unit price.
 * OPTIMIZED: Use a Map to avoid O(n²) complexity
 */
function computePreviousOrderDetails(data: POItemData[]): POItemData[] {
    // Group orders by part code for O(n) lookup instead of O(n²)
    const ordersByPartCode = new Map<string, POItemData[]>();

    data.forEach((item) => {
        if (!ordersByPartCode.has(item.part_code)) {
            ordersByPartCode.set(item.part_code, []);
        }
        ordersByPartCode.get(item.part_code)!.push(item);
    });

    // Sort each group once by date
    ordersByPartCode.forEach((orders) => {
        orders.sort((a, b) => new Date(a.date_orderd).getTime() - new Date(b.date_orderd).getTime());
    });

    // Now find previous orders in O(n) time - return new objects to avoid mutation
    return data.map((item) => {
        const ordersForPart = ordersByPartCode.get(item.part_code)!;
        const currentDate = new Date(item.date_orderd).getTime();

        // Find the last order before current one
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
        (item) => config.HIDDEN_OUTSTANDING_VENDOR_CODES.includes(item.vend_code)
    );
}

/**
 * Sort the orders alphabetically by vendor name, then by PO number,
 * and finally by part code.
 */
function sortOrders(data: POItemData[]): POItemData[] {
    return [...data].sort((a, b) => {
        const vendorComparison = a.vend_name.localeCompare(b.vend_name);
        if (vendorComparison !== 0) return vendorComparison;
        const poComparison = a.po_number.localeCompare(b.po_number);
        if (poComparison !== 0) return poComparison;
        return a.part_code.localeCompare(b.part_code);
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
    itemNo: string; // Add unique identifier
}

// Memoized table row component to prevent unnecessary re-renders
const MemoizedTableRow = memo(({
    row,
    newStatusVRowsRef
}: {
    row: TableRowData;
    newStatusVRowsRef: React.MutableRefObject<Set<string>>;
}) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const shouldAnimate = newStatusVRowsRef.current.has(row.itemNo);
        if (shouldAnimate && !isAnimating) {
            setIsAnimating(true);
            if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
            animationTimeoutRef.current = setTimeout(() => {
                setIsAnimating(false);
            }, 3000);
        }

        return () => {
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
            }
        };
    }, [row.itemNo, newStatusVRowsRef, isAnimating]);

    return (
        <TableRow
            className={`
                border-border/30 transition-all duration-300 hover:bg-muted/50
                ${row.poStatusLabel === "X" ? "cancelled-po" : ""}
                ${row.isGrouped ? "grouped-po" : ""}
                ${RECEIVED_STATUSES.has(row.poStatusLabel) ? "received-po" : ""}
                ${isAnimating ? "new-status-v-row" : ""}
            `}
        >
            <TableCell className="font-mono font-bold text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-primary)' }}>{row.poNumber}</TableCell>
            <TableCell className="font-bold py-1.5">{statusBadge(row.poStatusLabel)}</TableCell>
            <TableCell className="font-semibold text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-primary)' }}>{row.vendName}</TableCell>
            <TableCell className="font-mono font-bold text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-primary)' }}>{row.partCode}</TableCell>
            <TableCell className="text-right font-bold text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-primary)' }}>{row.qtyOrdered}</TableCell>
            <TableCell className="text-right font-bold text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-primary)' }}>{row.qtyRecvd}</TableCell>
            <TableCell className="text-right font-medium text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-secondary)' }}>{row.dateOrdered}</TableCell>
            <TableCell className="text-right font-medium text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-secondary)' }}>{row.lastOrderDate}</TableCell>
            <TableCell className="text-right row-secondary py-1.5">
                <div className="table-dollars">
                    <span className="dollar-sign text-xs" style={{ color: 'var(--table-text-secondary)' }}>$</span>
                    <span className="dollar-value font-bold text-[15px] leading-tight" style={{ color: 'var(--table-text-primary)' }}>{row.recentUnitPrice}</span>
                </div>
            </TableCell>
            <TableCell className="text-right row-secondary py-1.5">
                <div className="table-dollars">
                    <span className="dollar-sign text-xs" style={{ color: 'var(--table-text-secondary)' }}>$</span>
                    <span className="dollar-value font-bold text-[15px] leading-tight" style={{ color: 'var(--table-text-primary)' }}>{row.lastOrderUnitPrice}</span>
                </div>
            </TableCell>
        </TableRow>
    );
}, (prevProps, nextProps) => {
    // Only re-render if the row data changes
    return prevProps.row === nextProps.row && prevProps.newStatusVRowsRef === nextProps.newStatusVRowsRef;
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
    newStatusVRowsRef
}: {
    row: TableRowData;
    newStatusVRowsRef: React.MutableRefObject<Set<string>>;
}) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const isReceived = RECEIVED_STATUSES.has(row.poStatusLabel);
    const isCancelled = row.poStatusLabel === 'X';

    useEffect(() => {
        if (newStatusVRowsRef.current.has(row.itemNo)) {
            setIsAnimating(true);
            const timeout = setTimeout(() => {
                setIsAnimating(false);
            }, 3000);
            return () => clearTimeout(timeout);
        }
    }, [newStatusVRowsRef, row.itemNo]);

    return (
        <div
            className={`
                mobile-table-card
                ${isAnimating ? "new-status-v-row" : ""}
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
                        {row.vendName}
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
                        ${row.recentUnitPrice}
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
        // Adjust vendor promise date: add one day before formatting.
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
            itemNo: `${item.po_number}-${item.item_no}`, // Unique identifier
        };
    });
}

/* -------------------------------------- */
/* DailyDueInHiddenVendTable Component    */
/* -------------------------------------- */
export default function DailyDueInHiddenVendTable() {
    // Widget settings
    const { settings } = useWidgetSettings('DailyDueInHiddenVendTable');
    const playSoundOnReceived = settings.playSoundOnReceived ?? true;
    const sortBy = settings.sortBy ?? 'vendor';

    // Track previous order statuses to detect changes
    const previousStatusesRef = useRef<Map<string, string>>(new Map());
    const previousDataRef = useRef<POItemData[] | null>(null);
    const processedDataRef = useRef<TableRowData[] | null>(null);
    const newStatusVRowsRef = useRef<Set<string>>(new Set());
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [, forceUpdate] = useState({});

    // Memoize the widget payload to query the needed data without raw SQL.
    const widgetPayload = useMemo(
        () => ({
            module: "DailyDueInHiddenVendTable",
            queryId: "DailyDueInHiddenVendTable"
        }),
        []
    );

    // Handle status change detection - separate from rendering
    const checkForStatusChanges = useCallback((tableData: TableRowData[]) => {
        const newStatusVSet = new Set<string>();

        tableData.forEach((row) => {
            const itemKey = row.itemNo;
            const currentStatus = row.poStatusLabel;
            const previousStatus = previousStatusesRef.current.get(itemKey);

            if (
                RECEIVED_STATUSES.has(currentStatus) &&
                previousStatus &&
                !RECEIVED_STATUSES.has(previousStatus)
            ) {
                newStatusVSet.add(itemKey);
            }

            // Update the status tracking
            previousStatusesRef.current.set(itemKey, currentStatus);
        });

        // Update the ref with new status V rows and play sound once
        if (newStatusVSet.size > 0) {
            if (playSoundOnReceived) {
                playNotificationSound();
            }
            newStatusVRowsRef.current = newStatusVSet;
            forceUpdate({}); // Trigger re-render only for affected rows

            // Clear previous timeout if exists
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Clear the highlight after animation completes
            timeoutRef.current = setTimeout(() => {
                newStatusVRowsRef.current = new Set();
                forceUpdate({}); // Remove animations
            }, 3000);
        }
    }, [playSoundOnReceived]);

    // Custom sort function based on settings (use spread to avoid mutation)
    const sortOrdersBySetting = useCallback((data: POItemData[]): POItemData[] => {
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
    }, [sortBy]);

    // Process data only when it actually changes
    const processData = useCallback((rawData: POItemData[]): TableRowData[] => {
        // Check if data actually changed
        if (previousDataRef.current === rawData && processedDataRef.current) {
            return processedDataRef.current;
        }

        let processedData = deduplicateData(rawData);
        processedData = computePreviousOrderDetails(processedData);
        const recentOrders = filterRecentOrders(processedData);
        let mergedData = removeHiddenVendors(recentOrders);
        mergedData = sortOrdersBySetting(mergedData);
        const result = mapToTableData(mergedData);

        previousDataRef.current = rawData;
        processedDataRef.current = result;

        return result;
    }, [sortOrdersBySetting]);

    // Memoized render function
    const renderTable = useCallback((data: POItemData[] | null, loading: boolean) => {
        if (!data || data.length === 0) {
            return <div className="widget-empty">No purchase orders found</div>;
        }

        const tableData = processData(data);

        // Check for status changes
        checkForStatusChanges(tableData);

        return (
            <ScrollArea className="h-full w-full border-2 border-border rounded-md @container">
                <TooltipProvider delayDuration={200}>
                    {/* Mobile Card View */}
                    <div className="@2xl:hidden mobile-cards-container">
                        {tableData.map((row) => (
                            <MobileCardRow
                                key={row.itemNo}
                                row={row}
                                newStatusVRowsRef={newStatusVRowsRef}
                            />
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden @2xl:block">
                        <Table className="text-left outstanding-orders-table" style={{ color: 'var(--table-text-primary)' }}>
                            <TableHeader className="sticky top-0 z-10" style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                <TableRow className="border-border/50 hover:bg-transparent">
                                    <TableHead className="font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1">
                                            <FileText className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            PO Number
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1">
                                            <Hash className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Status
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1">
                                            <Package className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Vendor
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1">
                                            <Package className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Part Code
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center justify-end gap-1">
                                            <Hash className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Qty Ordered
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center justify-end gap-1">
                                            <Hash className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Qty Received
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center justify-end gap-1">
                                            <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Date Ordered
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center justify-end gap-1">
                                            <TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Prev. Order
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center justify-end gap-1">
                                            <DollarSign className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Unit Price
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center justify-end gap-1">
                                            <DollarSign className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Prev. Price
                                        </div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tableData.map((row) => (
                                    <MemoizedTableRow
                                        key={row.itemNo}
                                        row={row}
                                        newStatusVRowsRef={newStatusVRowsRef}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TooltipProvider>
            </ScrollArea>
        );
    }, [processData, checkForStatusChanges]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <Widget
            endpoint="/api/widgets"
            payload={widgetPayload}
            title="Daily Due In (Maintenance Only)"
            refreshInterval={15000}
        >
            {renderTable}
        </Widget>
    );
}