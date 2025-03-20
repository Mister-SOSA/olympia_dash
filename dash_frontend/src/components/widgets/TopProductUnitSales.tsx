import React, { useMemo, useCallback } from "react";
import Widget from "./Widget";
import config from "@/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, subMonths, endOfMonth } from "date-fns";

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

// Raw data type for each record from the API
type ProductUnitData = {
    part_code: string;
    part_desc: string;
    qty_ship_unt: number;
    trans_year: number; // Added trans_year
    trans_mo: number;   // Added trans_mo
};

// Shape of each product’s aggregated data:
//  - partDesc: string
//  - each 'yyyy-MM' key: number
interface ProductAggregates {
    partDesc: string;
    [monthKey: string]: string | number;
}

/* -------------------------------------- */
/* TopProductUnitSalesTable Component     */
/* -------------------------------------- */
export default function TopProductUnitSalesTable() {
    // Prepare the widget payload with SQL query.
    // This filter now only returns data for the last 12 complete months.
    const widgetPayload = useMemo(
        () => ({
            module: "TopProductUnitSales",
            table: "shpordview",
            columns: [
                "part_code",
                "part_desc",
                "qty_ship_unt",
                "trans_year", // Added trans_year
                "trans_mo",   // Added trans_mo
            ],
            filters: `part_code IN (${PRODUCTS.map((code) => `'${code}'`).join(",")}) AND qty_ship_unt > 0 AND trans_datetime >= DATEADD(MONTH, -12, DATEADD(DAY, 1, EOMONTH(GETDATE())))`,
            sort: ["trans_datetime DESC", "part_code ASC"],
        }),
        []
    );

    // Transform raw data into table row data.
    const renderFunction = useCallback((data: ProductUnitData[]) => {
        if (!data || !Array.isArray(data)) {
            return <div>No data available</div>;
        }

        // Calculate the list of 12 complete months (oldest first, newest last)
        const now = new Date();
        // Assuming the last complete month is the previous month
        const lastCompleteMonth = subMonths(endOfMonth(now), 1);
        const months: string[] = [];
        for (let i = 11; i >= 0; i--) {
            const monthDate = subMonths(lastCompleteMonth, i);
            months.push(format(monthDate, 'yyyy-MM'));
        }

        // Group raw data by product and by month
        const productMap: { [key: string]: { partDesc: string; monthly: { [key: string]: number } } } = {};

        data.forEach((record) => {
            // Construct monthKey using trans_year and trans_mo columns
            const monthKey = `${record.trans_year}-${String(record.trans_mo).padStart(2, '0')}`;
            // Only consider months in our defined 12-month range
            if (!months.includes(monthKey)) return;

            if (!productMap[record.part_code]) {
                productMap[record.part_code] = {
                    partDesc: record.part_desc,
                    monthly: {}
                };
                // Initialize monthly totals to 0
                months.forEach((m) => productMap[record.part_code].monthly[m] = 0);
            }
            productMap[record.part_code].monthly[monthKey] += record.qty_ship_unt;
        });

        // Build the table data by computing averages over the past 3, 6, 9, and 12 months
        const tableData = Object.keys(productMap).map((partCode) => {
            const product = productMap[partCode];
            const monthlyData = product.monthly;

            // Helper function: given a starting index in the 'months' array and a period length, compute the average
            const computeAvg = (startIndex: number, periodLength: number) => {
                let sum = 0;
                for (let i = startIndex; i < startIndex + periodLength; i++) {
                    const mKey = months[i];
                    sum += monthlyData[mKey] || 0;
                }
                const avg = Math.floor(sum / periodLength);
                return avg.toLocaleString();
            };

            return {
                partCode,
                partDesc: product.partDesc,
                avg3: computeAvg(9, 3),   // Last 3 months
                avg6: computeAvg(6, 6),   // Last 6 months
                avg9: computeAvg(3, 9),   // Last 9 months
                avg12: computeAvg(0, 12), // All 12 months
            };

        }
            // Sort by the average of the last 12 months
        ).sort((a, b) => {
            return parseInt(b.avg12.replace(/,/g, "")) - parseInt(a.avg12.replace(/,/g, ""));
        });

        return (
            <ScrollArea className="h-[99%] rounded-md border mt-2">
                <Table className="text-left text-white outstanding-orders-table text-[.9rem]" wrapperClassName="overflow-clip">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Part Code</TableHead>
                            <TableHead>Part Description</TableHead>
                            <TableHead className="text-right">Avg 3 Mo</TableHead>
                            <TableHead className="text-right">Avg 6 Mo</TableHead>
                            <TableHead className="text-right">Avg 9 Mo</TableHead>
                            <TableHead className="text-right">Avg 12 Mo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-black">{row.partCode}</TableCell>
                                <TableCell>{row.partDesc}</TableCell>
                                <TableCell className="text-right">{row.avg3}</TableCell>
                                <TableCell className="text-right">{row.avg6}</TableCell>
                                <TableCell className="text-right">{row.avg9}</TableCell>
                                <TableCell className="text-right">{row.avg12}</TableCell>
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
                title="Top Product Unit Sales"
                updateInterval={30000}
                render={renderFunction}
            />
        </div>
    );
}