import React, { useMemo, useRef, useState, useEffect, memo, useCallback } from "react";
import Widget from "./Widget";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, AlertTriangle, Search, X, Boxes, Clock, CheckCircle, FileText, ChevronUp, ChevronDown } from "lucide-react";

const WIDGET_ID = 'InventoryTracker';

/* -------------------------------------- */
/* 📊 Types & Interfaces                  */
/* -------------------------------------- */

interface InventoryItem {
    part_code: string;
    part_desc: string;
    available: number;
    on_hand: number;
    on_hold: number;
    prod_sced: number;
}

type SortField = 'part_code' | 'part_desc' | 'available' | 'on_hand' | 'on_hold' | 'prod_sced';
type SortDirection = 'asc' | 'desc';
type PrimaryDataPoint = 'available' | 'on_hand' | 'on_hold' | 'prod_sced';

/* -------------------------------------- */
/* 🎨 Helper Functions                    */
/* -------------------------------------- */

const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
};

// Get badge styles based on stock status
const getStockStatusStyles = (value: number, threshold: number): React.CSSProperties => {
    if (value <= 0) {
        return {
            backgroundColor: 'var(--badge-error-bg)',
            color: 'var(--badge-error-text)',
            borderColor: 'var(--badge-error-border)',
        };
    }
    if (value <= threshold) {
        return {
            backgroundColor: 'var(--badge-warning-bg)',
            color: 'var(--badge-warning-text)',
            borderColor: 'var(--badge-warning-border)',
        };
    }
    return {
        backgroundColor: 'var(--badge-success-bg)',
        color: 'var(--badge-success-text)',
        borderColor: 'var(--badge-success-border)',
    };
};

// Column label mapping
const COLUMN_LABELS: Record<PrimaryDataPoint, string> = {
    available: 'Available',
    on_hand: 'On Hand',
    on_hold: 'On Hold',
    prod_sced: 'Scheduled',
};

/* -------------------------------------- */
/* 📊 Inner Content Component (Memoized)  */
/* -------------------------------------- */

interface InventoryTrackerContentProps {
    data: InventoryItem[];
    primaryDataPoint: PrimaryDataPoint;
    lowStockThreshold: number;
    showDescription: boolean;
    showSummary: boolean;
    showSearch: boolean;
}

