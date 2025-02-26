import React, { useMemo, useCallback } from "react";
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

const statusCodes: { [key: string]: string } = {
    "20": "X", // Cancelled
    "10": "E", // Entered
    "12": "R", // Released
    "14": "V", // Received from Vendor
    "16": "C", // Closed
    "18": "I", // Vendor Invoice Received
};

const RECENT_ORDER_THRESHOLD_DAYS = 30; // Adjust as needed
const YESTERDAY_OFFSET = 1;

/**
 * Deduplicate rows by (po_number, item_no). If a duplicate is found,
 * the one with a valid date_rcv is preferred.
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
        const poNumberComparison = a.po_number.localeCompare(b.po_number);
        if (poNumberComparison !== 0) return poNumberComparison;
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
    poStatus: string;
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
}

/**
 * Map the processed data into the format expected by the table.
 */
function mapToTableData(
    data: POItemData[],
    timeZone: string
): TableRowData[] {
    return data.map((item) => {
        // Adjust vendor promise date: add one day before formatting.
        const correctedVendorPromiseDate = item.vend_prom_date
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
            poStatus: item.po_status,
            vendName: item.vend_name,
            partCode: item.part_code,
            partDescription: item.part_desc,
            recentUnitPrice: `$${new Intl.NumberFormat("en-US", {
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
            vendorPromiseDate: correctedVendorPromiseDate,
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
                ? `$${new Intl.NumberFormat("en-US", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                }).format(item.last_order_unit_price)}`
                : "N/A",
            qtyOrdered: item.qty_ord !== undefined && item.uom
                ? `${new Intl.NumberFormat("en-US").format(item.qty_ord)} ${item.uom}`
                : "N/A",
            qtyRecvd: item.qty_recvd !== undefined && item.uom
                ? `${Math.round(item.qty_recvd)} ${item.uom}`
                : "N/A",
        };
    });
}

export default function DailyDueInTable() {
    // Prepare the raw query payload using useMemo.
    const widgetPayload = useMemo(
        () => ({
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

    // Render function that processes data and returns the table UI.
    const renderFunction = useCallback((data: POItemData[]) => {
        let processedData = deduplicateData(data);
        processedData = computePreviousOrderDetails(processedData);
        const recentOrders = filterRecentOrders(processedData);
        let mergedData = removeHiddenVendors(recentOrders);
        mergedData = sortOrders(mergedData);
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const tableData = mapToTableData(mergedData, timeZone);

        console.log("Processed Data:", tableData);

        return (
            <ScrollArea className="h-[95%] rounded-md border mt-2">
                <Table
                    className="text-left text-white outstanding-orders-table text-[.95rem]"
                    wrapperClassName="overflow-clip"
                >
                    <TableHeader>
                        <TableRow>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Part Code</TableHead>
                            <TableHead>Unit Price</TableHead>
                            <TableHead>Date Ordered</TableHead>
                            <TableHead>Qty Ordered</TableHead>
                            <TableHead>Qty Received</TableHead>
                            <TableHead>Vendor Promise Date</TableHead>
                            <TableHead>Prev. Unit Price</TableHead>
                            <TableHead>Prev. Order Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row, index) => (
                            <TableRow
                                key={index}
                                className={`
                  ${statusCodes[row.poStatus] === "X" ? "cancelled-po" : ""} 
                  ${row.isGrouped ? "grouped-po" : ""} 
                  ${statusCodes[row.poStatus] === "V" ? "received-po" : ""}
                `}
                            >
                                <TableCell className="font-black">
                                    {row.poNumber}
                                </TableCell>
                                <TableCell className="font-black">
                                    {statusCodes[row.poStatus] || "N/A"}
                                </TableCell>
                                <TableCell>{row.vendName}</TableCell>
                                <TableCell>{row.partCode}</TableCell>
                                <TableCell className="text-right">{row.recentUnitPrice}</TableCell>
                                <TableCell className="text-right">{row.dateOrdered}</TableCell>
                                <TableCell className="text-right">{row.qtyOrdered}</TableCell>
                                <TableCell className="text-right">{row.qtyRecvd}</TableCell>
                                <TableCell className="text-right">{row.vendorPromiseDate}</TableCell>
                                <TableCell className="text-right">{row.lastOrderUnitPrice}</TableCell>
                                <TableCell className="text-right">{row.lastOrderDate}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        );
    }, []);

    return (
        <div style={{ height: "100%", width: "100%" }} className="overflow-hidden">
            <Widget
                apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
                payload={widgetPayload}
                title="Daily Due In"
                updateInterval={8000}
                render={renderFunction}
            />
        </div>
    );
}