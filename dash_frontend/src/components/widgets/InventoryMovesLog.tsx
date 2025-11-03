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

// Get color for transfer type badge
const getTransferTypeColor = (type: string): string => {
    if (!type) return 'bg-gray-500/20 text-gray-400 border-gray-500/50';

    const typeUpper = type.toUpperCase();
    const typeMap: Record<string, string> = {
        // Shipments - Blue tones
        'SHIPMNT': 'bg-blue-500/20 text-blue-300 border-blue-500/50',
        'SHPMNT': 'bg-blue-500/20 text-blue-300 border-blue-500/50',
        'SHIP': 'bg-blue-500/20 text-blue-300 border-blue-500/50',

        // Putaways - Green tones
        'PUTAWY': 'bg-green-500/20 text-green-300 border-green-500/50',
        'PUTAWAY': 'bg-green-500/20 text-green-300 border-green-500/50',
        'PUT': 'bg-green-500/20 text-green-300 border-green-500/50',

        // Location Changes - Purple tones
        'LOCCHG': 'bg-purple-500/20 text-purple-300 border-purple-500/50',
        'LOCCNG': 'bg-purple-500/20 text-purple-300 border-purple-500/50',
        'LOC': 'bg-purple-500/20 text-purple-300 border-purple-500/50',

        // Adjustments - Yellow/Orange tones
        'ADJ': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
        'ADJUST': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',

        // Transfers - Cyan tones
        'XFER': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
        'TRANSFER': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',

        // Receipts - Emerald tones
        'RECEIPT': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
        'RCV': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
        'RECEIVE': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',

        // Issues/Out - Red tones
        'ISSUE': 'bg-red-500/20 text-red-300 border-red-500/50',
        'OUT': 'bg-red-500/20 text-red-300 border-red-500/50',

        // Moves - Indigo tones
        'MOVE': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50',

        // Returns - Amber tones
        'RETURN': 'bg-amber-500/20 text-amber-300 border-amber-500/50',
        'RET': 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    };

    return typeMap[typeUpper] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
};

// Get color for location badge
const getLocationColor = (location: string, isFrom: boolean = false): string => {
    if (!location || location === '—') return '';

    const locUpper = location.toUpperCase();

    // Dock locations - Red/Orange
    if (locUpper.includes('DOCK') || locUpper.includes('DOOR')) {
        return isFrom
            ? 'bg-red-500/15 text-red-300 border-red-500/40'
            : 'bg-red-500/15 text-red-300 border-red-500/40';
    }

    // Bay locations - Cyan
    if (locUpper.includes('BAY') || locUpper.startsWith('BA')) {
        return isFrom
            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
            : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40';
    }

    // Stock/Warehouse - Blue
    if (locUpper.includes('STOCK') || locUpper.includes('WARE') || locUpper.includes('WH')) {
        return isFrom
            ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
            : 'bg-blue-500/15 text-blue-300 border-blue-500/40';
    }

    // Production/Work areas - Purple
    if (locUpper.includes('PROD') || locUpper.includes('WORK') || locUpper.includes('MFG')) {
        return isFrom
            ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
            : 'bg-purple-500/15 text-purple-300 border-purple-500/40';
    }

    // Staging - Yellow
    if (locUpper.includes('STAGE') || locUpper.includes('STG')) {
        return isFrom
            ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40'
            : 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40';
    }

    // Default colors
    return isFrom
        ? 'bg-orange-500/15 text-orange-300 border-orange-500/40'
        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
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
            <ScrollArea className="h-full w-full border-2 border-border rounded-md">
                <TooltipProvider delayDuration={200}>
                    <div className="p-1">
                        <Table className="text-left text-white inventory-moves-log-table">
                            <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                                <TableRow className="border-border/50 hover:bg-transparent">
                                    <TableHead className="font-semibold">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                            Date
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                            Time
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                                            User
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        <div className="flex items-center gap-1.5">
                                            <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                            Type
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        <div className="flex items-center gap-1.5">
                                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                            Part
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right font-semibold">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                            Qty
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-orange-400">↗</span>
                                            From
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-cyan-400">↘</span>
                                            To
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        <div className="flex items-center gap-1.5">
                                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                            Doc #
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold">Lot</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tableData.map((row, index) => (
                                    <TableRow
                                        key={row.docNumber || index}
                                        className={`
                                        border-border/30 transition-all duration-300
                                        hover:bg-muted/50
                                        ${row.isNew ? "inventory-new-row inventory-new-row-glow" : ""}
                                    `}
                                    >
                                        <TableCell className="font-medium text-sm">
                                            {formatDate(row.moveDate)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
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
                                        <TableCell className="font-medium">
                                            <span className="text-blue-400 lowercase">{row.moveUser || "—"}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`
                                            inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border
                                            ${getTransferTypeColor(row.transferType)}
                                        `}>
                                                {row.transferType || "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm font-semibold">
                                            {row.partCode || "—"}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-sm">
                                            <span className={row.quantity > 0 ? "text-green-400" : "text-red-400"}>
                                                {formatQuantity(row.quantity)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {row.fromLocation && row.fromLocation !== "—" ? (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getLocationColor(row.fromLocation, true)}`}>
                                                    {row.fromLocation}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {row.toLocation && row.toLocation !== "—" ? (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getLocationColor(row.toLocation, false)}`}>
                                                    {row.toLocation}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground/80">
                                            {row.docNumber || "—"}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground/80">
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