import React, { useCallback, useRef, useMemo } from "react";
import Widget from "./Widget";
import { AccessLogEntry, AccessResult, AccessMethod } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    DoorOpen,
    Clock,
    User,
    Fingerprint,
    Smartphone,
    CreditCard,
    ScanFace,
    KeyRound,
    QrCode,
    Wifi,
    ShieldCheck,
    ShieldX,
    Phone,
    PhoneMissed,
    HelpCircle
} from "lucide-react";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";

const WIDGET_ID = 'EntryLogsWidget';

/* -------------------------------------- */
/* Helper Functions                        */
/* -------------------------------------- */

// Format timestamp to be more readable
const formatTimestamp = (timestamp: string): { date: string; time: string } => {
    if (!timestamp) return { date: "—", time: "—" };
    try {
        const date = new Date(timestamp);
        return {
            date: date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }),
            time: date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })
        };
    } catch {
        return { date: timestamp, time: "—" };
    }
};

// Format time with "ago" notation for recent times
const formatTimeAgo = (
    timestamp: string,
    useRelative: boolean = true,
    thresholdMinutes: number = 60
): { display: string; tooltip: string | null; isRelative: boolean } => {
    if (!timestamp) return { display: "—", tooltip: null, isRelative: false };

    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);

        // Format exact time for tooltip
        const exactTime = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        // Check if it's today
        const isToday = now.toDateString() === date.toDateString();
        const thresholdSeconds = thresholdMinutes * 60;

        if (useRelative && isToday && diffSeconds >= 0 && diffSeconds < thresholdSeconds) {
            let relativeTime: string;
            if (diffSeconds < 60) {
                relativeTime = diffSeconds <= 5 ? "just now" : `${diffSeconds} sec ago`;
            } else {
                const mins = Math.floor(diffSeconds / 60);
                relativeTime = mins === 1 ? "1 min ago" : `${mins} min ago`;
            }
            return { display: relativeTime, tooltip: exactTime, isRelative: true };
        }

        return { display: exactTime, tooltip: null, isRelative: false };
    } catch {
        return { display: timestamp, tooltip: null, isRelative: false };
    }
};

// Get icon for access method
const getAccessMethodIcon = (method: AccessMethod): React.ReactNode => {
    const iconProps = { className: "h-3.5 w-3.5" };

    switch (method) {
        case 'NFC':
            return <CreditCard {...iconProps} />;
        case 'Face':
            return <ScanFace {...iconProps} />;
        case 'PIN':
            return <KeyRound {...iconProps} />;
        case 'Remote':
            return <Wifi {...iconProps} />;
        case 'Apple Wallet':
        case 'Google Wallet':
            return <Smartphone {...iconProps} />;
        case 'Fingerprint':
            return <Fingerprint {...iconProps} />;
        case 'QR Code':
            return <QrCode {...iconProps} />;
        default:
            return <HelpCircle {...iconProps} />;
    }
};

// Get color styles for result badge
const getResultStyles = (result: AccessResult): React.CSSProperties => {
    switch (result) {
        case 'ACCESS':
            return {
                backgroundColor: 'var(--badge-success-bg)',
                color: 'var(--badge-success-text)',
                borderColor: 'var(--badge-success-border)'
            };
        case 'BLOCKED':
            return {
                backgroundColor: 'var(--badge-error-bg)',
                color: 'var(--badge-error-text)',
                borderColor: 'var(--badge-error-border)'
            };
        case 'SUCCESS':
            return {
                backgroundColor: 'var(--badge-primary-bg)',
                color: 'var(--badge-primary-text)',
                borderColor: 'var(--badge-primary-border)'
            };
        case 'INCOMPLETE':
            return {
                backgroundColor: 'var(--badge-warning-bg)',
                color: 'var(--badge-warning-text)',
                borderColor: 'var(--badge-warning-border)'
            };
        default:
            return {
                backgroundColor: 'var(--ui-bg-tertiary)',
                color: 'var(--text-muted)',
                borderColor: 'var(--ui-border-primary)'
            };
    }
};

