import React, { useMemo, useCallback, useRef, useState, memo, useEffect } from "react";
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
import { format } from "date-fns-tz";
import { playNotificationSound } from "@/utils/soundUtils";


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

    // Now find previous orders in O(n) time
    data.forEach((item) => {
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

        if (lastOrder) {
            item.last_order_date = lastOrder.date_orderd;
            item.last_order_unit_price = lastOrder.unit_price;
        } else {
            item.last_order_date = null;
            item.last_order_unit_price = null;
        }
    });
    
    return data;
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
 * Sort the orders alphabetically by vendor name, then by PO number,
 * and finally by part code.
 */
function sortOrders(data: POItemData[]): POItemData[] {
    return data.sort((a, b) => {
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
                ${row.poStatusLabel === "X" ? "cancelled-po" : ""}
                ${row.isGrouped ? "grouped-po" : ""}
                ${RECEIVED_STATUSES.has(row.poStatusLabel) ? "received-po" : ""}
                ${isAnimating ? "new-status-v-row" : ""}
            `}
        >
            <TableCell className="font-black" style={{ color: 'var(--table-text-primary)' }}>{row.poNumber}</TableCell>
            <TableCell className="font-black">{statusBadge(row.poStatusLabel)}</TableCell>
            <TableCell style={{ color: 'var(--table-text-primary)' }}>{row.vendName}</TableCell>
            <TableCell style={{ color: 'var(--table-text-primary)' }}>{row.partCode}</TableCell>
            <TableCell className="text-right" style={{ color: 'var(--table-text-primary)' }}>{row.qtyOrdered}</TableCell>
            <TableCell className="text-right" style={{ color: 'var(--table-text-primary)' }}>{row.qtyRecvd}</TableCell>
            <TableCell className="text-right" style={{ color: 'var(--table-text-secondary)' }}>{row.dateOrdered}</TableCell>
            <TableCell className="text-right" style={{ color: 'var(--table-text-secondary)' }}>{row.lastOrderDate}</TableCell>
            <TableCell className="text-right row-secondary">
                <div className="table-dollars">
                    <span className="dollar-sign" style={{ color: 'var(--table-text-secondary)' }}>$</span>
                    <span className="dollar-value" style={{ color: 'var(--table-text-primary)' }}>{row.recentUnitPrice}</span>
                </div>
            </TableCell>
            <TableCell className="text-right row-secondary">
                <div className="table-dollars">
                    <span className="dollar-sign" style={{ color: 'var(--table-text-secondary)' }}>$</span>
                    <span className="dollar-value" style={{ color: 'var(--table-text-primary)' }}>{row.lastOrderUnitPrice}</span>
                </div>
            </TableCell>
        </TableRow>
    );
}, (prevProps, nextProps) => {
    // Only re-render if the row data changes
    return prevProps.row === nextProps.row && prevProps.newStatusVRowsRef === nextProps.newStatusVRowsRef;
});

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
/* DailyDueInTable Component              */
/* -------------------------------------- */
export default function DailyDueInTable() {
    // Track previous order statuses to detect changes
    const previousStatusesRef = useRef<Map<string, string>>(new Map());
    const previousDataRef = useRef<POItemData[] | null>(null);
    const processedDataRef = useRef<TableRowData[] | null>(null);
    const newStatusVRowsRef = useRef<Set<string>>(new Set());
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [, forceUpdate] = useState({});

    // Memoize the widget payload via the secure query registry.
    const widgetPayload = useMemo(
        () => ({
            module: "DailyDueInTable",
            queryId: "DailyDueInTable"
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
            playNotificationSound();
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
    }, []);

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
        mergedData = sortOrders(mergedData);
        const result = mapToTableData(mergedData);
        
        previousDataRef.current = rawData;
        processedDataRef.current = result;
        
        return result;
    }, []);

    // Memoized render function
    const renderTable = useCallback((data: POItemData[] | null, loading: boolean) => {
        if (!data || data.length === 0) {
            return <div className="widget-empty">No orders found</div>;
        }

        const tableData = processData(data);
        
        // Check for status changes
        checkForStatusChanges(tableData);

        return (
            <ScrollArea className="h-full w-full border-2 border-border rounded-md">
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
                        {tableData.map((row) => (
                            <MemoizedTableRow
                                key={row.itemNo}
                                row={row}
                                newStatusVRowsRef={newStatusVRowsRef}
                            />
                        ))}
                    </TableBody>
                </Table>
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
            title="Daily Due In"
            refreshInterval={8000}
        >
            {renderTable}
        </Widget>
    );
}