import React, { useMemo, useCallback } from "react";
import Widget from "./Widget";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

/* -------------------------------------- */
/* 📊 Types & Interfaces                  */
/* -------------------------------------- */

const MACHINE_CODES = [
    "HERA",
    "HERA-2",
    "ELECTRA",
    "ELECTRA-2",
    "ATHENA",
    "ATHENA-2",
    "ZEUS",
    "ZEUS-2",
    "APOLLO",
    "APOLLO-2",
    "TITAN",
    "TITAN-2",
    "SPARTAN",
    "SPARTAN-2",
];

interface MachineStockData {
    part_code: string;
    part_desc: string;
    cost_ctr: string;
    available: number;
    on_hand: number;
    on_hold: number;
}

interface TableRowData {
    partCode: string;
    partDescription: string;
    costCenter: string;
    available: string;
    onHand: string;
    onHold: string;
    stockPercentage: number;
}

/* -------------------------------------- */
/* 📊 Helper Functions                    */
/* -------------------------------------- */

/**
 * Calculate stock percentage based on available vs on_hand
 * Available should be close to on_hand for good stock levels
 */
const calculateStockPercentage = (available: number, onHand: number): number => {
    if (onHand === 0) return 0;
    return (available / onHand) * 100;
};

/**
 * Get status badge class based on stock percentage
 */
const getStockStatusClass = (percentage: number): string => {
    if (percentage >= 80) return "badge-success";
    if (percentage >= 50) return "badge-warning";
    return "badge-danger";
};

/**
 * Map raw data to table row format
 */
const mapToTableData = (data: MachineStockData[]): TableRowData[] => {
    return data.map((item) => {
        const stockPercentage = calculateStockPercentage(item.available, item.on_hand);
        return {
            partCode: item.part_code,
            partDescription: item.part_desc,
            costCenter: item.cost_ctr || "N/A",
            available: new Intl.NumberFormat("en-US").format(item.available),
            onHand: new Intl.NumberFormat("en-US").format(item.on_hand),
            onHold: new Intl.NumberFormat("en-US").format(item.on_hold),
            stockPercentage,
        };
    });
};

/* -------------------------------------- */
/* 📊 MachineStockStatus Component        */
/* -------------------------------------- */

export default function MachineStockStatus() {
    // Memoize the widget payload
    const widgetPayload = useMemo(
        () => ({
            module: "MachineStockStatus",
            table: "inventory",
            columns: ["part_code", "part_desc", "cost_ctr", "available", "on_hand", "on_hold"],
            filters: `part_code IN (${MACHINE_CODES.map(code => `'${code}'`).join(", ")})`,
            sort: ["part_code ASC"]
        }),
        []
    );

    // Render function for the table
    const renderFunction = useCallback((data: MachineStockData[]) => {
        const tableData = mapToTableData(data);

        return (
            <ScrollArea className="h-full w-full border-2 border-border rounded-md">
                <Table className="text-left text-white machine-stock-table">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-semibold">Cost Center</TableHead>
                            <TableHead className="font-semibold">Machine Code</TableHead>
                            <TableHead className="font-semibold">Description</TableHead>
                            <TableHead className="font-semibold text-center">Available</TableHead>
                            <TableHead className="font-semibold text-center">On Hand</TableHead>
                            <TableHead className="font-semibold text-center">On Hold</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row) => (
                            <TableRow key={row.partCode}>
                                <TableCell className="font-medium">{row.costCenter}</TableCell>
                                <TableCell className="font-black">{row.partCode}</TableCell>
                                <TableCell className="text-sm opacity-90">{row.partDescription}</TableCell>
                                <TableCell className="text-center">
                                    <span className={`badge ${getStockStatusClass(row.stockPercentage)} font-semibold`}>
                                        {row.available}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center font-medium">{row.onHand}</TableCell>
                                <TableCell className="text-center font-medium opacity-75">{row.onHold}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        );
    }, []);

    return (
        <Widget
            endpoint="/api/widgets"
            payload={widgetPayload}
            title="Machine Stock Status"
            refreshInterval={30000}
        >
            {(data, loading) => {
                if (!data || data.length === 0) {
                    return <div className="widget-empty">No machine data available</div>;
                }

                return renderFunction(data);
            }}
        </Widget>
    );
}
