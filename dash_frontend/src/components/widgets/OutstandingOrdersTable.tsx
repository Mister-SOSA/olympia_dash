import React, { useMemo, useCallback, useRef, useState } from "react";
import Widget from "./Widget";
import config from "@/config";
import { POItemData } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { playNotificationSound } from "@/utils/soundUtils";
import { Package, Calendar, DollarSign, Hash, FileText, TrendingUp, AlertCircle } from "lucide-react";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";

const WIDGET_ID = 'OutstandingOrdersTable';


/* -------------------------------------- */
/* Constants & Helper Functions           */
/* -------------------------------------- */
const STATUS_CODES: { [key: string]: string } = {
    '20': 'X', // Cancelled
    '10': 'E', // Entered
    '12': 'R', // Released
    '14': 'V', // Received from Vendor
    '16': 'C', // Closed
    '18': 'I', // Vendor Invoice Received
};

const renderStatusBadge = (statusCode: string) => {
    const status = STATUS_CODES[statusCode];
    const badgeClass =
        status === "X"
            ? "badge-danger"
            : status === "V"
                ? "badge-success"
                : "badge-primary";

    return <span className={`badge ${badgeClass}`}>{status}</span>;
};

const adjustDateByOneDay = (dateStr?: string): Date | null =>
    dateStr ? new Date(new Date(dateStr).setDate(new Date(dateStr).getDate() + 1)) : null;

