import React, { useCallback, useRef, useMemo } from "react";
import Widget from "./Widget";
import { InventoryMove, InventoryMoveRaw } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRightLeft, Package, Calendar, Clock, User, Hash, FileText } from "lucide-react";

/* TO DO:
MIGRATE TO FOLLOWING MODULE:
Program Name:
mtlccq
Master Table:prtmstccv
Detail Table:matlxfer
 */

/* -------------------------------------- */
/* Helper Functions                        */
/* -------------------------------------- */

// Format date to be more readable (e.g., "Nov 3, 2025")
const formatDate = (dateStr: string): string => {
    if (!dateStr) return "—";
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
};

// Format time to 12-hour format with AM/PM
const formatTime = (timeStr: string): string => {
    if (!timeStr) return "—";
    try {
        // Handle different time formats: "HHMM", "HH:MM:SS", "HH:MM", or numeric
        let hours: number;
        let minutes: string;

        const timeString = timeStr.toString().trim();

        // If time contains colon, split it
        if (timeString.includes(':')) {
            const parts = timeString.split(':');
            hours = parseInt(parts[0]);
            minutes = parts[1].padStart(2, '0');
        } else {
            // Numeric format like 1402 or 142
            const timeValue = timeString.padStart(4, '0');
            hours = parseInt(timeValue.substring(0, 2));
            minutes = timeValue.substring(2, 4);
        }

        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes} ${ampm}`;
    } catch {
        return timeStr;
    }
};

// Format time with "ago" notation for recent times (within 1 hour), otherwise show clock time
// Returns { display: string, tooltip: string | null, isRelative: boolean }
const formatTimeAgo = (dateStr: string, timeStr: string): { display: string; tooltip: string | null; isRelative: boolean } => {
    if (!timeStr) return { display: "—", tooltip: null, isRelative: false };

    try {
        // Debug: Log first entry to see format
        if (typeof window !== 'undefined' && !(window as any).__timeFormatLogged) {
            console.log('📅 Date format from DB:', dateStr, 'Time format:', timeStr);
            (window as any).__timeFormatLogged = true;
        }

        // Parse time from 24-hour format like "13:26:01"
        const timeString = timeStr.toString().trim();
        const timeParts = timeString.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        const seconds = timeParts[2] ? parseInt(timeParts[2]) : 0;

        // Parse the date - it comes as "Mon, 03 Nov 2025 00:00:00 GMT"
        // Use UTC methods to avoid timezone conversion issues
        const baseDate = new Date(dateStr);

        // Create a new date with the actual time from the time field
        // Use UTC date components to get the correct date, then apply local time
        const itemDate = new Date(
            baseDate.getUTCFullYear(),
            baseDate.getUTCMonth(),
            baseDate.getUTCDate(),
            hours,
            minutes,
            seconds
        );

        // Calculate difference from now
        const now = new Date();
        const diffMs = now.getTime() - itemDate.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);

        // Debug first entry
        if (typeof window !== 'undefined' && !(window as any).__timeCalcLogged) {
            console.log('⏰ Item date:', itemDate.toString());
            console.log('⏰ Now:', now.toString());
            console.log('⏰ Diff (sec):', diffSeconds, 'Diff (min):', diffMinutes, 'Diff (hours):', diffHours);
            console.log('⏰ Is today?', now.toDateString() === itemDate.toDateString());
            (window as any).__timeCalcLogged = true;
        }

        // Format the exact time for tooltip
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        const exactTime = `${displayHours}:${displayMinutes} ${ampm}`;

        // Check if it's today
        const isToday = now.toDateString() === itemDate.toDateString();

        // If within the last hour AND it's today AND in the past, show "ago" notation
        if (isToday && diffSeconds >= 0 && diffSeconds < 3600) {
            let relativeTime: string;
            if (diffSeconds < 60) {
                if (diffSeconds <= 5) {
                    relativeTime = "just now";
                } else {
                    relativeTime = `${diffSeconds} sec ago`;
                }
            } else {
                const displayMinutesAgo = Math.floor(diffSeconds / 60);
                relativeTime = displayMinutesAgo === 1 ? "1 min ago" : `${displayMinutesAgo} min ago`;
            }
            return { display: relativeTime, tooltip: exactTime, isRelative: true };
        }

        // Otherwise, show formatted time in 12-hour format (no tooltip needed)
        return { display: exactTime, tooltip: null, isRelative: false };

    } catch (error) {
        console.error('❌ Time parsing error:', error, 'Date:', dateStr, 'Time:', timeStr);
        return { display: formatTime(timeStr), tooltip: null, isRelative: false };
    }
};

// Format quantity with thousands separator
const formatQuantity = (qty: number): string => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(qty);
};

// Get color for transfer type badge - returns inline styles object
const getTransferTypeColor = (type: string): React.CSSProperties => {
    if (!type) return {
        backgroundColor: 'var(--ui-bg-tertiary)',
        color: 'var(--text-muted)',
        borderColor: 'var(--ui-border-primary)',
        opacity: 0.7
    };

    const typeUpper = type.toUpperCase();

    // Shipments - Blue tones (chart-2)
    if (['SHIPMNT', 'SHPMNT', 'SHIP'].includes(typeUpper)) {
        return { backgroundColor: 'var(--badge-primary-bg)', color: 'var(--badge-primary-text)', borderColor: 'var(--badge-primary-border)' };
    }
    // Putaways - Green tones (chart-1)
    if (['PUTAWY', 'PUTAWAY', 'PUT'].includes(typeUpper)) {
        return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' };
    }
    // Location Changes - Purple tones (chart-5)
    if (['LOCCHG', 'LOCCNG', 'LOC'].includes(typeUpper)) {
        return { backgroundColor: 'var(--ui-accent-secondary-bg)', color: 'var(--ui-accent-secondary-text)', borderColor: 'var(--ui-accent-secondary-border)' };
    }
    // Adjustments - Yellow/Orange tones
    if (['ADJ', 'ADJUST'].includes(typeUpper)) {
        return { backgroundColor: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', borderColor: 'var(--badge-warning-border)' };
    }
    // Transfers - Cyan tones
    if (['XFER', 'TRANSFER'].includes(typeUpper)) {
        return { backgroundColor: 'var(--ui-accent-primary-bg)', color: 'var(--ui-accent-primary-text)', borderColor: 'var(--ui-accent-primary-border)' };
    }
    // Receipts - Emerald tones
    if (['RECEIPT', 'RCV', 'RECEIVE'].includes(typeUpper)) {
        return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' };
    }
    // Issues/Out - Red tones
    if (['ISSUE', 'OUT'].includes(typeUpper)) {
        return { backgroundColor: 'var(--badge-error-bg)', color: 'var(--badge-error-text)', borderColor: 'var(--badge-error-border)' };
    }
    // Moves - Indigo tones
    if (['MOVE'].includes(typeUpper)) {
        return { backgroundColor: 'var(--ui-accent-secondary-bg)', color: 'var(--ui-accent-secondary-text)', borderColor: 'var(--ui-accent-secondary-border)' };
    }
    // Returns - Amber tones
    if (['RETURN', 'RET'].includes(typeUpper)) {
        return { backgroundColor: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', borderColor: 'var(--badge-warning-border)' };
    }

    return {
        backgroundColor: 'var(--ui-bg-tertiary)',
        color: 'var(--text-muted)',
        borderColor: 'var(--ui-border-primary)',
        opacity: 0.7
    };
};

// Get color for location badge - returns inline styles object
const getLocationColor = (location: string, isFrom: boolean = false): React.CSSProperties => {
    if (!location || location === '—') return {};

    const locUpper = location.toUpperCase();

    // Dock locations - Error/Red tones
    if (locUpper.includes('DOCK') || locUpper.includes('DOOR')) {
        return {
            backgroundColor: 'var(--badge-error-bg)',
            color: 'var(--badge-error-text)',
            borderColor: 'var(--badge-error-border)'
        };
    }

    // Bay locations - Primary/Cyan tones
    if (locUpper.includes('BAY') || locUpper.startsWith('BA')) {
        return {
            backgroundColor: 'var(--ui-accent-primary-bg)',
            color: 'var(--ui-accent-primary-text)',
            borderColor: 'var(--ui-accent-primary-border)'
        };
    }

    // Stock/Warehouse - Primary/Blue tones
    if (locUpper.includes('STOCK') || locUpper.includes('WARE') || locUpper.includes('WH')) {
        return {
            backgroundColor: 'var(--badge-primary-bg)',
            color: 'var(--badge-primary-text)',
            borderColor: 'var(--badge-primary-border)'
        };
    }

    // Production/Work areas - Secondary/Purple tones
    if (locUpper.includes('PROD') || locUpper.includes('WORK') || locUpper.includes('MFG')) {
        return {
            backgroundColor: 'var(--ui-accent-secondary-bg)',
            color: 'var(--ui-accent-secondary-text)',
            borderColor: 'var(--ui-accent-secondary-border)'
        };
    }

    // Staging - Warning/Yellow tones
    if (locUpper.includes('STAGE') || locUpper.includes('STG')) {
        return {
            backgroundColor: 'var(--badge-warning-bg)',
            color: 'var(--badge-warning-text)',
            borderColor: 'var(--badge-warning-border)'
        };
    }

    // Default colors
    return isFrom ? {
        backgroundColor: 'var(--badge-warning-bg)',
        color: 'var(--badge-warning-text)',
        borderColor: 'var(--badge-warning-border)',
        opacity: 0.8
    } : {
        backgroundColor: 'var(--badge-success-bg)',
        color: 'var(--badge-success-text)',
        borderColor: 'var(--badge-success-border)',
        opacity: 0.8
    };
};

/* -------------------------------------- */
/* Helper: Map Raw Data to Table Row      */
/* -------------------------------------- */
const mapInventoryMove = (
    item: InventoryMoveRaw,
    seenDocs: Set<string>
): (InventoryMove & { isNew?: boolean }) => ({
    moveDate: item.xfer_date,
    moveTime: item.xfer_time,
    moveUser: item.xfer_user,
    transferType: item.xtype,
    partCode: item.xfer_part_code,
    quantity: item.xfer_qty,
    fromLocation: item.fmid,
    toLocation: item.toid,
    docNumber: item.xfer_doc,
    lotNumber: item.xfer_lot,
    // Mark as new if this docNumber hasn't been seen before.
    isNew: !seenDocs.has(item.xfer_doc),
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
            table: "matlxfer",
            columns: [
                "xfer_date",
                "xfer_time",
                "xfer_user",
                "xtype",
                "xfer_part_code",
                "xfer_qty",
                "fmid",
                "toid",
                "xfer_doc",
                "xfer_lot",

            ],
            sort: ["xfer_date DESC", "xfer_time DESC"],
            limit: 50,
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
            <ScrollArea className="h-full w-full border-2 border-border rounded-md @container">
                <TooltipProvider delayDuration={200}>
                    {/* Compact Card View for Small Sizes */}
                    <div className="@xl:hidden p-2 space-y-2">
                        {tableData.map((row, index) => {
                            const timeData = formatTimeAgo(row.moveDate, row.moveTime);
                            return (
                                <div
                                    key={`${row.docNumber}-${row.lotNumber}-${row.moveTime}-${index}`}
                                    className={`
                                        rounded-lg border border-border/50 p-3 space-y-2
                                        transition-all duration-300 hover:bg-muted/30
                                        ${row.isNew ? "inventory-new-row inventory-new-row-glow" : ""}
                                    `}
                                >
                                    {/* Top Row: Time & Type */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-xs text-muted-foreground">
                                            {timeData.isRelative && timeData.tooltip ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help underline decoration-dotted">
                                                            {timeData.display}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{timeData.tooltip}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : timeData.display}
                                        </div>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border" style={getTransferTypeColor(row.transferType)}>
                                            {row.transferType || "—"}
                                        </span>
                                    </div>

                                    {/* Main Info Row: Part & Quantity */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="font-mono text-sm font-semibold truncate" style={{ color: 'var(--table-text-primary)' }}>
                                            {row.partCode || "—"}
                                        </div>
                                        <div className="text-right font-semibold text-sm shrink-0">
                                            <span style={{ color: row.quantity > 0 ? 'var(--value-positive)' : 'var(--value-negative)' }}>
                                                {formatQuantity(row.quantity)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Location & User Row */}
                                    <div className="flex items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-1">
                                            {row.fromLocation && row.fromLocation !== "—" ? (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border" style={getLocationColor(row.fromLocation, true)}>
                                                    {row.fromLocation}
                                                </span>
                                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                                            {row.toLocation && row.toLocation !== "—" ? (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border" style={getLocationColor(row.toLocation, false)}>
                                                    {row.toLocation}
                                                </span>
                                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </div>
                                        <span className="lowercase shrink-0" style={{ color: 'var(--badge-primary-text)' }}>{row.moveUser || "—"}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Table View for Medium+ Sizes */}
                    <div className="hidden @xl:block p-1">
                        <Table className="text-left inventory-moves-log-table" style={{ color: 'var(--table-text-primary)' }}>
                            <TableHeader className="sticky top-0 z-10" style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                <TableRow className="border-border/50 hover:bg-transparent">
                                    {/* Date - Hidden below 7xl container */}
                                    <TableHead className="font-semibold hidden @7xl:table-cell" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Date
                                        </div>
                                    </TableHead>
                                    {/* Time - Always visible in table */}
                                    <TableHead className="font-semibold" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Time
                                        </div>
                                    </TableHead>
                                    {/* User - Always visible in table */}
                                    <TableHead className="font-semibold" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            User
                                        </div>
                                    </TableHead>
                                    {/* Type - Always visible in table */}
                                    <TableHead className="font-semibold" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1.5">
                                            <ArrowRightLeft className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Type
                                        </div>
                                    </TableHead>
                                    {/* Part - Always visible in table */}
                                    <TableHead className="font-semibold" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1.5">
                                            <Package className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Part
                                        </div>
                                    </TableHead>
                                    {/* Quantity - Always visible in table */}
                                    <TableHead className="text-right font-semibold" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Hash className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Qty
                                        </div>
                                    </TableHead>
                                    {/* From - Always visible in table */}
                                    <TableHead className="font-semibold" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1.5">
                                            <span style={{ color: 'var(--badge-warning-text)' }}>↗</span>
                                            From
                                        </div>
                                    </TableHead>
                                    {/* To - Always visible in table */}
                                    <TableHead className="font-semibold" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1.5">
                                            <span style={{ color: 'var(--badge-primary-text)' }}>↘</span>
                                            To
                                        </div>
                                    </TableHead>
                                    {/* Doc # - Hidden below 6xl container */}
                                    <TableHead className="font-semibold hidden @6xl:table-cell" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1.5">
                                            <FileText className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Doc #
                                        </div>
                                    </TableHead>
                                    {/* Lot - Hidden below 6xl container */}
                                    <TableHead className="font-semibold hidden @6xl:table-cell" style={{ color: 'var(--table-text-primary)' }}>Lot</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tableData.map((row, index) => (
                                    <TableRow
                                        key={`${row.docNumber}-${row.lotNumber}-${row.moveTime}-${index}`}
                                        className={`
                                        border-border/30 transition-all duration-300
                                        hover:bg-muted/50
                                        ${row.isNew ? "inventory-new-row inventory-new-row-glow" : ""}
                                    `}
                                    >
                                        {/* Date - Hidden below 7xl container */}
                                        <TableCell className="font-medium text-sm hidden @7xl:table-cell" style={{ color: 'var(--table-text-secondary)' }}>
                                            {formatDate(row.moveDate)}
                                        </TableCell>
                                        {/* Time - Always visible in table */}
                                        <TableCell className="text-sm" style={{ color: 'var(--table-text-secondary)' }}>
                                            {(() => {
                                                const timeData = formatTimeAgo(row.moveDate, row.moveTime);
                                                if (timeData.isRelative && timeData.tooltip) {
                                                    return (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50">
                                                                    {timeData.display}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{timeData.tooltip}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    );
                                                }
                                                return timeData.display;
                                            })()}
                                        </TableCell>
                                        {/* User - Always visible in table */}
                                        <TableCell className="font-medium">
                                            <span className="lowercase" style={{ color: 'var(--badge-primary-text)' }}>{row.moveUser || "—"}</span>
                                        </TableCell>
                                        {/* Type - Always visible in table */}
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border" style={getTransferTypeColor(row.transferType)}>
                                                {row.transferType || "—"}
                                            </span>
                                        </TableCell>
                                        {/* Part - Always visible in table */}
                                        <TableCell className="font-mono text-sm font-semibold" style={{ color: 'var(--table-text-primary)' }}>
                                            {row.partCode || "—"}
                                        </TableCell>
                                        {/* Quantity - Always visible in table */}
                                        <TableCell className="text-right font-semibold text-sm">
                                            <span style={{ color: row.quantity > 0 ? 'var(--value-positive)' : 'var(--value-negative)' }}>
                                                {formatQuantity(row.quantity)}
                                            </span>
                                        </TableCell>
                                        {/* From - Always visible in table */}
                                        <TableCell>
                                            {row.fromLocation && row.fromLocation !== "—" ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border" style={getLocationColor(row.fromLocation, true)}>
                                                    {row.fromLocation}
                                                </span>
                                            ) : (
                                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                        </TableCell>
                                        {/* To - Always visible in table */}
                                        <TableCell>
                                            {row.toLocation && row.toLocation !== "—" ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border" style={getLocationColor(row.toLocation, false)}>
                                                    {row.toLocation}
                                                </span>
                                            ) : (
                                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                        </TableCell>
                                        {/* Doc # - Hidden below 6xl container */}
                                        <TableCell className="font-mono text-xs hidden @6xl:table-cell" style={{ color: 'var(--table-text-secondary)', opacity: 0.8 }}>
                                            {row.docNumber || "—"}
                                        </TableCell>
                                        {/* Lot - Hidden below 6xl container */}
                                        <TableCell className="font-mono text-xs hidden @6xl:table-cell" style={{ color: 'var(--table-text-secondary)', opacity: 0.8 }}>
                                            {row.lotNumber || "—"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TooltipProvider>
            </ScrollArea>
        );
    }, []);

    return (
        <Widget
            endpoint="/api/widgets"
            payload={widgetPayload}
            title="📦 Inventory Moves Log"
            refreshInterval={3000} // Refresh every 3 seconds
        >
            {(data, loading) => {
                if (loading && (!data || data.length === 0)) {
                    return (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center space-y-2">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                <p className="text-sm text-muted-foreground">Loading inventory moves...</p>
                            </div>
                        </div>
                    );
                }

                if (!data || data.length === 0) {
                    return (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center space-y-2">
                                <Package className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                                <p className="text-sm text-muted-foreground">No inventory moves found</p>
                                <p className="text-xs text-muted-foreground/70">Recent transfers will appear here</p>
                            </div>
                        </div>
                    );
                }

                return renderFunction(data);
            }}
        </Widget>
    );
}