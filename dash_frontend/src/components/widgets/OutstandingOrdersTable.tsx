import React, { useMemo, useCallback } from "react";
import Widget from "./Widget";
import config from "@/config";
import { POItemData } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";


/* -------------------------------------- */
/* Constants & Helper Functions           */
/* -------------------------------------- */
const STATUS_CODES: { [key: string]: string } = {
    '20': 'X', // Cancelled
    '10': 'E', // Entered
    '12': 'R', // Released
    '14': 'V', // Received from Vendor
    '16': 'C', // Closed
    '18': 'I', // Vendor Invoice Received
};

const renderStatusBadge = (statusCode: string) => {
    const status = STATUS_CODES[statusCode];
    const badgeClass =
        status === "X"
            ? "badge-danger"
            : status === "V"
                ? "badge-success"
                : "badge-primary";

    return <span className={`badge ${badgeClass}`}>{status}</span>;
};

const adjustDateByOneDay = (dateStr?: string): Date | null =>
    dateStr ? new Date(new Date(dateStr).setDate(new Date(dateStr).getDate() + 1)) : null;

/* -------------------------------------- */
/* OutstandingOrdersTable Component       */
/* -------------------------------------- */
export default function OutstandingOrdersTable() {
    // Memoize hidden vendor codes string for query filtering.
    const hiddenVendorCodes = useMemo(
        () => config.HIDDEN_OUTSTANDING_VENDOR_CODES.map(code => `'${code}'`).join(", "),
        []
    );

    // Prepare the widget payload with the raw SQL query.
    const widgetPayload = useMemo(
        () => ({
            module: "OutstandingOrdersTable",
            raw_query: `
        WITH AdjustedOrders AS (
            SELECT
                po_number,
                vend_code,
                vend_name,
                part_code,
                part_desc,
                unit_price,
                date_orderd,
                vend_prom_date,
                date_prom_user,
                date_rcv,
                item_no,
                part_type,
                qty_ord,
                uom,
                ROW_NUMBER() OVER (
                    PARTITION BY po_number, item_no
                    ORDER BY
                        CASE WHEN date_rcv IS NOT NULL THEN 1 ELSE 2 END,
                        date_rcv DESC
                ) AS row_num
            FROM
                poitem
            WHERE
                part_type = 'S'
        ),
        FilteredOrders AS (
            SELECT
                po_number,
                vend_code,
                vend_name,
                part_code,
                part_desc,
                unit_price,
                date_orderd,
                vend_prom_date,
                date_prom_user,
                date_rcv,
                item_no,
                part_type,
                qty_ord,
                uom
            FROM
                AdjustedOrders
            WHERE
                row_num = 1
                AND vend_code NOT IN (${hiddenVendorCodes})
        ),
        RecentOrders AS (
            SELECT
                po_number,
                vend_code,
                vend_name,
                part_code,
                part_desc,
                unit_price AS recent_unit_price,
                date_orderd AS recent_date_orderd,
                vend_prom_date,
                date_prom_user,
                part_type,
                qty_ord,
                uom
            FROM
                FilteredOrders
            WHERE
                date_orderd >= DATEADD(DAY, -10, GETDATE())
                AND date_rcv IS NULL
                AND vend_prom_date < DATEADD(DAY, -1, GETDATE())
        )
        SELECT
            ro.po_number,
            ph.po_status,
            ro.vend_code,
            ro.vend_name,
            ro.part_code,
            ro.part_desc,
            ro.recent_unit_price,
            ro.recent_date_orderd,
            ro.vend_prom_date,
            ro.date_prom_user,
            ro.part_type,
            ro.qty_ord,
            ro.uom,
            lo.last_order_date,
            lo.last_order_unit_price
        FROM
            RecentOrders ro
        LEFT JOIN
            pohead ph ON ro.po_number = ph.po_number
        OUTER APPLY (
            SELECT TOP 1
                p2.date_orderd AS last_order_date,
                p2.unit_price AS last_order_unit_price
            FROM
                FilteredOrders p2
            WHERE
                p2.part_code = ro.part_code
                AND p2.date_orderd < ro.recent_date_orderd
            ORDER BY
                p2.date_orderd DESC
        ) lo
        WHERE
            ph.po_status = '12'
        ORDER BY
            ro.po_number ASC,
            ro.vend_prom_date ASC;
      `,
        }),
        [hiddenVendorCodes]
    );

    // Transform raw data into table row data.
    const renderFunction = useCallback((data: POItemData[]) => {
        const tableData = data.map((item) => {
            const adjustedOrderDate = adjustDateByOneDay(item.recent_date_orderd ?? undefined);
            const adjustedVendPromDate = adjustDateByOneDay(item.vend_prom_date ?? undefined);

            // Calculate overdue days based on the adjusted vendor promise date.
            const overdueDays = adjustedVendPromDate
                ? Math.floor((new Date().getTime() - adjustedVendPromDate.getTime()) / (1000 * 60 * 60 * 24) + 1)
                : 0;

            return {
                poNumber: item.po_number,
                poStatus: item.po_status,
                vendName: item.vend_name,
                partCode: item.part_code,
                qtyOrdered:
                    item.qty_ord !== undefined && item.uom
                        ? `${new Intl.NumberFormat("en-US").format(item.qty_ord)} ${item.uom}`
                        : "N/A",
                dateOrdered: adjustedOrderDate ? format(adjustedOrderDate, "MMM d, yyyy") : "N/A",
                vendorPromiseDate: adjustedVendPromDate ? format(adjustedVendPromDate, "MMM d, yyyy") : "N/A",
                lastOrderDate: item.last_order_date
                    ? format(adjustDateByOneDay(item.last_order_date) as Date, "MMM d, yyyy")
                    : "N/A",
                recentUnitPrice: item.recent_unit_price
                    ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })
                        .format(item.recent_unit_price)
                    : "N/A",
                lastOrderUnitPrice: item.last_order_unit_price
                    ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })
                        .format(item.last_order_unit_price)
                    : "N/A",
                overdueDays,
                isGrouped: false, // Outstanding orders don't use grouping, default to false.
            };
        });

        // Sort tableData alphabetically by vendor name, then by PO number, then by part code.
        tableData.sort((a, b) => {
            const vendorComparison = a.vendName.localeCompare(b.vendName);
            if (vendorComparison !== 0) return vendorComparison;
            const poComparison = a.poNumber.localeCompare(b.poNumber);
            if (poComparison !== 0) return poComparison;
            return a.partCode.localeCompare(b.partCode);
        });

        // Render the table within a scrollable container.
        return (
            <ScrollArea className="h-[calc(100%-2.75rem)] rounded-md border mt-6">
                <Table className="text-left text-white outstanding-orders-table text-[.95rem]" wrapperClassName="overflow-clip">
                    <TableHeader>
                        <TableRow>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Part Code</TableHead>
                            <TableHead className="text-right">Qty Ordered</TableHead>
                            <TableHead className="text-right">Date Ordered</TableHead>
                            <TableHead className="text-right">Vendor Promise Date</TableHead>
                            <TableHead className="text-right">Prev. Order</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Prev. Price</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row, index) => (
                            <TableRow
                                key={index}
                                className={`
                  ${STATUS_CODES[row.poStatus] === "X" ? "cancelled-po" : ""} 
                  ${row.isGrouped ? "grouped-po" : ""} 
                  ${STATUS_CODES[row.poStatus] === "V" ? "received-po" : ""}
                `}
                            >
                                <TableCell className="font-black">{row.poNumber}</TableCell>
                                <TableCell className="font-black">{renderStatusBadge(row.poStatus)}</TableCell>
                                <TableCell>{row.vendName}</TableCell>
                                <TableCell>{row.partCode}</TableCell>
                                <TableCell className="text-right">{row.qtyOrdered}</TableCell>
                                <TableCell className="text-right">{row.dateOrdered}</TableCell>
                                <TableCell className="text-right">
                                    {row.vendorPromiseDate}
                                    <span className="badge badge-warning ml-2">{row.overdueDays}</span>
                                </TableCell>
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
    }, []);

    return (
        <div style={{ height: "100%", width: "100%" }} className="overflow-hidden">
            <Widget
                endpoint="/api/widgets"
                payload={widgetPayload}
                title="Outstanding Due In"
                refreshInterval={30000}
            >
                {(data, loading) => {
                    if (loading) {
                        return <div className="widget-loading">Loading orders...</div>;
                    }

                    if (!data || data.length === 0) {
                        return <div className="widget-empty">No orders found</div>;
                    }

                    return renderFunction(data);
                }}
            </Widget>
        </div>
    );
}