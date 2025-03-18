import React, { useMemo, useCallback } from "react";
import Widget from "./Widget";
import config from "@/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

/* -------------------------------------- */
/* Constants & Helper Functions           */
/* -------------------------------------- */
const PRODUCTS = [
    "1130", "1220", "1140", "1210", "270", "270C", "260",
    "H1410", "H1220", "H1140", "H405", "H00132", "1001",
    "402", "502", "504", "407",
    "1410-C", "1220-C",
    "10906", "10907", "286", "287",
    "100", "104"
];


type ProductUnitData = {
    part_code: string;
    part_desc: string;
    qty: number;
    uom: string;
    date_entered: string;
};

/* -------------------------------------- */
/* TopProductUnitSalesTable Component       */
/* -------------------------------------- */
export default function TopProductUnitSalesTable() {
    // Prepare the widget payload with the raw SQL query.
    const widgetPayload = useMemo(
        () => ({
            module: "TopProductUnitSales",
            table: "orditem",
            columns: [
                "part_code",
                "part_desc",
                "qty",
                "uom",
                "date_entered"
            ],
            filters: `part_code IN (${PRODUCTS.map((code) => `'${code}'`).join(",")}) AND `,
            sort: ["date_entered DESC", "order_numb ASC"],
        }),
        []
    );


    // Transform raw data into table row data.
    const renderFunction = useCallback((data: ProductUnitData[]) => {
        const tableData = data.map((row) => ({
            partCode: row.part_code,
            partDesc: row.part_desc,
            qty: row.qty,
            uom: row.uom,
            dateEntered: format(new Date(row.date_entered), "MM/dd/yyyy"),
        }));

        // Sort tableData alphabetically by vendor name, then by PO number, then by part code.
        tableData.sort((a, b) => {
            if (a.partCode < b.partCode) return -1;
            if (a.partCode > b.partCode) return 1;
            return 0;
        });

        // Render the table within a scrollable container.
        return (
            <ScrollArea className="h-[95%] rounded-md border mt-2">
                <Table className="text-left text-white outstanding-orders-table text-[.95rem]" wrapperClassName="overflow-clip">
                    <TableHeader>
                        <TableRow>
                            <TableCell>Part Code</TableCell>
                            <TableCell>Part Description</TableCell>
                            <TableCell>Qty</TableCell>
                            <TableCell>UOM</TableCell>
                            <TableCell>Date Entered</TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row, i) => (
                            <TableRow key={i}>
                                <TableCell>{row.partCode}</TableCell>
                                <TableCell>{row.partDesc}</TableCell>
                                <TableCell>{row.qty}</TableCell>
                                <TableCell>{row.uom}</TableCell>
                                <TableCell>{row.dateEntered}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        );
    }, []);

    return (
        <div style={{ height: "100%", width: "100%" }} className="overflow-hidden" >
            <Widget
                apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
                payload={widgetPayload}
                title="Top Product Unit Sales"
                updateInterval={30000}
                render={renderFunction}
            />
        </div >
    );
}