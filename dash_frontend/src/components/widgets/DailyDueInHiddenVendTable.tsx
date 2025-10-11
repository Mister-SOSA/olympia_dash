import React, { useMemo, useRef, useState, useCallback } from "react";
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
 */
function computePreviousOrderDetails(data: POItemData[]): POItemData[] {
    data.forEach((item) => {
        const currentDate = new Date(item.date_orderd);
        const previousOrders = data.filter(
            (o) =>
                o.part_code === item.part_code &&
                new Date(o.date_orderd) < currentDate
        );
        if (previousOrders.length > 0) {
            const lastOrder = previousOrders.reduce((prev, curr) =>
                new Date(curr.date_orderd) > new Date(prev.date_orderd) ? curr : prev
            );
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
        (item) => config.HIDDEN_OUTSTANDING_VENDOR_CODES.includes(item.vend_code)
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
    // Track previous order statuses to detect changes
    const previousStatusesRef = useRef<Map<string, string>>(new Map());
    const [newStatusVRows, setNewStatusVRows] = useState<Set<string>>(new Set());

    // Memoize the widget payload.
    const widgetPayload = useMemo(
        () => ({
            module: "DailyDueInTable",
            raw_query: `
        SELECT
          p.po_number,
          ph.po_status,
          p.vend_code,
          p.vend_name,
          p.part_code,
          p.part_desc,
          p.unit_price,
          p.date_orderd,
          p.vend_prom_date,
          p.item_no,
          p.part_type,
          p.date_rcv,
          p.qty_ord,
          p.qty_recvd,
          p.uom
        FROM
          poitem p
        LEFT JOIN
          pohead ph ON p.po_number = ph.po_number
        WHERE
          p.date_orderd >= DATEADD(DAY, -90, GETDATE());
      `,
        }),
        []
    );

    // Process and transform data for the table.
    const renderFunction = useCallback((data: POItemData[]) => {
        let processedData = deduplicateData(data);
        processedData = computePreviousOrderDetails(processedData);
        const recentOrders = filterRecentOrders(processedData);
        let mergedData = removeHiddenVendors(recentOrders);
        mergedData = sortOrders(mergedData);

        const tableData = mapToTableData(mergedData);

        // Check for status changes into a received state
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

        // Update the state with new status V rows and play sound once
        if (newStatusVSet.size > 0) {
            playNotificationSound(); // Play once for all status changes
            setNewStatusVRows(newStatusVSet);

            // Clear the highlight after animation completes (5 pulses * 0.8s = 4 seconds)
            setTimeout(() => {
                setNewStatusVRows(new Set());
            }, 4000);
        }

        return (
            <ScrollArea className="h-full w-full border-2 border-border rounded-md">
                <Table className="text-left text-white outstanding-orders-table">
                    <TableHeader>
                        <TableRow>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Part Code</TableHead>
                            <TableHead className="text-right">Qty Ordered</TableHead>
                            <TableHead className="text-right">Qty Received</TableHead>
                            <TableHead className="text-right">Date Ordered</TableHead>
                            <TableHead className="text-right">Prev. Order</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Prev. Price</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row, index) => (
                            <TableRow
                                key={row.itemNo}
                                className={`
                                                            ${row.poStatusLabel === "X" ? "cancelled-po" : ""}
                              ${row.isGrouped ? "grouped-po" : ""}
                                                            ${RECEIVED_STATUSES.has(row.poStatusLabel) ? "received-po" : ""}
                              ${newStatusVRows.has(row.itemNo) ? "new-status-v-row" : ""}
                            `}
                            >
                                <TableCell className="font-black">{row.poNumber}</TableCell>
                                <TableCell className="font-black">{statusBadge(row.poStatusLabel)}</TableCell>
                                <TableCell>{row.vendName}</TableCell>
                                <TableCell>{row.partCode}</TableCell>
                                <TableCell className="text-right">{row.qtyOrdered}</TableCell>
                                <TableCell className="text-right">{row.qtyRecvd}</TableCell>
                                <TableCell className="text-right">{row.dateOrdered}</TableCell>
                                <TableCell className="text-right">{row.lastOrderDate}</TableCell>
                                <TableCell className="text-right row-secondary">
                                    <div className="table-dollars">
                                        <span className="dollar-sign">$</span>
                                        <span className="dollar-value">{row.recentUnitPrice}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right row-secondary">
                                    <div className="table-dollars">
                                        <span className="dollar-sign">$</span>
                                        <span className="dollar-value">{row.lastOrderUnitPrice}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        );
    }, [newStatusVRows]);

    return (
        <Widget
            endpoint="/api/widgets"
            payload={widgetPayload}
            title="Daily Due In (Maintenance Only)"
            refreshInterval={15000}
        >
            {(data, loading) => {
                if (!data || data.length === 0) {
                    return <div className="widget-empty">No purchase orders found</div>;
                }

                return renderFunction(data);
            }}
        </Widget>
    );
}