import Widget from "./Widget";
import config from "@/config";
import { POItemData } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

/* -------------------------------------- */
/* 📊 Daily Due In Table Component  */
/* -------------------------------------- */

const statusCodes: { [key: string]: string } = {
    '20': 'X', // Cancelled
    '10': 'E', // Entered
    '12': 'R', // Released
    '14': 'V', // Received from Vendor
    '16': 'C', // Closed
    '18': 'I', // Vendor Invoice Received
};

export default function DailyDueInTable() {
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
                                date_orderd >= DATEADD(DAY, -10, GETDATE() + 1)
                                AND CAST(vend_prom_date AS DATE) = CAST(GETDATE() AS DATE)
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
                        ORDER BY
                            ro.po_number ASC,
                            ro.vend_prom_date ASC;
                    `,
                }}
                title="Daily Due In"
                updateInterval={300000}
                render={(data: POItemData[]) => {
                    // Group and process data
                    const mergedData = data.reduce((acc: POItemData[], item: POItemData) => {
                        const isHiddenVendor = config.HIDDEN_OUTSTANDING_VENDOR_CODES.includes(item.vend_code);
                        if (isHiddenVendor) {
                            const existingEntry = acc.find(
                                (entry) => entry.po_number === item.po_number && entry.vend_code === item.vend_code
                            );
                            if (existingEntry) {
                                existingEntry.part_desc += `, ${item.part_desc}`;
                                existingEntry.recent_unit_price =
                                    (existingEntry.recent_unit_price + item.recent_unit_price) / 2; // Average price
                                existingEntry.isGrouped = true; // Mark as grouped
                            } else {
                                acc.push({ ...item, isGrouped: true }); // Mark as grouped
                            }
                        } else {
                            acc.push({ ...item, isGrouped: false }); // Not grouped
                        }
                        return acc;
                    }, []);

                    // Map merged data to table rows
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

                    console.log("Processed Data:", tableData);

                    return (
                        <ScrollArea className="h-[95%] rounded-md border mt-2">
                            <Table className="text-left text-white outstanding-orders-table text-[1rem]" wrapperClassName="overflow-clip">
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
                                            className={`${statusCodes[row.poStatus] === 'X' ? 'cancelled-po' : ''} ${row.isGrouped ? 'grouped-po' : ''
                                                }
                                                ${statusCodes[row.poStatus] === 'V' ? 'received-po' : ''}
                                                `}
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
                                            <TableCell className="font-black">{statusCodes[row.poStatus] || 'N/A'}</TableCell>
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
                }}
            />
        </div>
    );
}