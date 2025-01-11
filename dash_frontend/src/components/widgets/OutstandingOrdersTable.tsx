import Widget from "./Widget";
import { nFormatter } from "@/utils/helpers";
import config from "@/config";
import { POItemData } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


/* -------------------------------------- */
/* 📊 Outstanding Orders Table Component             */
/* -------------------------------------- */

export default function OutstandingOrdersTable() {

    return (
        <div style={{ height: "100%", width: "100%" }}>
            <Widget
                apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
                payload={{
                    table: "poitem",
                    columns: [
                        "po_number",
                        "part_code",
                        "part_desc",
                        "date_orderd",
                        "vend_prom_date",
                        "date_prom_user",
                    ],
                    filters: `
            (date_orderd >= DATEADD(DAY, -10, GETDATE())) AND 
            (date_rcv IS NULL) AND 
            (vend_prom_date < GETDATE())
        `,
                    sort: ["vend_prom_date ASC"], // Sort by vend_prom_date in ascending order
                }}
                title="Outstanding Due In"
                updateInterval={300000}
                render={(data: POItemData[]) => {
                    const tableData = data.map((item) => ({
                        poNumber: item.po_number,
                        partCode: item.part_code,
                        partDescription: item.part_desc,
                        dateOrdered: new Date(item.date_orderd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                        vendorPromiseDate: new Date(item.vend_prom_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                        userOrdered: item.date_prom_user
                    }));

                    return (
                        <Table className="text-left text-white mt-4">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>PO Number</TableHead>
                                    <TableHead>Part Code</TableHead>
                                    {/* <TableHead>Part Description</TableHead> */}
                                    <TableHead>Date Ordered</TableHead>
                                    <TableHead>Vendor Promise Date</TableHead>
                                    <TableHead>Ordered By</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tableData.map((row, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{row.poNumber}</TableCell>
                                        <TableCell>{row.partCode}</TableCell>
                                        {/* <TableCell>{row.partDescription}</TableCell> */}
                                        <TableCell>{row.dateOrdered}</TableCell>
                                        <TableCell>{row.vendorPromiseDate}</TableCell>
                                        <TableCell>{row.userOrdered}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    );
                }}
            />
        </div>
    );
}