/* -------------------------------------- */
/* OutstandingOrdersTable Component       */
/* -------------------------------------- */
export default function OutstandingOrdersTable() {
    // Track previous order statuses to detect changes
    const previousStatusesRef = useRef<Map<string, string>>(new Map());
    const [newStatusVRows, setNewStatusVRows] = useState<Set<string>>(new Set());

    // Widget-specific settings
    const { settings } = useWidgetSettings(WIDGET_ID);
    const playSoundOnReceived = settings.playSoundOnReceived as boolean;
    const sortBy = settings.sortBy as 'vendor' | 'date' | 'overdue' | 'poNumber';

    // Prepare the widget payload to query the backed view securely.
    const widgetPayload = useMemo(
        () => ({
            module: "OutstandingOrdersTable",
            queryId: "OutstandingOrdersTable"
        }),
        []
    );

    // Transform raw data into table row data.
    const renderFunction = useCallback((data: POItemData[]) => {
        const visibleData = data.filter(
            (item) => !config.HIDDEN_OUTSTANDING_VENDOR_CODES.includes(item.vend_code ?? "")
        );

        const tableData = visibleData.map((item) => {
            const adjustedOrderDate = adjustDateByOneDay(item.recent_date_orderd ?? undefined);
            const adjustedVendPromDate = adjustDateByOneDay(item.vend_prom_date ?? undefined);

            // Calculate overdue days based on the adjusted vendor promise date.
            const overdueDays = adjustedVendPromDate
                ? Math.floor((new Date().getTime() - adjustedVendPromDate.getTime()) / (1000 * 60 * 60 * 24) + 1)
                : 0;

            return {
                poNumber: item.po_number,
                poStatus: item.po_status,
                vendName: item.vend_name,
                partCode: item.part_code,
                qtyOrdered:
                    item.qty_ord !== undefined && item.uom
                        ? `${new Intl.NumberFormat("en-US").format(item.qty_ord)} ${item.uom}`
                        : "N/A",
                dateOrdered: adjustedOrderDate ? format(adjustedOrderDate, "MMM d, yyyy") : "N/A",
                vendorPromiseDate: adjustedVendPromDate ? format(adjustedVendPromDate, "MMM d, yyyy") : "N/A",
                lastOrderDate: item.last_order_date
                    ? format(adjustDateByOneDay(item.last_order_date) as Date, "MMM d, yyyy")
                    : "N/A",
                recentUnitPrice: item.recent_unit_price
                    ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })
                        .format(item.recent_unit_price)
                    : "N/A",
                lastOrderUnitPrice: item.last_order_unit_price
                    ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })
                        .format(item.last_order_unit_price)
                    : "N/A",
                overdueDays,
                isGrouped: false, // Outstanding orders don't use grouping, default to false.
                itemNo: `${item.po_number}-${item.item_no}`, // Unique identifier
            };
        });

        // Check for status changes to "V" (status code "14")
        const newStatusVSet = new Set<string>();
        tableData.forEach((row) => {
            const itemKey = row.itemNo;
            const currentStatus = row.poStatus;
            const previousStatus = previousStatusesRef.current.get(itemKey);

            // If status changed to "14" (V) and wasn't "14" before
            if (currentStatus === "14" && previousStatus && previousStatus !== "14") {
                newStatusVSet.add(itemKey);
            }

            // Update the status tracking
            previousStatusesRef.current.set(itemKey, currentStatus);
        });

        // Update the state with new status V rows and play sound once (if enabled)
        if (newStatusVSet.size > 0) {
            if (playSoundOnReceived) {
                playNotificationSound(); // Play once for all status changes
            }
            setNewStatusVRows(newStatusVSet);

            // Clear the highlight after animation completes (9 pulses * 0.8s = 7.2 seconds)
            setTimeout(() => {
                setNewStatusVRows(new Set());
            }, 7200);
        }

        // Sort tableData based on user setting
        tableData.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    // Sort by date ordered (most recent first)
                    return b.dateOrdered.localeCompare(a.dateOrdered);
                case 'overdue':
                    // Sort by overdue days (most overdue first)
                    return b.overdueDays - a.overdueDays;
                case 'poNumber':
                    // Sort by PO number
                    return a.poNumber.localeCompare(b.poNumber);
                case 'vendor':
                default:
                    // Sort by vendor name (default), then by PO number, then by part code
                    const vendorComparison = a.vendName.localeCompare(b.vendName);
                    if (vendorComparison !== 0) return vendorComparison;
                    const poComparison = a.poNumber.localeCompare(b.poNumber);
                    if (poComparison !== 0) return poComparison;
                    return a.partCode.localeCompare(b.partCode);
            }
        });

        // Render the table within a scrollable container.
        return (
            <ScrollArea className="h-full w-full border-2 border-border rounded-md">
                <Table className="text-left outstanding-orders-table" style={{ color: 'var(--table-text-primary)' }}>
                    <TableHeader className="sticky top-0 z-10" style={{ backgroundColor: 'var(--table-header-bg)' }}>
                        <TableRow className="border-border/50 hover:bg-transparent">
                            <TableHead className="font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center gap-1">
                                    <FileText className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    PO Number
                                </div>
                            </TableHead>
                            <TableHead className="font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center gap-1">
                                    <Hash className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    Status
                                </div>
                            </TableHead>
                            <TableHead className="font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center gap-1">
                                    <Package className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    Vendor
                                </div>
                            </TableHead>
                            <TableHead className="font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center gap-1">
                                    <Package className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    Part Code
                                </div>
                            </TableHead>
                            <TableHead className="text-right font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center justify-end gap-1">
                                    <Hash className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    Qty Ordered
                                </div>
                            </TableHead>
                            <TableHead className="text-right font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center justify-end gap-1">
                                    <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    Date Ordered
                                </div>
                            </TableHead>
                            <TableHead className="text-right font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center justify-end gap-1">
                                    <AlertCircle className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    Vendor Promise Date
                                </div>
                            </TableHead>
                            <TableHead className="text-right font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center justify-end gap-1">
                                    <TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    Prev. Order
                                </div>
                            </TableHead>
                            <TableHead className="text-right font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center justify-end gap-1">
                                    <DollarSign className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    Unit Price
                                </div>
                            </TableHead>
                            <TableHead className="text-right font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center justify-end gap-1">
                                    <DollarSign className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    Prev. Price
                                </div>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row, index) => (
                            <TableRow
                                key={row.itemNo}
                                className={`
                  border-border/30 transition-all duration-300 hover:bg-muted/50
                  ${STATUS_CODES[row.poStatus] === "X" ? "cancelled-po" : ""} 
                  ${row.isGrouped ? "grouped-po" : ""} 
                  ${STATUS_CODES[row.poStatus] === "V" ? "received-po" : ""}
                  ${newStatusVRows.has(row.itemNo) ? "new-status-v-row" : ""}
                `}
                            >
                                <TableCell className="font-mono font-bold text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-primary)' }}>{row.poNumber}</TableCell>
                                <TableCell className="font-bold py-1.5">{renderStatusBadge(row.poStatus)}</TableCell>
                                <TableCell className="font-semibold text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-primary)' }}>{row.vendName}</TableCell>
                                <TableCell className="font-mono font-bold text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-primary)' }}>{row.partCode}</TableCell>
                                <TableCell className="text-right font-bold text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-primary)' }}>{row.qtyOrdered}</TableCell>
                                <TableCell className="text-right font-medium text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-secondary)' }}>{row.dateOrdered}</TableCell>
                                <TableCell className="text-right py-1.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <span className="font-medium text-[15px] leading-tight" style={{ color: 'var(--table-text-secondary)' }}>{row.vendorPromiseDate}</span>
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-bold border" style={{
                                            backgroundColor: 'var(--badge-warning-bg)',
                                            color: 'var(--badge-warning-text)',
                                            borderColor: 'var(--badge-warning-border)'
                                        }}>
                                            {row.overdueDays}d
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-medium text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-secondary)' }}>{row.lastOrderDate}</TableCell>
                                <TableCell className="text-right row-secondary py-1.5">
                                    <div className="table-dollars">
                                        <span className="dollar-sign text-xs" style={{ color: 'var(--table-text-secondary)' }}>$</span>
                                        <span className="dollar-value font-bold text-[15px] leading-tight" style={{ color: 'var(--table-text-primary)' }}>{row.recentUnitPrice}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right row-secondary py-1.5">
                                    <div className="table-dollars">
                                        <span className="dollar-sign text-xs" style={{ color: 'var(--table-text-secondary)' }}>$</span>
                                        <span className="dollar-value font-bold text-[15px] leading-tight" style={{ color: 'var(--table-text-primary)' }}>{row.lastOrderUnitPrice}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        );
    }, [newStatusVRows, playSoundOnReceived, sortBy]);

    return (
        <Widget
            endpoint="/api/widgets"
            payload={widgetPayload}
            title="Outstanding Due In"
            refreshInterval={30000}
        >
            {(data, loading) => {
                if (!data || data.length === 0) {
                    return <div className="widget-empty">No orders found</div>;
                }

                return renderFunction(data);
            }}
        </Widget>
    );
}