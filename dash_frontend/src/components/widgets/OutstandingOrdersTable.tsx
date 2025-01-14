import Widget from "./Widget";
import config from "@/config";
import { POItemData } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseISO, format } from 'date-fns';

/* -------------------------------------- */
/* 📊 Outstanding Orders Table Component             */
/* -------------------------------------- */

export default function OutstandingOrdersTable() {
    return (
        <div style={{ height: "100%", width: "100%" }} className="overflow-hidden">
            <Widget
                apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
                payload={{
                    raw_query: `
WITH RecentOrders AS (
    SELECT
        po_number,
        vend_name,
        part_code,
        part_desc,
        unit_price AS recent_unit_price,
        date_orderd AS recent_date_orderd,
        vend_prom_date,
        date_prom_user
    FROM
        poitem
    WHERE
        date_orderd >= DATEADD(DAY, -10, GETDATE()) -- Ordered in the last 10 days
        AND date_rcv IS NULL -- Not yet received
        AND vend_prom_date < GETDATE() - 1 -- Overdue
        AND date_prom_user IN ('tomsta', 'purcha') -- Ordered by specific users
)
SELECT
    ro.po_number,
    ro.vend_name,
    ro.part_code,
    ro.part_desc,
    ro.recent_unit_price,
    ro.recent_date_orderd,
    ro.vend_prom_date,
    ro.date_prom_user,
    (SELECT TOP 1 p2.date_orderd
     FROM poitem p2
     WHERE p2.part_code = ro.part_code
       AND p2.date_orderd < ro.recent_date_orderd -- Any prior order
     ORDER BY p2.date_orderd DESC) AS last_order_date, -- Last order date
    (SELECT TOP 1 p2.unit_price
     FROM poitem p2
     WHERE p2.part_code = ro.part_code
       AND p2.date_orderd < ro.recent_date_orderd -- Match the same prior order
     ORDER BY p2.date_orderd DESC) AS last_order_unit_price -- Last order unit price
FROM
    RecentOrders ro
ORDER BY
    ro.vend_prom_date ASC;
                     `
                }}
                title="Outstanding Due In"
                updateInterval={300000}
                render={(data: POItemData[]) => {
                    const tableData = data.map((item) => ({
                        poNumber: item.po_number,
                        vendName: item.vend_name,
                        partCode: item.part_code,
                        partDescription: item.part_desc,
                        recentUnitPrice: `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(item.recent_unit_price)}`,
                        dateOrdered: item.recent_date_orderd
                            ? format(new Date(new Date(item.recent_date_orderd).setDate(new Date(item.recent_date_orderd).getDate() + 1)), 'MMM d, yyyy')
                            : 'N/A',
                        vendorPromiseDate: item.vend_prom_date
                            ? format(new Date(new Date(item.vend_prom_date).setDate(new Date(item.vend_prom_date).getDate() + 1)), 'MMM d, yyyy')
                            : 'N/A',
                        lastOrderDate: item.last_order_date
                            ? format(new Date(new Date(item.last_order_date).setDate(new Date(item.last_order_date).getDate() + 1)), 'MMM d, yyyy')
                            : 'N/A',
                        lastOrderUnitPrice: item.last_order_unit_price
                            ? `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(item.last_order_unit_price)}`
                            : 'N/A',
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