// Get icon for result
const getResultIcon = (result: AccessResult, message: string): React.ReactNode => {
    const iconProps = { className: "h-3.5 w-3.5" };

    // Check for call-related events
    if (message.toLowerCase().includes('call')) {
        if (message.toLowerCase().includes('missed')) {
            return <PhoneMissed {...iconProps} />;
        }
        return <Phone {...iconProps} />;
    }

    switch (result) {
        case 'ACCESS':
        case 'SUCCESS':
            return <ShieldCheck {...iconProps} />;
        case 'BLOCKED':
        case 'INCOMPLETE':
            return <ShieldX {...iconProps} />;
        default:
            return <HelpCircle {...iconProps} />;
    }
};

// Get color styles for access method badge
const getMethodStyles = (method: AccessMethod): React.CSSProperties => {
    switch (method) {
        case 'Face':
            return {
                backgroundColor: 'var(--ui-accent-secondary-bg)',
                color: 'var(--ui-accent-secondary-text)',
                borderColor: 'var(--ui-accent-secondary-border)'
            };
        case 'NFC':
        case 'Apple Wallet':
        case 'Google Wallet':
            return {
                backgroundColor: 'var(--ui-accent-primary-bg)',
                color: 'var(--ui-accent-primary-text)',
                borderColor: 'var(--ui-accent-primary-border)'
            };
        case 'Remote':
            return {
                backgroundColor: 'var(--badge-primary-bg)',
                color: 'var(--badge-primary-text)',
                borderColor: 'var(--badge-primary-border)'
            };
        case 'PIN':
        case 'Fingerprint':
            return {
                backgroundColor: 'var(--badge-warning-bg)',
                color: 'var(--badge-warning-text)',
                borderColor: 'var(--badge-warning-border)'
            };
        default:
            return {
                backgroundColor: 'var(--ui-bg-tertiary)',
                color: 'var(--text-muted)',
                borderColor: 'var(--ui-border-primary)'
            };
    }
};

// Get color styles for door badge
const getDoorStyles = (doorName: string): React.CSSProperties => {
    const nameLower = doorName.toLowerCase();

    if (nameLower.includes('main') || nameLower.includes('front') || nameLower.includes('entry')) {
        return {
            backgroundColor: 'var(--badge-primary-bg)',
            color: 'var(--badge-primary-text)',
            borderColor: 'var(--badge-primary-border)'
        };
    }
    if (nameLower.includes('office')) {
        return {
            backgroundColor: 'var(--ui-accent-secondary-bg)',
            color: 'var(--ui-accent-secondary-text)',
            borderColor: 'var(--ui-accent-secondary-border)'
        };
    }
    if (nameLower.includes('warehouse') || nameLower.includes('dock')) {
        return {
            backgroundColor: 'var(--badge-warning-bg)',
            color: 'var(--badge-warning-text)',
            borderColor: 'var(--badge-warning-border)'
        };
    }

    return {
        backgroundColor: 'var(--ui-bg-tertiary)',
        color: 'var(--text-secondary)',
        borderColor: 'var(--ui-border-primary)'
    };
};

