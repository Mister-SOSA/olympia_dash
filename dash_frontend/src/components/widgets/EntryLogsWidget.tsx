import React, { useRef, memo } from "react";
import Widget from "./Widget";
import { Loader } from "@/components/ui/loader";
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
/* Pre-computed Style Objects (cached)    */
/* -------------------------------------- */

// Cache style objects to avoid recreating them on every render
const RESULT_STYLES: Record<string, React.CSSProperties> = {
    ACCESS: {
        backgroundColor: 'var(--badge-success-bg)',
        color: 'var(--badge-success-text)',
        borderColor: 'var(--badge-success-border)'
    },
    BLOCKED: {
        backgroundColor: 'var(--badge-error-bg)',
        color: 'var(--badge-error-text)',
        borderColor: 'var(--badge-error-border)'
    },
    SUCCESS: {
        backgroundColor: 'var(--badge-primary-bg)',
        color: 'var(--badge-primary-text)',
        borderColor: 'var(--badge-primary-border)'
    },
    INCOMPLETE: {
        backgroundColor: 'var(--badge-warning-bg)',
        color: 'var(--badge-warning-text)',
        borderColor: 'var(--badge-warning-border)'
    },
    DEFAULT: {
        backgroundColor: 'var(--ui-bg-tertiary)',
        color: 'var(--text-muted)',
        borderColor: 'var(--ui-border-primary)'
    }
};

const METHOD_STYLES: Record<string, React.CSSProperties> = {
    Face: {
        backgroundColor: 'var(--ui-accent-secondary-bg)',
        color: 'var(--ui-accent-secondary-text)',
        borderColor: 'var(--ui-accent-secondary-border)'
    },
    NFC: {
        backgroundColor: 'var(--ui-accent-primary-bg)',
        color: 'var(--ui-accent-primary-text)',
        borderColor: 'var(--ui-accent-primary-border)'
    },
    'Apple Wallet': {
        backgroundColor: 'var(--ui-accent-primary-bg)',
        color: 'var(--ui-accent-primary-text)',
        borderColor: 'var(--ui-accent-primary-border)'
    },
    'Google Wallet': {
        backgroundColor: 'var(--ui-accent-primary-bg)',
        color: 'var(--ui-accent-primary-text)',
        borderColor: 'var(--ui-accent-primary-border)'
    },
    Remote: {
        backgroundColor: 'var(--badge-primary-bg)',
        color: 'var(--badge-primary-text)',
        borderColor: 'var(--badge-primary-border)'
    },
    PIN: {
        backgroundColor: 'var(--badge-warning-bg)',
        color: 'var(--badge-warning-text)',
        borderColor: 'var(--badge-warning-border)'
    },
    Fingerprint: {
        backgroundColor: 'var(--badge-warning-bg)',
        color: 'var(--badge-warning-text)',
        borderColor: 'var(--badge-warning-border)'
    },
    DEFAULT: {
        backgroundColor: 'var(--ui-bg-tertiary)',
        color: 'var(--text-muted)',
        borderColor: 'var(--ui-border-primary)'
    }
};

const DOOR_STYLES: Record<string, React.CSSProperties> = {
    entry: {
        backgroundColor: 'var(--badge-warning-bg)',
        color: 'var(--badge-warning-text)',
        borderColor: 'var(--badge-warning-border)'
    },
    office: {
        backgroundColor: 'var(--ui-accent-secondary-bg)',
        color: 'var(--ui-accent-secondary-text)',
        borderColor: 'var(--ui-accent-secondary-border)'
    },
    warehouse: {
        backgroundColor: 'var(--badge-warning-bg)',
        color: 'var(--badge-warning-text)',
        borderColor: 'var(--badge-warning-border)'
    },
    DEFAULT: {
        backgroundColor: 'var(--ui-bg-tertiary)',
        color: 'var(--text-secondary)',
        borderColor: 'var(--ui-border-primary)'
    }
};

// Shared static styles
const TABLE_TEXT_PRIMARY_STYLE: React.CSSProperties = { color: 'var(--table-text-primary)' };
const TABLE_TEXT_SECONDARY_STYLE: React.CSSProperties = { color: 'var(--table-text-secondary)' };

