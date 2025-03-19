import React, { useMemo, useCallback } from "react";
import Widget from "./Widget";
import config from "@/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, differenceInCalendarMonths } from "date-fns";

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
    // Prepare the widget payload with SQL query.
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
            sort: ["date_entered DESC"],
        }),
        []
    );


    // Transform raw data into table row data.
    const renderFunction = useCallback((data: ProductUnitData[]) => {
        console.log(data);
        if (!data || !Array.isArray(data)) {
            return <div>No data available</div>;
        }
        // Initialize product aggregates for each product in PRODUCTS
        const aggregates: {
            [key: string]: {
                partCode: string;
                partDesc: string;
                uom: string;
                total3: number;
                total6: number;
                total9: number;
                total12: number;
            };
        } = {};

        // Initialize aggregates for all products in PRODUCTS
        PRODUCTS.forEach(code => {
            aggregates[code] = {
                partCode: code,
                partDesc: "",
                uom: "",
                total3: 0,
                total6: 0,
                total9: 0,
                total12: 0,
            };
        });

        const now = new Date();
        data.forEach(row => {
            const code = row.part_code;
            // Only process if the product is in our list
            if (aggregates[code]) {
                // Use the first available partDesc and uom
                if (!aggregates[code].partDesc && row.part_desc) {
                    aggregates[code].partDesc = row.part_desc;
                }
                if (!aggregates[code].uom && row.uom) {
                    aggregates[code].uom = row.uom;
                }
                const saleDate = new Date(row.date_entered);
                const diffMonths = differenceInCalendarMonths(now, saleDate);
                // Only include sales from the past 12 months
                if (diffMonths < 12) {
                    if (diffMonths < 3) {
                        aggregates[code].total3 += row.qty;
                    }
                    if (diffMonths < 6) {
                        aggregates[code].total6 += row.qty;
                    }
                    if (diffMonths < 9) {
                        aggregates[code].total9 += row.qty;
                    }
                    aggregates[code].total12 += row.qty;
                }
            }
        });

        // Prepare table rows with average monthly units for each period
        const tableData = Object.values(aggregates).map(product => ({
            partCode: product.partCode,
            partDesc: product.partDesc || product.partCode,
            uom: product.uom,
            avg3: (product.total3 / 3).toFixed(2),
            avg6: (product.total6 / 6).toFixed(2),
            avg9: (product.total9 / 9).toFixed(2),
            avg12: (product.total12 / 12).toFixed(2),
        }));

        // Sort tableData alphabetically by partCode
        tableData.sort((a, b) => a.partCode.localeCompare(b.partCode));

        return (
            <ScrollArea className="h-[95%] rounded-md border mt-2">
                <Table className="text-left text-white outstanding-orders-table text-[.95rem]" wrapperClassName="overflow-clip">
                    <TableHeader>
                        <TableRow>
                            <TableCell>Part Code</TableCell>
                            <TableCell>Part Description</TableCell>
                            <TableCell>UOM</TableCell>
                            <TableCell>Avg 3 Mo</TableCell>
                            <TableCell>Avg 6 Mo</TableCell>
                            <TableCell>Avg 9 Mo</TableCell>
                            <TableCell>Avg 12 Mo</TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row, i) => (
                            <TableRow key={i}>
                                <TableCell>{row.partCode}</TableCell>
                                <TableCell>{row.partDesc}</TableCell>
                                <TableCell>{row.uom}</TableCell>
                                <TableCell>{row.avg3}</TableCell>
                                <TableCell>{row.avg6}</TableCell>
                                <TableCell>{row.avg9}</TableCell>
                                <TableCell>{row.avg12}</TableCell>
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