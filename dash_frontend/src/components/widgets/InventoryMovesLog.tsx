import React, { useCallback, useRef, useMemo } from "react";
import Widget from "./Widget";
import config from "@/config";
import { InventoryMove, InventoryMoveRaw } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

/* -------------------------------------- */
/* Helper: Map Raw Data to Table Row      */
/* -------------------------------------- */
const mapInventoryMove = (
    item: InventoryMoveRaw,
    seenDocs: Set<string>
): (InventoryMove & { isNew?: boolean }) => ({
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
    // Mark as new if this docNumber hasn't been seen before.
    isNew: !seenDocs.has(item.recnum),
});

/* -------------------------------------- */
/* InventoryMovesLog Component            */
/* -------------------------------------- */
export default function InventoryMovesLog() {
    // Ref to keep track of previously seen rows by their unique docNumber.
    const previousDocsRef = useRef<Set<string>>(new Set());

    // Memoize the widget payload.
    const widgetPayload = useMemo(
        () => ({
            module: "InventoryMovesLog",
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
        }),
        []
    );

    // Render function to map raw data to table rows.
    const renderFunction = useCallback((data: InventoryMoveRaw[]) => {
        // Map raw data to table rows.
        const tableData = data.map((item) => mapInventoryMove(item, previousDocsRef.current));

        // Update the ref with current document numbers.
        previousDocsRef.current = new Set(tableData.map((row) => row.docNumber));

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
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead>UOM</TableHead>
                            <TableHead>From Location</TableHead>
                            <TableHead>To Location</TableHead>
                            <TableHead>Doc Number</TableHead>
                            <TableHead>Lot Number</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row, index) => (
                            <TableRow key={row.docNumber || index} className={row.isNew ? "flash" : ""}>
                                <TableCell>{row.moveDate}</TableCell>
                                <TableCell>{row.moveUser}</TableCell>
                                <TableCell>{row.adjustmentType}</TableCell>
                                <TableCell>{row.adjustmentStatus}</TableCell>
                                <TableCell>{row.partCode}</TableCell>
                                <TableCell className="text-right">{row.quantity}</TableCell>
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
                payload={widgetPayload}
                title="Inventory Moves Log"
                updateInterval={5000} // Refresh every 5 seconds
                render={renderFunction}
            />
        </div>
    );
}