/* -------------------------------------- */
/* Helper Functions                        */
/* -------------------------------------- */

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

// Get cached style for result badge
const getResultStyles = (result: AccessResult): React.CSSProperties => {
    return RESULT_STYLES[result] || RESULT_STYLES.DEFAULT;
};

// Get cached style for method badge
const getMethodStyles = (method: AccessMethod): React.CSSProperties => {
    return METHOD_STYLES[method] || METHOD_STYLES.DEFAULT;
};

// Get cached style for door badge - using a cache map
const doorStyleCache = new Map<string, React.CSSProperties>();
const getDoorStyles = (doorName: string): React.CSSProperties => {
    const cached = doorStyleCache.get(doorName);
    if (cached) return cached;

    const nameLower = doorName.toLowerCase();
    let style: React.CSSProperties;

    if (nameLower.includes('door') || nameLower.includes('front') || nameLower.includes('entry')) {
        style = DOOR_STYLES.entry;
    } else if (nameLower.includes('office')) {
        style = DOOR_STYLES.office;
    } else if (nameLower.includes('warehouse') || nameLower.includes('dock')) {
        style = DOOR_STYLES.warehouse;
    } else {
        style = DOOR_STYLES.DEFAULT;
    }

    doorStyleCache.set(doorName, style);
    return style;
};

/* -------------------------------------- */
/* Memoized Icon Components               */
/* -------------------------------------- */

const iconProps = { className: "h-3.5 w-3.5" };
const smallIconProps = { className: "h-3 w-3" };

// Pre-create icon elements to avoid recreating on each render
const AccessMethodIcons: Record<string, React.ReactNode> = {
    NFC: <CreditCard {...iconProps} />,
    Face: <ScanFace {...iconProps} />,
    PIN: <KeyRound {...iconProps} />,
    Remote: <Wifi {...iconProps} />,
    'Apple Wallet': <Smartphone {...iconProps} />,
    'Google Wallet': <Smartphone {...iconProps} />,
    Fingerprint: <Fingerprint {...iconProps} />,
    'QR Code': <QrCode {...iconProps} />,
    DEFAULT: <HelpCircle {...iconProps} />
};

const getAccessMethodIcon = (method: AccessMethod): React.ReactNode => {
    return AccessMethodIcons[method] || AccessMethodIcons.DEFAULT;
};