const InventoryTrackerContent = memo(function InventoryTrackerContent({
    data,
    primaryDataPoint,
    lowStockThreshold,
    showDescription,
    showSummary,
    showSearch,
}: InventoryTrackerContentProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isCompact, setIsCompact] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('part_code');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Responsive layout detection
    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            const { width } = entries[0].contentRect;
            setIsCompact(width < 500);
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Handle sort toggle - useCallback to maintain stable reference
    const handleSort = useCallback((field: SortField) => {
        if (field === sortField) {
            // Same field - toggle direction
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            // New field - set field and reset to ascending
            setSortField(field);
            setSortDirection('asc');
        }
    }, [sortField]);

    // Process and sort data using useMemo
    const sortedData = useMemo(() => {
        // Filter data by search query
        const filteredData = searchQuery
            ? data.filter(item =>
                item.part_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.part_desc?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : data;

        // Sort data
        return [...filteredData].sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];

            // Handle string comparison
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }

            // Handle number comparison
            const aNum = Number(aVal) || 0;
            const bNum = Number(bVal) || 0;
            return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        });
    }, [data, searchQuery, sortField, sortDirection]);

    // Calculate summary stats
    const stats = useMemo(() => {
        const lowStock = data.filter(item => item[primaryDataPoint] > 0 && item[primaryDataPoint] <= lowStockThreshold).length;
        const outOfStock = data.filter(item => item[primaryDataPoint] <= 0).length;
        const inStock = data.filter(item => item[primaryDataPoint] > lowStockThreshold).length;
        return { lowStock, outOfStock, inStock, total: data.length };
    }, [data, primaryDataPoint, lowStockThreshold]);

    // Render a sortable table header cell
    const renderSortableHeader = (label: string, field: SortField, icon: React.ReactNode, align: 'left' | 'right' = 'left') => {
        const isActive = sortField === field;
        const isPrimary = field === primaryDataPoint;

        return (
            <TableHead
                key={field}
                className={`font-bold py-2 cursor-pointer select-none transition-colors hover:bg-muted/30 ${align === 'right' ? 'text-right' : ''}`}
                style={{
                    color: isActive ? 'var(--ui-accent-primary)' : 'var(--table-text-primary)',
                    backgroundColor: isPrimary ? 'var(--badge-success-bg)' : undefined,
                }}
                onClick={() => handleSort(field)}
            >
                <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
                    {icon}
                    <span>{label}</span>
                    {isActive && (
                        sortDirection === 'asc'
                            ? <ChevronUp className="h-3.5 w-3.5" />
                            : <ChevronDown className="h-3.5 w-3.5" />
                    )}
                </div>
            </TableHead>
        );
    };

    return (
        <div ref={containerRef} className="h-full flex flex-col">
            {/* Summary Stats */}
            {showSummary && !isCompact && (
                <div className="flex items-center gap-3 mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                        <Boxes className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                            {stats.total} items
                        </span>
                    </div>
                    <div className="h-3 w-px" style={{ backgroundColor: 'var(--border-light)' }} />
                    <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border" style={{
                            backgroundColor: 'var(--badge-success-bg)',
                            color: 'var(--badge-success-text)',
                            borderColor: 'var(--badge-success-border)',
                        }}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {stats.inStock}
                        </span>
                    </div>
                    {stats.lowStock > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border" style={{
                                backgroundColor: 'var(--badge-warning-bg)',
                                color: 'var(--badge-warning-text)',
                                borderColor: 'var(--badge-warning-border)',
                            }}>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {stats.lowStock}
                            </span>
                        </div>
                    )}
                    {stats.outOfStock > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border" style={{
                                backgroundColor: 'var(--badge-error-bg)',
                                color: 'var(--badge-error-text)',
                                borderColor: 'var(--badge-error-border)',
                            }}>
                                <X className="h-3 w-3 mr-1" />
                                {stats.outOfStock}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Search Bar */}
            {showSearch && (
                <div className="mb-2 px-1">
                    <div className="relative">
                        <Search
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
                            style={{ color: 'var(--text-muted)' }}
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search items..."
                            className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border transition-all focus:outline-none focus:ring-1"
                            style={{
                                backgroundColor: 'var(--ui-bg-secondary)',
                                borderColor: 'var(--ui-border-primary)',
                                color: 'var(--ui-text-primary)',
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted/50"
                            >
                                <X className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            <ScrollArea className="flex-1 border-2 border-border rounded-md @container">
                {/* Compact Card View for Small Sizes */}
                <div className="@lg:hidden p-2 space-y-2">
                    {sortedData.map((item, index) => {
                        const primaryValue = item[primaryDataPoint];
                        const statusStyles = getStockStatusStyles(primaryValue, lowStockThreshold);

                        return (
                            <div
                                key={`${item.part_code}-${index}`}
                                className="rounded-lg border border-border/50 p-3 space-y-2 transition-all duration-300 hover:bg-muted/30"
                            >
                                {/* Top Row: Part Code & Primary Value */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                                        <span className="font-mono font-bold text-sm" style={{ color: 'var(--table-text-primary)' }}>
                                            {item.part_code}
                                        </span>
                                    </div>
                                    <span
                                        className="inline-flex items-center px-2 py-0.5 rounded-md text-sm font-bold border"
                                        style={statusStyles}
                                    >
                                        {formatNumber(primaryValue)}
                                        {primaryValue > 0 && primaryValue <= lowStockThreshold && (
                                            <AlertTriangle className="h-3 w-3 ml-1" />
                                        )}
                                    </span>
                                </div>

                                {/* Description */}
                                {showDescription && item.part_desc && (
                                    <div className="text-xs truncate" style={{ color: 'var(--table-text-secondary)' }}>
                                        {item.part_desc}
                                    </div>
                                )}

                                {/* Secondary Metrics */}
                                <div className="flex items-center gap-2 text-xs">
                                    {primaryDataPoint !== 'on_hand' && (
                                        <span style={{ color: 'var(--table-text-secondary)' }}>
                                            Hand: <span className="font-semibold" style={{ color: 'var(--table-text-primary)' }}>{formatNumber(item.on_hand)}</span>
                                        </span>
                                    )}
                                    {primaryDataPoint !== 'on_hold' && item.on_hold > 0 && (
                                        <span style={{ color: 'var(--badge-warning-text)' }}>
                                            Hold: <span className="font-semibold">{formatNumber(item.on_hold)}</span>
                                        </span>
                                    )}
                                    {primaryDataPoint !== 'prod_sced' && item.prod_sced > 0 && (
                                        <span style={{ color: 'var(--badge-primary-text)' }}>
                                            Sched: <span className="font-semibold">{formatNumber(item.prod_sced)}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* No results from search */}
                    {sortedData.length === 0 && searchQuery && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Search className="h-8 w-8 mb-2" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                No items match "{searchQuery}"
                            </p>
                        </div>
                    )}
                </div>

                {/* Table View for Medium+ Sizes */}
                <div className="hidden @lg:block">
                    <Table className="text-left" style={{ color: 'var(--table-text-primary)' }}>
                        <TableHeader className="sticky top-0 z-10" style={{ backgroundColor: 'var(--table-header-bg)' }}>
                            <TableRow className="border-border/50 hover:bg-transparent">
                                {renderSortableHeader(
                                    'Part Code',
                                    'part_code',
                                    <FileText className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                )}
                                {showDescription && !isCompact && renderSortableHeader(
                                    'Description',
                                    'part_desc',
                                    <Package className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                )}
                                {renderSortableHeader(
                                    COLUMN_LABELS[primaryDataPoint],
                                    primaryDataPoint,
                                    <CheckCircle className="h-3.5 w-3.5" style={{ color: 'var(--badge-success-text)' }} />,
                                    'right'
                                )}
                                {primaryDataPoint !== 'on_hand' && renderSortableHeader(
                                    'On Hand',
                                    'on_hand',
                                    <Boxes className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />,
                                    'right'
                                )}
                                {primaryDataPoint !== 'on_hold' && renderSortableHeader(
                                    'On Hold',
                                    'on_hold',
                                    <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--badge-warning-text)' }} />,
                                    'right'
                                )}
                                {primaryDataPoint !== 'prod_sced' && renderSortableHeader(
                                    'Scheduled',
                                    'prod_sced',
                                    <Clock className="h-3.5 w-3.5" style={{ color: 'var(--badge-primary-text)' }} />,
                                    'right'
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedData.map((item, index) => {
                                const primaryValue = item[primaryDataPoint];
                                const statusStyles = getStockStatusStyles(primaryValue, lowStockThreshold);
                                const isLowOrOut = primaryValue <= lowStockThreshold;

                                return (
                                    <TableRow
                                        key={`${item.part_code}-${index}`}
                                        className="border-border/30 transition-all duration-300 hover:bg-muted/50"
                                        style={primaryValue <= 0 ? {
                                            backgroundColor: 'var(--badge-error-bg)',
                                            opacity: 0.9,
                                        } : isLowOrOut ? {
                                            backgroundColor: 'var(--badge-warning-bg)',
                                            opacity: 0.7,
                                        } : {}}
                                    >
                                        {/* Part Code */}
                                        <TableCell className="py-1.5">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                                                <span className="font-mono font-bold text-[15px] leading-tight" style={{ color: 'var(--table-text-primary)' }}>
                                                    {item.part_code}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Description */}
                                        {showDescription && !isCompact && (
                                            <TableCell className="py-1.5">
                                                <span className="text-[15px] leading-tight" style={{ color: 'var(--table-text-secondary)' }}>
                                                    {item.part_desc || '—'}
                                                </span>
                                            </TableCell>
                                        )}

                                        {/* Primary Data Point - Highlighted */}
                                        <TableCell className="text-right py-1.5">
                                            <span
                                                className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-sm font-bold border min-w-[60px]"
                                                style={statusStyles}
                                            >
                                                {formatNumber(primaryValue)}
                                                {primaryValue > 0 && primaryValue <= lowStockThreshold && (
                                                    <AlertTriangle className="h-3 w-3 ml-1" />
                                                )}
                                            </span>
                                        </TableCell>

                                        {/* On Hand */}
                                        {primaryDataPoint !== 'on_hand' && (
                                            <TableCell className="text-right py-1.5">
                                                <span className="font-bold text-[15px] leading-tight" style={{ color: 'var(--table-text-primary)' }}>
                                                    {formatNumber(item.on_hand)}
                                                </span>
                                            </TableCell>
                                        )}

                                        {/* On Hold */}
                                        {primaryDataPoint !== 'on_hold' && (
                                            <TableCell className="text-right py-1.5">
                                                <span className="font-bold text-[15px] leading-tight" style={{
                                                    color: item.on_hold > 0 ? 'var(--badge-warning-text)' : 'var(--table-text-secondary)',
                                                }}>
                                                    {formatNumber(item.on_hold)}
                                                </span>
                                            </TableCell>
                                        )}

                                        {/* Scheduled Production */}
                                        {primaryDataPoint !== 'prod_sced' && (
                                            <TableCell className="text-right py-1.5">
                                                <span className="font-bold text-[15px] leading-tight" style={{
                                                    color: item.prod_sced > 0 ? 'var(--badge-primary-text)' : 'var(--table-text-secondary)',
                                                }}>
                                                    {formatNumber(item.prod_sced)}
                                                </span>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>

                    {/* No results from search */}
                    {sortedData.length === 0 && searchQuery && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Search className="h-8 w-8 mb-2" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                No items match "{searchQuery}"
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
});

/* -------------------------------------- */
/* 📊 InventoryTracker Component          */
/* -------------------------------------- */

export default function InventoryTracker() {
    // Widget-specific settings
    const { settings } = useWidgetSettings(WIDGET_ID);

    // Get settings with defaults
    const trackedItems: string[] = settings.trackedItems ?? [];
    const primaryDataPoint: PrimaryDataPoint = settings.primaryDataPoint ?? 'available';
    const lowStockThreshold: number = settings.lowStockThreshold ?? 10;
    const showDescription: boolean = settings.showDescription ?? true;
    const showSummary: boolean = settings.showSummary ?? true;
    const showSearch: boolean = settings.showSearch ?? true;

    // Memoize the widget payload
    const widgetPayload = useMemo(
        () => ({
            module: "InventoryTracker",
            queryId: "InventoryTracker",
            params: {
                itemCodes: trackedItems,
            }
        }),
        [trackedItems]
    );

    return (
        <div className="h-full w-full">
            <Widget
                endpoint="/api/widgets"
                payload={widgetPayload}
                title="Inventory Tracker"
                refreshInterval={30000}
                widgetId={WIDGET_ID}
            >
                {(data: InventoryItem[] | null) => {
                    // Check if no items are configured
                    if (trackedItems.length === 0) {
                        return (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center space-y-2">
                                    <Package className="h-12 w-12 mx-auto" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No items configured</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                                        Add part codes in widget settings
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    // Check if no data returned
                    if (!data || data.length === 0) {
                        return (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center space-y-2">
                                    <Package className="h-12 w-12 mx-auto" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No inventory data found</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                                        Check that part codes exist in inventory
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <InventoryTrackerContent
                            data={data}
                            primaryDataPoint={primaryDataPoint}
                            lowStockThreshold={lowStockThreshold}
                            showDescription={showDescription}
                            showSummary={showSummary}
                            showSearch={showSearch}
                        />
                    );
                }}
            </Widget>
        </div>
    );
}
