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
                    table: "poitem",
                    columns: [
                        "po_number",
                        "vend_name",
                        "part_code",
                        "part_desc",
                        "unit_price",
                        "date_orderd",
                        "vend_prom_date",
                        "date_prom_user",
                    ],
                    filters: `
            (date_orderd >= DATEADD(DAY, -10, GETDATE()))
            AND
            (date_rcv IS NULL)
            AND
            (vend_prom_date < GETDATE() - 1)
            AND
            date_prom_user IN ('tomsta', 'purcha')
        `,
                    sort: ["vend_prom_date ASC"],
                }}
                title="Outstanding Due In"
                updateInterval={300000}
                render={(data: POItemData[]) => {
                    const tableData = data.map((item) => ({
                        poNumber: item.po_number,
                        vendName: item.vend_name,
                        partCode: item.part_code,
                        partDescription: item.part_desc,
                        unitPrice: `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(item.unit_price)}`,
                        dateOrdered: item.date_orderd
                            ? format(new Date(new Date(item.date_orderd).setDate(new Date(item.date_orderd).getDate() + 1)), 'MMM d, yyyy')
                            : 'N/A',
                        vendorPromiseDate: item.vend_prom_date
                            ? format(new Date(new Date(item.vend_prom_date).setDate(new Date(item.vend_prom_date).getDate() + 1)), 'MMM d, yyyy')
                            : 'N/A',
                        userOrdered: item.date_prom_user
                    }));

                    console.log("Data received from API:", tableData);

                    return (
                        <ScrollArea className="h-[95%] rounded-md border mt-2">
                            <Table className="text-left text-white outstanding-orders-table" wrapperClassName="overflow-clip">
                                <TableHeader className="">
                                    <TableRow>
                                        <TableHead>PO Number</TableHead>
                                        <TableHead>Vendor Name</TableHead>
                                        <TableHead>Part Code</TableHead>
                                        <TableHead>Unit Price</TableHead>
                                        <TableHead>Date Ordered</TableHead>
                                        <TableHead>Vendor Promise Date</TableHead>
                                        <TableHead>Ordered By</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableData.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{row.poNumber}</TableCell>
                                            <TableCell>{row.vendName}</TableCell>
                                            <TableCell>{row.partCode}</TableCell>
                                            <TableCell>{row.unitPrice}</TableCell>
                                            <TableCell>{row.dateOrdered}</TableCell>
                                            <TableCell>{row.vendorPromiseDate}</TableCell>
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