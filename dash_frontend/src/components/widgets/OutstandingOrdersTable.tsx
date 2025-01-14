import Widget from "./Widget";
import config from "@/config";
import { POItemData } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseISO, format } from "date-fns";

/* -------------------------------------- */
/* 📊 Outstanding Orders Table Component  */
/* -------------------------------------- */

export default function OutstandingOrdersTable() {
    const hiddenVendorCodes = config.HIDDEN_OUTSTANDING_VENDOR_CODES.map((code) => `'${code}'`).join(", ");

    return (
        <div style={{ height: "100%", width: "100%" }} className="overflow-hidden">
            <Widget
                apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
                payload={{
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
        ROW_NUMBER() OVER (
            PARTITION BY po_number, item_no
            ORDER BY
                CASE WHEN date_rcv IS NOT NULL THEN 1 ELSE 2 END,
                date_rcv DESC
        ) AS row_num
    FROM
        poitem
    WHERE
        part_type = 'S' -- Filter rows by part_type = 'S'
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
        part_type
    FROM
        AdjustedOrders
    WHERE
        row_num = 1
        AND vend_code NOT IN (${hiddenVendorCodes}) -- Exclude hidden vendor codes
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
        part_type
    FROM
        FilteredOrders
    WHERE
        date_orderd >= DATEADD(DAY, -10, GETDATE())
        AND date_rcv IS NULL
        AND vend_prom_date < DATEADD(DAY, -1, GETDATE())
        AND date_prom_user IN ('tomsta', 'purcha')
)
SELECT
    ro.po_number,
    ro.vend_code,
    ro.vend_name,
    ro.part_code,
    ro.part_desc,
    ro.recent_unit_price,
    ro.recent_date_orderd,
    ro.vend_prom_date,
    ro.date_prom_user,
    ro.part_type,
    lo.last_order_date,
    lo.last_order_unit_price
FROM
    RecentOrders ro
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
ORDER BY
    ro.vend_prom_date ASC;
                    `,
                }}
                title="Outstanding Due In"
                updateInterval={300000}
                render={(data: POItemData[]) => {
                    const tableData = data.map((item) => ({
                        poNumber: item.po_number,
                        vendName: item.vend_name,
                        partCode: item.part_code,
                        partDescription: item.part_desc,
                        recentUnitPrice: `$${new Intl.NumberFormat("en-US", {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 4,
                        }).format(item.recent_unit_price)}`,
                        dateOrdered: item.recent_date_orderd
                            ? format(
                                new Date(new Date(item.recent_date_orderd).setDate(new Date(item.recent_date_orderd).getDate() + 1)),
                                "MMM d, yyyy"
                            )
                            : "N/A",
                        vendorPromiseDate: item.vend_prom_date
                            ? format(
                                new Date(new Date(item.vend_prom_date).setDate(new Date(item.vend_prom_date).getDate() + 1)),
                                "MMM d, yyyy"
                            )
                            : "N/A",
                        lastOrderDate: item.last_order_date
                            ? format(
                                new Date(new Date(item.last_order_date).setDate(new Date(item.last_order_date).getDate() + 1)),
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

                    console.log("Data received from API:", tableData);

                    return (
                        <ScrollArea className="h-[95%] rounded-md border mt-2">
                            <Table className="text-left text-white outstanding-orders-table" wrapperClassName="overflow-clip">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>PO Number</TableHead>
                                        <TableHead>Vendor Name</TableHead>
                                        <TableHead>Part Code</TableHead>
                                        <TableHead>Unit Price (Recent)</TableHead>
                                        <TableHead>Date Ordered</TableHead>
                                        <TableHead>Vendor Promise Date</TableHead>
                                        <TableHead>Last Order Date</TableHead>
                                        <TableHead>Unit Price (Last Order)</TableHead>
                                        <TableHead>Ordered By</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableData.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{row.poNumber}</TableCell>
                                            <TableCell>{row.vendName}</TableCell>
                                            <TableCell>{row.partCode}</TableCell>
                                            <TableCell>{row.recentUnitPrice}</TableCell>
                                            <TableCell>{row.dateOrdered}</TableCell>
                                            <TableCell>{row.vendorPromiseDate}</TableCell>
                                            <TableCell>{row.lastOrderDate}</TableCell>
                                            <TableCell>{row.lastOrderUnitPrice}</TableCell>
                                            <TableCell>{row.userOrdered}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    );
                }}
            />
        </div>
    );
}