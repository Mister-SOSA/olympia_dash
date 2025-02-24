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
// Using toZonedTime since that's what your version of date-fns-tz exports.
import { format, toZonedTime } from "date-fns-tz";

const statusCodes: { [key: string]: string } = {
    "20": "X", // Cancelled
    "10": "E", // Entered
    "12": "R", // Released
    "14": "V", // Received from Vendor
    "16": "C", // Closed
    "18": "I", // Vendor Invoice Received
};

export default function DailyDueInTable() {
    // Instead of filtering down to recent orders in SQL, we load a larger dataset
    // so that we have the older rows available for the previous order lookup.
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
                p.date_prom_user,
                p.item_no,
                p.part_type,
                p.date_rcv
            FROM
                poitem p
            LEFT JOIN
                pohead ph ON p.po_number = ph.po_number
            WHERE
                p.date_orderd >= DATEADD(DAY, -90, GETDATE() + 1);
        `,
        }),
        []
    );

    const renderFunction = useCallback((data: POItemData[]) => {
        // ─── 1. Deduplicate Rows ────────────────────────────────────────────────
        // Use (po_number, item_no) as the deduplication key.
        const dedupedMap = new Map<string, POItemData>();
        data.forEach((item) => {
            const key = `${item.po_number}-${item.item_no}`;
            if (!dedupedMap.has(key)) {
                dedupedMap.set(key, item);
            } else {
                const existing = dedupedMap.get(key);
                // Choose the row that has a date_rcv (or update if necessary)
                if (existing && !existing.date_rcv && item.date_rcv) {
                    dedupedMap.set(key, item);
                }
            }
        });
        const dedupedData = Array.from(dedupedMap.values());

        // ─── 2. Compute Previous Order Details for Each Deduped Row ──────────────
        dedupedData.forEach((item) => {
            const currentDate = new Date(item.date_orderd);
            const previousOrders = dedupedData.filter(
                (o) =>
                    o.part_code === item.part_code &&
                    new Date(o.date_orderd) < currentDate
            );
            if (previousOrders.length > 0) {
                const lastOrder = previousOrders.reduce((prev, curr) =>
                    new Date(curr.date_orderd) > new Date(prev.date_orderd)
                        ? curr
                        : prev
                );
                item.last_order_date = lastOrder.date_orderd;
                item.last_order_unit_price = lastOrder.unit_price;
            } else {
                item.last_order_date = null;
                item.last_order_unit_price = null;
            }
        });

        // ─── 3. Filter Down to “Recent” Orders ─────────────────────────────────────
        // Recent orders are defined as those with:
        //   - date_orderd within the last 10 days, and
        //   - vend_prom_date matching today.
        const today = new Date();
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(today.getDate() - 10);

        // Helper: format a date as a simple date string (ignoring the time).
        const formatDate = (date: any) =>
            date ? new Date(date).toDateString() : null;
        const todayStr = today.toDateString();

        const recentOrders = dedupedData.filter((item) => {
            const orderDate = new Date(item.date_orderd);
            const vendPromDateStr = formatDate(item.vend_prom_date);
            return orderDate >= tenDaysAgo && vendPromDateStr === todayStr;
        });

        // ─── 4. Merge Hidden Vendors ──────────────────────────────────────────────
        // If the vendor code is in the hidden list, merge rows.
        const mergedData = recentOrders.reduce((acc: POItemData[], item: POItemData) => {
            const isHiddenVendor = config.HIDDEN_OUTSTANDING_VENDOR_CODES.includes(
                item.vend_code
            );
            if (isHiddenVendor) {
                const existingEntry = acc.find(
                    (entry) =>
                        entry.po_number === item.po_number && entry.vend_code === item.vend_code
                );
                if (existingEntry) {
                    existingEntry.part_desc += `, ${item.part_desc}`;
                    existingEntry.unit_price =
                        (existingEntry.unit_price + item.unit_price) / 2;
                    existingEntry.isGrouped = true;
                } else {
                    acc.push({ ...item, isGrouped: true });
                }
            } else {
                acc.push({ ...item, isGrouped: false });
            }
            return acc;
        }, []);

        // ─── 5. Map Data for Display with Proper Timezone Conversion ───────────────
        // Get the user's local timezone.
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const tableData = mergedData.map((item) => ({
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
                ? format(
                    toZonedTime(new Date(item.date_orderd), timeZone),
                    "MMM d, yyyy",
                    { timeZone }
                )
                : "N/A",
            vendorPromiseDate: item.vend_prom_date
                ? format(
                    toZonedTime(new Date(item.vend_prom_date), timeZone),
                    "MMM d, yyyy",
                    { timeZone }
                )
                : "N/A",
            lastOrderDate: item.last_order_date
                ? format(
                    toZonedTime(new Date(item.last_order_date), timeZone),
                    "MMM d, yyyy",
                    { timeZone }
                )
                : "N/A",
            lastOrderUnitPrice: item.last_order_unit_price
                ? `$${new Intl.NumberFormat("en-US", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                }).format(item.last_order_unit_price)}`
                : "N/A",
            userOrdered: item.date_prom_user,
        }));

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
                            <TableHead>Vendor Promise Date</TableHead>
                            <TableHead>Prev. Unit Price</TableHead>
                            <TableHead>Prev. Order Date</TableHead>
                            <TableHead>Ordered By</TableHead>
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
                                <TableCell>
                                    {row.poNumber}
                                    {row.isGrouped && (
                                        <span
                                            className="ml-2 px-2 py-1 text-xs font-semibold text-white bg-blue-500 rounded-md"
                                            title="This PO is grouped"
                                        >
                                            G
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="font-black">
                                    {statusCodes[row.poStatus] || "N/A"}
                                </TableCell>
                                <TableCell>{row.vendName}</TableCell>
                                <TableCell>{row.partCode}</TableCell>
                                <TableCell>{row.recentUnitPrice}</TableCell>
                                <TableCell>{row.dateOrdered}</TableCell>
                                <TableCell>{row.vendorPromiseDate}</TableCell>
                                <TableCell>{row.lastOrderUnitPrice}</TableCell>
                                <TableCell>{row.lastOrderDate}</TableCell>
                                <TableCell>{row.userOrdered}</TableCell>
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