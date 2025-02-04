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
import { format } from "date-fns";

/* -------------------------------------- */
/* 📊 Daily Due In Table Component        */
/* -------------------------------------- */

const statusCodes: { [key: string]: string } = {
    "20": "X", // Cancelled
    "10": "E", // Entered
    "12": "R", // Released
    "14": "V", // Received from Vendor
    "16": "C", // Closed
    "18": "I", // Vendor Invoice Received
};

export default function DailyDueInTable() {
    // Use a simplified SQL query that returns bulk data without heavy processing.
    // This query pulls all poitem rows (joined to pohead for status) that fall in the desired date ranges.
    const widgetPayload = useMemo(
        () => ({
            raw_query: `
        SELECT
          p.po_number,
          p.vend_code,
          p.vend_name,
          p.part_code,
          p.part_desc,
          p.unit_price,
          p.date_orderd,
          p.vend_prom_date,
          p.date_prom_user,
          p.date_rcv,
          p.item_no,
          p.part_type,
          ph.po_status
        FROM poitem p
        LEFT JOIN pohead ph ON p.po_number = ph.po_number
        WHERE
          p.date_orderd >= DATEADD(DAY, -10, DATEADD(DAY, 1, GETDATE()))
          AND p.vend_prom_date >= CAST(GETDATE() AS DATE)
          AND p.vend_prom_date < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
        ORDER BY p.po_number ASC, p.vend_prom_date ASC;
      `,
        }),
        []
    );

    // Wrap the render function so that its reference remains stable.
    // Here we perform grouping and selection to mimic the SQL window function.
    const renderFunction = useCallback((data: POItemData[]) => {
        // Group rows by a unique key (po_number + "_" + item_no)
        const groups = new Map<string, POItemData[]>();
        data.forEach((row) => {
            const key = `${row.po_number}_${row.item_no}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(row);
        });

        // For each group, select the best row per the SQL ordering:
        // ORDER BY CASE WHEN date_rcv IS NOT NULL THEN 1 ELSE 2 END, date_rcv DESC
        // If the chosen row's vend_code is in the hidden list, merge all rows in the group.
        const mergedData: POItemData[] = [];
        groups.forEach((group) => {
            // Sort the group according to the criteria:
            // - Rows with non-null date_rcv come first (we treat them as having rank 1, null as rank 2)
            // - Within the same rank, choose the row with the later date_rcv.
            const sortedGroup = group.sort((a, b) => {
                const aRank = a.date_rcv ? 1 : 2;
                const bRank = b.date_rcv ? 1 : 2;
                if (aRank !== bRank) {
                    return aRank - bRank;
                }
                // Both are same rank; if dates exist, compare descending
                if (a.date_rcv && b.date_rcv) {
                    return new Date(b.date_rcv).getTime() - new Date(a.date_rcv).getTime();
                }
                return 0;
            });
            // The first row is our candidate
            let best = { ...sortedGroup[0] };

            // If the best row is from a hidden vendor, merge all rows in the group.
            if (config.HIDDEN_OUTSTANDING_VENDOR_CODES.includes(best.vend_code)) {
                let mergedPartDesc = best.part_desc;
                let totalPrice = best.unit_price;
                let count = 1;
                sortedGroup.slice(1).forEach((row) => {
                    mergedPartDesc += `, ${row.part_desc}`;
                    totalPrice += row.unit_price;
                    count++;
                });
                best.part_desc = mergedPartDesc;
                best.unit_price = totalPrice / count;
                best.isGrouped = true;
            } else {
                // Otherwise, keep the best row as selected by the ordering.
                best.isGrouped = false;
            }
            mergedData.push(best);
        });

        // Map merged data to table row data
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
                    new Date(
                        new Date(item.date_orderd).setDate(
                            new Date(item.date_orderd).getDate() + 1
                        )
                    ),
                    "MMM d, yyyy"
                )
                : "N/A",
            vendorPromiseDate: item.vend_prom_date
                ? format(
                    new Date(
                        new Date(item.vend_prom_date).setDate(
                            new Date(item.vend_prom_date).getDate() + 1
                        )
                    ),
                    "MMM d, yyyy"
                )
                : "N/A",
            lastOrderDate: item.last_order_date
                ? format(
                    new Date(
                        new Date(item.last_order_date).setDate(
                            new Date(item.last_order_date).getDate() + 1
                        )
                    ),
                    "MMM d, yyyy"
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
                                className={`${statusCodes[row.poStatus] === "X" ? "cancelled-po" : ""} ${row.isGrouped ? "grouped-po" : ""
                                    } ${statusCodes[row.poStatus] === "V" ? "received-po" : ""}`}
                            >
                                <TableCell>
                                    {row.poNumber}
                                    {row.isGrouped && (
                                        <span
                                            className="ml-2 px-2 py-1 text-xs font-semibold text-white bg-blue-500 rounded-md align-middle justify-center"
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
                updateInterval={300000}
                render={renderFunction}
            />
        </div>
    );
}