// Memoized result icon component
const ResultIcon = memo(({ result, message }: { result: AccessResult; message: string }) => {
    const msgLower = message.toLowerCase();
    // Check for call-related events
    if (msgLower.includes('call')) {
        if (msgLower.includes('missed')) {
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
});
ResultIcon.displayName = 'ResultIcon';

/* -------------------------------------- */
/* Memoized Row Components                */
/* -------------------------------------- */

interface EntryWithNew extends AccessLogEntry {
    isNew: boolean;
}

interface CardRowProps {
    entry: EntryWithNew;
    useRelativeTime: boolean;
    relativeTimeThreshold: number;
    highlightNewEntries: boolean;
    showAccessMethod: boolean;
}

// Memoized card row for mobile view
const CardRow = memo(({ entry, useRelativeTime, relativeTimeThreshold, highlightNewEntries, showAccessMethod }: CardRowProps) => {
    const timeData = formatTimeAgo(entry.timestamp, useRelativeTime, relativeTimeThreshold);
    const resultStyles = getResultStyles(entry.result);
    const doorStyles = getDoorStyles(entry.door_name);
    const methodStyles = getMethodStyles(entry.access_method);

    return (
        <div
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
                    style={resultStyles}
                >
                    <ResultIcon result={entry.result} message={entry.message} />
                    {entry.result}
                </span>
            </div>

            {/* Main Row: User & Door */}
            <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm truncate" style={TABLE_TEXT_PRIMARY_STYLE}>
                    <User className="inline h-3.5 w-3.5 mr-1 opacity-60" />
                    {entry.actor_name}
                </div>
                <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border shrink-0"
                    style={doorStyles}
                >
                    <DoorOpen {...smallIconProps} />
                    {entry.door_name}
                </span>
            </div>

            {/* Bottom Row: Method & Message */}
            {showAccessMethod && (
                <div className="flex items-center justify-between gap-2 text-xs">
                    <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border"
                        style={methodStyles}
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
}, (prevProps, nextProps) => {
    // Custom comparison for better memoization
    return (
        prevProps.entry.id === nextProps.entry.id &&
        prevProps.entry.isNew === nextProps.entry.isNew &&
        prevProps.useRelativeTime === nextProps.useRelativeTime &&
        prevProps.relativeTimeThreshold === nextProps.relativeTimeThreshold &&
        prevProps.highlightNewEntries === nextProps.highlightNewEntries &&
        prevProps.showAccessMethod === nextProps.showAccessMethod
    );
});
CardRow.displayName = 'CardRow';

interface TableRowProps {
    entry: EntryWithNew;
    useRelativeTime: boolean;
    relativeTimeThreshold: number;
    highlightNewEntries: boolean;
    showAccessMethod: boolean;
}

// Memoized table row for desktop view
const EntryTableRow = memo(({ entry, useRelativeTime, relativeTimeThreshold, highlightNewEntries, showAccessMethod }: TableRowProps) => {
    const timeData = formatTimeAgo(entry.timestamp, useRelativeTime, relativeTimeThreshold);
    const resultStyles = getResultStyles(entry.result);
    const doorStyles = getDoorStyles(entry.door_name);
    const methodStyles = getMethodStyles(entry.access_method);

    return (
        <TableRow
            className={`
                border-border/30 transition-all duration-300
                hover:bg-muted/50
                ${highlightNewEntries && entry.isNew ? "inventory-new-row inventory-new-row-glow" : ""}
            `}
        >
            {/* Time */}
            <TableCell className="text-sm" style={TABLE_TEXT_SECONDARY_STYLE}>
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
                <span style={TABLE_TEXT_PRIMARY_STYLE}>
                    {entry.actor_name}
                </span>
            </TableCell>

            {/* Door */}
            <TableCell>
                <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border"
                    style={doorStyles}
                >
                    <DoorOpen {...smallIconProps} />
                    {entry.door_name}
                </span>
            </TableCell>

            {/* Method */}
            {showAccessMethod && (
                <TableCell className="hidden @3xl:table-cell">
                    <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border"
                        style={methodStyles}
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
                    style={resultStyles}
                >
                    <ResultIcon result={entry.result} message={entry.message} />
                    {entry.result}
                </span>
            </TableCell>

            {/* Details/Message */}
            <TableCell className="hidden @4xl:table-cell text-sm" style={TABLE_TEXT_SECONDARY_STYLE}>
                {entry.message}
            </TableCell>
        </TableRow>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for better memoization
    return (
        prevProps.entry.id === nextProps.entry.id &&
        prevProps.entry.isNew === nextProps.entry.isNew &&
        prevProps.useRelativeTime === nextProps.useRelativeTime &&
        prevProps.relativeTimeThreshold === nextProps.relativeTimeThreshold &&
        prevProps.highlightNewEntries === nextProps.highlightNewEntries &&
        prevProps.showAccessMethod === nextProps.showAccessMethod
    );
});
EntryTableRow.displayName = 'EntryTableRow';

/* -------------------------------------- */
/* Table Header (memoized)                */
/* -------------------------------------- */

const TableHeaderComponent = memo(({ showAccessMethod }: { showAccessMethod: boolean }) => (
    <TableHeader className="sticky top-0 z-10" style={{ backgroundColor: 'var(--table-header-bg)' }}>
        <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="font-semibold" style={TABLE_TEXT_PRIMARY_STYLE}>
                <div className="flex items-center gap-1.5">
                    <Clock {...iconProps} style={TABLE_TEXT_SECONDARY_STYLE} />
                    Time
                </div>
            </TableHead>
            <TableHead className="font-semibold" style={TABLE_TEXT_PRIMARY_STYLE}>
                <div className="flex items-center gap-1.5">
                    <User {...iconProps} style={TABLE_TEXT_SECONDARY_STYLE} />
                    Person
                </div>
            </TableHead>
            <TableHead className="font-semibold" style={TABLE_TEXT_PRIMARY_STYLE}>
                <div className="flex items-center gap-1.5">
                    <DoorOpen {...iconProps} style={TABLE_TEXT_SECONDARY_STYLE} />
                    Door
                </div>
            </TableHead>
            {showAccessMethod && (
                <TableHead className="font-semibold hidden @3xl:table-cell" style={TABLE_TEXT_PRIMARY_STYLE}>
                    <div className="flex items-center gap-1.5">
                        <Fingerprint {...iconProps} style={TABLE_TEXT_SECONDARY_STYLE} />
                        Method
                    </div>
                </TableHead>
            )}
            <TableHead className="font-semibold" style={TABLE_TEXT_PRIMARY_STYLE}>
                <div className="flex items-center gap-1.5">
                    <ShieldCheck {...iconProps} style={TABLE_TEXT_SECONDARY_STYLE} />
                    Result
                </div>
            </TableHead>
            <TableHead className="font-semibold hidden @4xl:table-cell" style={TABLE_TEXT_PRIMARY_STYLE}>
                Details
            </TableHead>
        </TableRow>
    </TableHeader>
));
TableHeaderComponent.displayName = 'TableHeaderComponent';

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

    return (
        <Widget
            endpoint="/api/access-logs"
            payload={undefined}
            title="Entry Logs"
            refreshInterval={5000}
        >
            {(data: AccessLogEntry[] | null, loading: boolean) => {
                if (loading && (!data || data.length === 0)) {
                    return (
                        <div className="flex items-center justify-center h-full animate-in fade-in duration-200">
                            <div className="text-center space-y-3">
                                <Loader />
                                <p className="text-sm text-ui-text-secondary animate-in fade-in slide-in-from-bottom-1 duration-300 delay-100">
                                    Loading entry logs...
                                </p>
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

                // Apply filters
                let filteredData = data;

                // Filter out intercom/call events unless explicitly enabled
                if (!showIntercomEvents) {
                    filteredData = filteredData.filter(entry => {
                        const msg = entry.message.toLowerCase();
                        const logKey = entry.log_key?.toLowerCase() || '';
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

                // Mark new entries - use a local variable to avoid ref mutation during render
                const currentIds = new Set(filteredData.map(e => e.id));
                const entriesWithNew: EntryWithNew[] = filteredData.map(entry => ({
                    ...entry,
                    isNew: !previousIdsRef.current.has(entry.id)
                }));

                // Schedule ref update after render
                Promise.resolve().then(() => {
                    previousIdsRef.current = currentIds;
                });

                return (
                    <ScrollArea className="h-full w-full border-2 border-border rounded-md @container">
                        <TooltipProvider delayDuration={200}>
                            {/* Compact Card View for Small Sizes */}
                            <div className="@xl:hidden p-2 space-y-2">
                                {entriesWithNew.map((entry) => (
                                    <CardRow
                                        key={entry.id}
                                        entry={entry}
                                        useRelativeTime={useRelativeTime}
                                        relativeTimeThreshold={relativeTimeThreshold}
                                        highlightNewEntries={highlightNewEntries}
                                        showAccessMethod={showAccessMethod}
                                    />
                                ))}
                            </div>

                            {/* Table View for Medium+ Sizes */}
                            <div className="hidden @xl:block p-1">
                                <Table className="text-left" style={TABLE_TEXT_PRIMARY_STYLE}>
                                    <TableHeaderComponent showAccessMethod={showAccessMethod} />
                                    <TableBody>
                                        {entriesWithNew.map((entry) => (
                                            <EntryTableRow
                                                key={entry.id}
                                                entry={entry}
                                                useRelativeTime={useRelativeTime}
                                                relativeTimeThreshold={relativeTimeThreshold}
                                                highlightNewEntries={highlightNewEntries}
                                                showAccessMethod={showAccessMethod}
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TooltipProvider>
                    </ScrollArea>
                );
            }}
        </Widget>
    );
}