/* -------------------------------------- */
/* EntryLogsWidget Component              */
/* -------------------------------------- */
export default function EntryLogsWidget() {
    // Track previously seen entry IDs for highlighting new entries
    const previousIdsRef = useRef<Set<string>>(new Set());

    // Widget-specific settings
    const { settings } = useWidgetSettings(WIDGET_ID);
    const useRelativeTime = settings.useRelativeTime as boolean ?? true;
    const relativeTimeThreshold = settings.relativeTimeThreshold as number ?? 60;
    const filterByResult = settings.filterByResult as string ?? 'all';
    const filterByDoor = settings.filterByDoor as string ?? 'all';
    const highlightNewEntries = settings.highlightNewEntries as boolean ?? true;
    const showAccessMethod = settings.showAccessMethod as boolean ?? true;
    const showIntercomEvents = settings.showIntercomEvents as boolean ?? false;

    // Render function for the widget data
    const renderFunction = useCallback((data: AccessLogEntry[]) => {
        // Apply filters
        let filteredData = data;

        // Filter out intercom/call events unless explicitly enabled
        if (!showIntercomEvents) {
            filteredData = filteredData.filter(entry => {
                const msg = entry.message.toLowerCase();
                const logKey = entry.log_key?.toLowerCase() || '';
                // Filter out calls, intercom, doorbell, and remote unlock events
                const isIntercomEvent =
                    msg.includes('call') ||
                    msg.includes('intercom') ||
                    msg.includes('doorbell') ||
                    logKey.includes('call') ||
                    logKey.includes('intercom') ||
                    entry.direction === 'call' ||
                    entry.access_method === 'Remote';
                return !isIntercomEvent;
            });
        }

        if (filterByResult && filterByResult !== 'all') {
            filteredData = filteredData.filter(entry => entry.result === filterByResult);
        }

        if (filterByDoor && filterByDoor !== 'all') {
            filteredData = filteredData.filter(entry =>
                entry.door_name.toLowerCase().includes(filterByDoor.toLowerCase())
            );
        }

        // Mark new entries
        const entriesWithNew = filteredData.map(entry => ({
            ...entry,
            isNew: !previousIdsRef.current.has(entry.id)
        }));

        // Update seen IDs
        previousIdsRef.current = new Set(filteredData.map(e => e.id));

        return (
            <ScrollArea className="h-full w-full border-2 border-border rounded-md @container">
                <TooltipProvider delayDuration={200}>
                    {/* Compact Card View for Small Sizes */}
                    <div className="@xl:hidden p-2 space-y-2">
                        {entriesWithNew.map((entry, index) => {
                            const timeData = formatTimeAgo(entry.timestamp, useRelativeTime, relativeTimeThreshold);
                            return (
                                <div
                                    key={`${entry.id}-${index}`}
                                    className={`
                                        rounded-lg border border-border/50 p-3 space-y-2
                                        transition-all duration-300 hover:bg-muted/30
                                        ${highlightNewEntries && entry.isNew ? "inventory-new-row inventory-new-row-glow" : ""}
                                    `}
                                >
                                    {/* Top Row: Time & Result */}
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
                                        <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border"
                                            style={getResultStyles(entry.result)}
                                        >
                                            {getResultIcon(entry.result, entry.message)}
                                            {entry.result}
                                        </span>
                                    </div>

                                    {/* Main Row: User & Door */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="font-medium text-sm truncate" style={{ color: 'var(--table-text-primary)' }}>
                                            <User className="inline h-3.5 w-3.5 mr-1 opacity-60" />
                                            {entry.actor_name}
                                        </div>
                                        <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border shrink-0"
                                            style={getDoorStyles(entry.door_name)}
                                        >
                                            <DoorOpen className="h-3 w-3" />
                                            {entry.door_name}
                                        </span>
                                    </div>

                                    {/* Bottom Row: Method & Message */}
                                    {showAccessMethod && (
                                        <div className="flex items-center justify-between gap-2 text-xs">
                                            <span
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border"
                                                style={getMethodStyles(entry.access_method)}
                                            >
                                                {getAccessMethodIcon(entry.access_method)}
                                                {entry.access_method}
                                            </span>
                                            <span className="text-muted-foreground truncate">
                                                {entry.message}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Table View for Medium+ Sizes */}
                    <div className="hidden @xl:block p-1">
                        <Table className="text-left" style={{ color: 'var(--table-text-primary)' }}>
                            <TableHeader className="sticky top-0 z-10" style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                <TableRow className="border-border/50 hover:bg-transparent">
                                    <TableHead className="font-semibold" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Time
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Person
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1.5">
                                            <DoorOpen className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Door
                                        </div>
                                    </TableHead>
                                    {showAccessMethod && (
                                        <TableHead className="font-semibold hidden @3xl:table-cell" style={{ color: 'var(--table-text-primary)' }}>
                                            <div className="flex items-center gap-1.5">
                                                <Fingerprint className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                                Method
                                            </div>
                                        </TableHead>
                                    )}
                                    <TableHead className="font-semibold" style={{ color: 'var(--table-text-primary)' }}>
                                        <div className="flex items-center gap-1.5">
                                            <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                            Result
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold hidden @4xl:table-cell" style={{ color: 'var(--table-text-primary)' }}>
                                        Details
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entriesWithNew.map((entry, index) => {
                                    const timeData = formatTimeAgo(entry.timestamp, useRelativeTime, relativeTimeThreshold);
                                    return (
                                        <TableRow
                                            key={`${entry.id}-${index}`}
                                            className={`
                                                border-border/30 transition-all duration-300
                                                hover:bg-muted/50
                                                ${highlightNewEntries && entry.isNew ? "inventory-new-row inventory-new-row-glow" : ""}
                                            `}
                                        >
                                            {/* Time */}
                                            <TableCell className="text-sm" style={{ color: 'var(--table-text-secondary)' }}>
                                                {timeData.isRelative && timeData.tooltip ? (
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
                                                ) : timeData.display}
                                            </TableCell>

                                            {/* Person */}
                                            <TableCell className="font-medium">
                                                <span style={{ color: 'var(--table-text-primary)' }}>
                                                    {entry.actor_name}
                                                </span>
                                            </TableCell>

                                            {/* Door */}
                                            <TableCell>
                                                <span
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border"
                                                    style={getDoorStyles(entry.door_name)}
                                                >
                                                    <DoorOpen className="h-3 w-3" />
                                                    {entry.door_name}
                                                </span>
                                            </TableCell>

                                            {/* Method */}
                                            {showAccessMethod && (
                                                <TableCell className="hidden @3xl:table-cell">
                                                    <span
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border"
                                                        style={getMethodStyles(entry.access_method)}
                                                    >
                                                        {getAccessMethodIcon(entry.access_method)}
                                                        {entry.access_method}
                                                    </span>
                                                </TableCell>
                                            )}

                                            {/* Result */}
                                            <TableCell>
                                                <span
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border"
                                                    style={getResultStyles(entry.result)}
                                                >
                                                    {getResultIcon(entry.result, entry.message)}
                                                    {entry.result}
                                                </span>
                                            </TableCell>

                                            {/* Details/Message */}
                                            <TableCell className="hidden @4xl:table-cell text-sm" style={{ color: 'var(--table-text-secondary)' }}>
                                                {entry.message}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </TooltipProvider>
            </ScrollArea>
        );
    }, [useRelativeTime, relativeTimeThreshold, filterByResult, filterByDoor, highlightNewEntries, showAccessMethod, showIntercomEvents]);

    return (
        <Widget
            endpoint="/api/access-logs"
            payload={undefined}
            title="Entry Logs"
            refreshInterval={5000} // Refresh every 5 seconds
        >
            {(data, loading) => {
                if (loading && (!data || data.length === 0)) {
                    return (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center space-y-2">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                <p className="text-sm text-muted-foreground">Loading entry logs...</p>
                            </div>
                        </div>
                    );
                }

                if (!data || data.length === 0) {
                    return (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center space-y-2">
                                <DoorOpen className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                                <p className="text-sm text-muted-foreground">No entry logs found</p>
                                <p className="text-xs text-muted-foreground/70">Recent access events will appear here</p>
                            </div>
                        </div>
                    );
                }

                return renderFunction(data);
            }}
        </Widget>
    );
}
