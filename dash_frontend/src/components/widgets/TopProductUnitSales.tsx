import React, { useMemo, useCallback } from "react";
import Widget from "./Widget";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, subMonths, endOfMonth } from "date-fns";
import { Package, FileText, TrendingUp, Calendar, Award } from "lucide-react";


/* -------------------------------------- */
/* Constants & Helper Functions           */
/* -------------------------------------- */
const PRODUCTS = [
    "1130",
    "1220",
    "1140",
    "1210",
    "270",
    "270C",
    "1040",
    "H1410",
    "H1220",
    "H1140",
    "H405",
    "H00132",
    "1001",
    "402",
    "502",
    "504",
    "407",
    "1410-C",
    "1220-C",
    "10906",
    "10907",
    "286",
    "287",
    "100",
    "104"
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

            // Helper function: compute raw average for given period
            const computeAvgRaw = (startIndex: number, periodLength: number) => {
                let sum = 0;
                for (let i = startIndex; i < startIndex + periodLength; i++) {
                    const mKey = months[i];
                    sum += monthlyData[mKey] || 0;
                }
                return Math.floor(sum / periodLength);
            };

            const avg3Raw = computeAvgRaw(9, 3);
            const avg6Raw = computeAvgRaw(6, 6);
            const avg9Raw = computeAvgRaw(3, 9);
            const avg12Raw = computeAvgRaw(0, 12);

            const pctChange = (current: number, next: number) => {
                if (next === 0) return null;
                return ((current - next) / next) * 100;
            };

            const pct3 = pctChange(avg3Raw, avg6Raw);
            const pct6 = pctChange(avg6Raw, avg9Raw);
            const pct9 = pctChange(avg9Raw, avg12Raw);

            return {
                partCode,
                partDesc: product.partDesc,
                avg3: { value: avg3Raw.toLocaleString(), pct: pct3 },
                avg6: { value: avg6Raw.toLocaleString(), pct: pct6 },
                avg9: { value: avg9Raw.toLocaleString(), pct: pct9 },
                avg12: { value: avg12Raw.toLocaleString() },
            };
        }).sort((a, b) => {
            return parseInt(b.avg12.value.replace(/,/g, "")) - parseInt(a.avg12.value.replace(/,/g, ""));
        });

        // Helper function to get color classes based on percentage
        const getPercentageColor = (pct: number) => {
            if (pct >= 10) return "bg-emerald-500/25 text-emerald-200 border-emerald-400/60";
            if (pct >= 5) return "bg-green-500/25 text-green-200 border-green-400/60";
            if (pct > 0) return "bg-lime-500/25 text-lime-200 border-lime-400/60";
            if (pct === 0) return "bg-slate-500/25 text-slate-200 border-slate-400/60";
            if (pct > -5) return "bg-yellow-500/25 text-yellow-200 border-yellow-400/60";
            if (pct > -10) return "bg-orange-500/25 text-orange-200 border-orange-400/60";
            return "bg-red-500/25 text-red-200 border-red-400/60";
        };

        return (
            <ScrollArea className="h-full w-full border-2 border-border rounded-md">
                <Table className="text-left text-white outstanding-orders-table">
                    <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                        <TableRow className="border-border/50 hover:bg-transparent">
                            <TableHead className="font-bold text-white py-2 w-12">
                                <div className="flex items-center gap-1">
                                    <Award className="h-3.5 w-3.5 text-amber-400" />
                                    #
                                </div>
                            </TableHead>
                            <TableHead className="font-bold text-white py-2 w-24">
                                <div className="flex items-center gap-1">
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                    Part
                                </div>
                            </TableHead>
                            <TableHead className="font-bold text-white py-2">
                                <div className="flex items-center gap-1">
                                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                    Description
                                </div>
                            </TableHead>
                            <TableHead className="text-center font-bold text-white py-2 w-48 border-l border-border">
                                <div className="flex items-center justify-center gap-1">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    3 Mo Avg
                                </div>
                            </TableHead>
                            <TableHead className="text-center font-bold text-white py-2 w-48 border-l border-border">
                                <div className="flex items-center justify-center gap-1">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    6 Mo Avg
                                </div>
                            </TableHead>
                            <TableHead className="text-center font-bold text-white py-2 w-48 border-l border-border">
                                <div className="flex items-center justify-center gap-1">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    9 Mo Avg
                                </div>
                            </TableHead>
                            <TableHead className="text-center font-bold text-white py-2 w-36 border-l border-border">
                                <div className="flex items-center justify-center gap-1">
                                    <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                                    12 Mo Avg
                                </div>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row, i) => {
                            const rank = i + 1;
                            const isTopThree = rank <= 3;
                            const rankColors = {
                                1: "text-amber-400 font-black",
                                2: "text-slate-300 font-black",
                                3: "text-amber-600 font-bold"
                            };
                            
                            return (
                                <TableRow 
                                    key={i} 
                                    className={`
                                        border-border/30 transition-all duration-300 hover:bg-muted/50
                                        ${isTopThree ? "bg-muted/20" : ""}
                                        ${rank === 1 ? "bg-amber-500/5 border-l-2 border-l-amber-500/50" : ""}
                                    `}
                                >
                                    <TableCell className="py-1.5 text-center">
                                        <span className={`font-bold text-[15px] ${rankColors[rank as 1 | 2 | 3] || "text-muted-foreground"}`}>
                                            {rank}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-mono font-bold text-[15px] leading-tight py-1.5">
                                        {row.partCode}
                                    </TableCell>
                                    <TableCell className="font-semibold text-[15px] leading-tight py-1.5">
                                        {row.partDesc}
                                    </TableCell>
                                    <TableCell className="py-1.5 border-l border-border">
                                        <div className="flex items-center justify-end gap-3 px-2">
                                            {row.avg3.pct !== null && (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${getPercentageColor(row.avg3.pct)}`}>
                                                    {row.avg3.pct > 0 ? "+" : ""}{row.avg3.pct.toFixed(1)}%
                                                </span>
                                            )}
                                            <span className="font-bold text-[15px] leading-tight min-w-[60px] text-right">{row.avg3.value}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-1.5 border-l border-border">
                                        <div className="flex items-center justify-end gap-3 px-2">
                                            {row.avg6.pct !== null && (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${getPercentageColor(row.avg6.pct)}`}>
                                                    {row.avg6.pct > 0 ? "+" : ""}{row.avg6.pct.toFixed(1)}%
                                                </span>
                                            )}
                                            <span className="font-bold text-[15px] leading-tight min-w-[60px] text-right">{row.avg6.value}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-1.5 border-l border-border">
                                        <div className="flex items-center justify-end gap-3 px-2">
                                            {row.avg9.pct !== null && (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${getPercentageColor(row.avg9.pct)}`}>
                                                    {row.avg9.pct > 0 ? "+" : ""}{row.avg9.pct.toFixed(1)}%
                                                </span>
                                            )}
                                            <span className="font-bold text-[15px] leading-tight min-w-[60px] text-right">{row.avg9.value}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className={`text-center py-1.5 border-l border-border ${rank === 1 ? "text-amber-300" : ""}`}>
                                        <span className="font-black text-[16px] leading-tight">{row.avg12.value}</span>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </ScrollArea>
        );
    }, []);

    return (
        <Widget
            endpoint="/api/widgets"
            payload={widgetPayload}
            title="Top Product Unit Sales"
            refreshInterval={30000}
        >
            {(data, loading) => {
                if (!data || data.length === 0) {
                    return <div className="widget-empty">No product data available</div>;
                }
                return renderFunction(data);
            }}
        </Widget>
    );
}