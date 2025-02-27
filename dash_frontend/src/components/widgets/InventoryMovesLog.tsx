import React, { useCallback, useRef, useEffect } from "react";
import Widget from "./Widget";
import config from "@/config";
import { InventoryMove, InventoryMoveRaw } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function InventoryMovesLog() {
    // Ref to keep track of previously seen rows by their unique id (docNumber)
    const previousDocsRef = useRef<Set<string>>(new Set());

    const renderFunction = useCallback((data: InventoryMoveRaw[]) => {
        // Map raw data to our table format
        const tableData: (InventoryMove & { isNew?: boolean })[] = data.map((item: InventoryMoveRaw) => ({
            moveDate: item.trans_date,
            moveUser: item.user_id,
            adjustmentType: item.adj_type,
            adjustmentStatus: item.adj_status,
            partCode: item.part_code,
            quantity: item.lotqty,
            uom: item.uom,
            fromLocation: item.location,
            toLocation: item.to_location,
            docNumber: item.recnum,
            lotNumber: item.lot,
            // Mark as new if this docNumber hasn't been seen before
            isNew: !previousDocsRef.current.has(item.recnum),
        }));

        // Update the ref with the current docNumbers for future comparisons
        const newDocSet = new Set<string>(tableData.map(row => row.docNumber));
        previousDocsRef.current = newDocSet;

        return (
            <ScrollArea className="h-[95%] rounded-md border mt-2">
                <Table className="text-left text-white inventory-moves-log-table text-[1rem]" wrapperClassName="overflow-clip">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Part Code</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>UOM</TableHead>
                            <TableHead>From Location</TableHead>
                            <TableHead>To Location</TableHead>
                            <TableHead>Doc Number</TableHead>
                            <TableHead>Lot Number</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row, index) => (
                            <TableRow
                                key={row.docNumber || index}
                                className={row.isNew ? "flash" : ""}
                            >
                                <TableCell>{row.moveDate}</TableCell>
                                <TableCell>{row.moveUser}</TableCell>
                                <TableCell>{row.adjustmentType}</TableCell>
                                <TableCell>{row.adjustmentStatus}</TableCell>
                                <TableCell>{row.partCode}</TableCell>
                                <TableCell>{row.quantity}</TableCell>
                                <TableCell>{row.uom}</TableCell>
                                <TableCell>{row.fromLocation}</TableCell>
                                <TableCell>{row.toLocation}</TableCell>
                                <TableCell>{row.docNumber}</TableCell>
                                <TableCell>{row.lotNumber}</TableCell>
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
                payload={{
                    table: "inadjinf",
                    columns: [
                        "trans_date",
                        "user_id",
                        "adj_type",
                        "adj_status",
                        "part_code",
                        "lotqty",
                        "uom",
                        "location",
                        "to_location",
                        "recnum",
                        "lot",
                    ],
                    sort: "trans_date DESC",
                    limit: 20,
                }}
                title="Inventory Moves Log"
                updateInterval={5000} // Refresh every 5 seconds
                render={renderFunction}
            />
        </div>
    );
}