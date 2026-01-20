import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import Widget from "./Widget";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, subMonths, endOfMonth } from "date-fns";
import { Package, FileText, TrendingUp, Calendar, Award } from "lucide-react";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

const WIDGET_ID = 'TopProductUnitSales';

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
    // Widget-specific settings
    const { settings } = useWidgetSettings(WIDGET_ID);
    const highlightTopThree = settings.highlightTopThree as boolean;
    const showPercentageChange = settings.showPercentageChange as boolean;

    const [width, setWidth] = useState(0);
    const observerRef = useRef<ResizeObserver | null>(null);

    // Callback ref to measure dimensions
    const measureRef = useCallback((node: HTMLDivElement | null) => {
        if (node) {
            if (observerRef.current) observerRef.current.disconnect();
            observerRef.current = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setWidth(entry.contentRect.width);
                }
            });
            observerRef.current.observe(node);
        } else {
            observerRef.current?.disconnect();
        }
    }, []);

    // Prepare the widget payload with SQL query.
    // This filter now only returns data for the last 12 complete months.
    const widgetPayload = useMemo(
        () => ({
            module: "TopProductUnitSales",
            queryId: "TopProductUnitSales"
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

            // Prepare trend data for sparkline (last 12 months)
            const trendData = months.map(m => ({
                month: m,
                value: monthlyData[m] || 0
            }));

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
                trendData
            };
        }).sort((a, b) => {
            return parseInt(b.avg12.value.replace(/,/g, "")) - parseInt(a.avg12.value.replace(/,/g, ""));
        });

        // Helper function to get color styles based on percentage - theme-aware
        const getPercentageColor = (pct: number): React.CSSProperties => {
            if (pct >= 10) return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)', opacity: 1.2 };
            if (pct >= 5) return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' };
            if (pct > 0) return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)', opacity: 0.8 };
            if (pct === 0) return { backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--text-muted)', borderColor: 'var(--ui-border-primary)' };
            if (pct > -5) return { backgroundColor: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', borderColor: 'var(--badge-warning-border)', opacity: 0.8 };
            if (pct > -10) return { backgroundColor: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', borderColor: 'var(--badge-warning-border)' };
            return { backgroundColor: 'var(--badge-error-bg)', color: 'var(--badge-error-text)', borderColor: 'var(--badge-error-border)' };
        };

        // Determine if we're in compact mode
        const isCompact = width > 0 && width < 700;
        const isVeryNarrow = width > 0 && width < 400;

        // --- COMPACT / MOBILE VIEW ---
        if (isCompact) {
            return (
                <ScrollArea className="h-full w-full">
                    <div className={`flex flex-col ${isVeryNarrow ? 'gap-1' : 'gap-1.5'} pb-1`}>
                        {tableData.map((row, i) => {
                            const rank = i + 1;
                            const isFirst = rank === 1;
                            const isTop = rank <= 3;

                            return (
                                <div
                                    key={i}
                                    className="relative rounded overflow-hidden"
                                    style={{
                                        backgroundColor: 'var(--table-row-bg)',
                                        border: isFirst ? '1px solid var(--badge-warning-border)' : '1px solid var(--table-border)',
                                    }}
                                >
                                    {/* Header row: Rank + Part Info + Sparkline */}
                                    <div
                                        className={`flex items-center ${isVeryNarrow ? 'gap-1 px-1.5 py-1' : 'gap-2 px-2 py-1.5'}`}
                                        style={{
                                            backgroundColor: isFirst ? 'var(--badge-warning-bg)' : 'var(--table-header-bg)',
                                            borderBottom: '1px solid var(--table-border)'
                                        }}
                                    >
                                        {/* Rank */}
                                        <div
                                            className={`flex items-center justify-center rounded font-black shrink-0 ${isVeryNarrow ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 text-xs'}`}
                                            style={{
                                                backgroundColor: isFirst ? 'var(--badge-warning-bg)' : isTop ? 'var(--ui-bg-secondary)' : 'var(--table-row-bg)',
                                                color: isFirst ? 'var(--badge-warning-text)' : isTop ? 'var(--table-text-primary)' : 'var(--text-muted)',
                                                border: `1px solid ${isFirst ? 'var(--badge-warning-border)' : 'var(--table-border)'}`
                                            }}
                                        >
                                            {rank}
                                        </div>

                                        {/* Part code and description */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className={`font-mono font-bold ${isVeryNarrow ? 'text-[10px]' : 'text-xs'}`} style={{ color: 'var(--table-text-primary)' }}>
                                                    {row.partCode}
                                                </span>
                                                {!isVeryNarrow && (
                                                    <span
                                                        className="text-[10px] truncate"
                                                        style={{ color: 'var(--text-muted)' }}
                                                        title={row.partDesc}
                                                    >
                                                        {row.partDesc}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Mini Sparkline in header */}
                                        <div className={`shrink-0 ${isVeryNarrow ? 'h-[16px] w-[40px]' : 'h-[20px] w-[60px]'}`}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={row.trendData} margin={{ top: 1, right: 1, left: 1, bottom: 1 }}>
                                                    <Area
                                                        type="monotone"
                                                        dataKey="value"
                                                        stroke="var(--badge-primary-text)"
                                                        strokeWidth={1}
                                                        fill="var(--badge-primary-bg)"
                                                        animationDuration={500}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Data row: All 4 averages */}
                                    <div className={`grid grid-cols-4 ${isVeryNarrow ? 'gap-0.5 px-1 py-1' : 'gap-1 px-2 py-1.5'}`}>
                                        {/* 3 Mo */}
                                        <div className="flex flex-col items-center">
                                            <span className={`font-medium ${isVeryNarrow ? 'text-[8px]' : 'text-[9px]'}`} style={{ color: 'var(--text-muted)' }}>3mo</span>
                                            <span className={`font-bold tabular-nums ${isVeryNarrow ? 'text-[10px]' : 'text-xs'}`} style={{ color: 'var(--table-text-primary)' }}>{row.avg3.value}</span>
                                            {showPercentageChange && row.avg3.pct !== null && (
                                                <span
                                                    className={`font-semibold tabular-nums ${isVeryNarrow ? 'text-[7px]' : 'text-[9px]'}`}
                                                    style={{ color: row.avg3.pct > 0 ? 'var(--badge-success-text)' : row.avg3.pct < 0 ? 'var(--badge-error-text)' : 'var(--text-muted)' }}
                                                >
                                                    {row.avg3.pct > 0 ? '+' : ''}{row.avg3.pct.toFixed(isVeryNarrow ? 0 : 1)}%
                                                </span>
                                            )}
                                        </div>

                                        {/* 6 Mo */}
                                        <div className="flex flex-col items-center">
                                            <span className={`font-medium ${isVeryNarrow ? 'text-[8px]' : 'text-[9px]'}`} style={{ color: 'var(--text-muted)' }}>6mo</span>
                                            <span className={`font-bold tabular-nums ${isVeryNarrow ? 'text-[10px]' : 'text-xs'}`} style={{ color: 'var(--table-text-primary)' }}>{row.avg6.value}</span>
                                            {showPercentageChange && row.avg6.pct !== null && (
                                                <span
                                                    className={`font-semibold tabular-nums ${isVeryNarrow ? 'text-[7px]' : 'text-[9px]'}`}
                                                    style={{ color: row.avg6.pct > 0 ? 'var(--badge-success-text)' : row.avg6.pct < 0 ? 'var(--badge-error-text)' : 'var(--text-muted)' }}
                                                >
                                                    {row.avg6.pct > 0 ? '+' : ''}{row.avg6.pct.toFixed(isVeryNarrow ? 0 : 1)}%
                                                </span>
                                            )}
                                        </div>

                                        {/* 9 Mo */}
                                        <div className="flex flex-col items-center">
                                            <span className={`font-medium ${isVeryNarrow ? 'text-[8px]' : 'text-[9px]'}`} style={{ color: 'var(--text-muted)' }}>9mo</span>
                                            <span className={`font-bold tabular-nums ${isVeryNarrow ? 'text-[10px]' : 'text-xs'}`} style={{ color: 'var(--table-text-primary)' }}>{row.avg9.value}</span>
                                            {showPercentageChange && row.avg9.pct !== null && (
                                                <span
                                                    className={`font-semibold tabular-nums ${isVeryNarrow ? 'text-[7px]' : 'text-[9px]'}`}
                                                    style={{ color: row.avg9.pct > 0 ? 'var(--badge-success-text)' : row.avg9.pct < 0 ? 'var(--badge-error-text)' : 'var(--text-muted)' }}
                                                >
                                                    {row.avg9.pct > 0 ? '+' : ''}{row.avg9.pct.toFixed(isVeryNarrow ? 0 : 1)}%
                                                </span>
                                            )}
                                        </div>

                                        {/* 12 Mo - highlighted */}
                                        <div
                                            className={`flex flex-col items-center rounded ${isVeryNarrow ? 'px-0.5 py-0.5' : 'px-1 py-0.5'}`}
                                            style={{ backgroundColor: isFirst ? 'var(--badge-warning-bg)' : 'var(--ui-bg-secondary)' }}
                                        >
                                            <span className={`font-medium ${isVeryNarrow ? 'text-[8px]' : 'text-[9px]'}`} style={{ color: isFirst ? 'var(--badge-warning-text)' : 'var(--text-muted)' }}>12mo</span>
                                            <span
                                                className={`font-black tabular-nums ${isVeryNarrow ? 'text-xs' : 'text-sm'}`}
                                                style={{ color: isFirst ? 'var(--badge-warning-text)' : 'var(--table-text-primary)' }}
                                            >
                                                {row.avg12.value}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            )
        }

        return (
            <ScrollArea className="h-full w-full border-2 border-border rounded-md">
                <Table className="text-left outstanding-orders-table" style={{ color: 'var(--table-text-primary)' }}>
                    <TableHeader className="sticky top-0 z-10" style={{ backgroundColor: 'var(--table-header-bg)' }}>
                        <TableRow className="border-border/50 hover:bg-transparent">
                            <TableHead className="font-bold py-2 w-12" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center gap-1">
                                    <Award className="h-3.5 w-3.5" style={{ color: 'var(--badge-warning-text)' }} />
                                    #
                                </div>
                            </TableHead>
                            <TableHead className="font-bold py-2 w-24" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center gap-1">
                                    <FileText className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    Part
                                </div>
                            </TableHead>
                            <TableHead className="font-bold py-2" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center gap-1">
                                    <Package className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    Description
                                </div>
                            </TableHead>
                            <TableHead className="text-center font-bold py-2 w-48 border-l border-border" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center justify-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    3 Mo Avg
                                </div>
                            </TableHead>
                            <TableHead className="text-center font-bold py-2 w-48 border-l border-border" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center justify-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    6 Mo Avg
                                </div>
                            </TableHead>
                            <TableHead className="text-center font-bold py-2 w-48 border-l border-border" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center justify-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--table-text-secondary)' }} />
                                    9 Mo Avg
                                </div>
                            </TableHead>
                            <TableHead className="text-center font-bold py-2 w-36 border-l border-border" style={{ color: 'var(--table-text-primary)' }}>
                                <div className="flex items-center justify-center gap-1">
                                    <TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--badge-warning-text)' }} />
                                    12 Mo Avg
                                </div>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row, i) => {
                            const rank = i + 1;
                            const isTopThree = rank <= 3;
                            const getRankColor = () => {
                                if (!highlightTopThree) return 'var(--text-muted)';
                                if (rank === 1) return 'var(--badge-warning-text)';
                                if (rank === 2) return 'var(--table-text-primary)';
                                if (rank === 3) return 'var(--badge-warning-border)';
                                return 'var(--text-muted)';
                            };

                            return (
                                <TableRow
                                    key={i}
                                    className={`border-border/30 transition-all duration-300 hover:bg-muted/50`}
                                    style={highlightTopThree && rank === 1 ? {
                                        backgroundColor: 'var(--badge-warning-bg)',
                                        borderLeft: '2px solid var(--badge-warning-border)',
                                    } : highlightTopThree && isTopThree ? {
                                        backgroundColor: 'var(--ui-bg-secondary)',
                                    } : {}}
                                >
                                    <TableCell className="py-1.5 text-center">
                                        <span className="font-bold text-[15px]" style={{
                                            color: getRankColor(),
                                            fontWeight: highlightTopThree && rank <= 2 ? 900 : 700
                                        }}>
                                            {rank}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-mono font-bold text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-primary)' }}>
                                        {row.partCode}
                                    </TableCell>
                                    <TableCell className="font-semibold text-[15px] leading-tight py-1.5" style={{ color: 'var(--table-text-primary)' }}>
                                        {row.partDesc}
                                    </TableCell>
                                    <TableCell className="py-1.5 border-l border-border">
                                        <div className="flex items-center justify-end gap-3 px-2">
                                            {showPercentageChange && row.avg3.pct !== null && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border" style={getPercentageColor(row.avg3.pct)}>
                                                    {row.avg3.pct > 0 ? "+" : ""}{row.avg3.pct.toFixed(1)}%
                                                </span>
                                            )}
                                            <span className="font-bold text-[15px] leading-tight min-w-[60px] text-right" style={{ color: 'var(--table-text-primary)' }}>{row.avg3.value}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-1.5 border-l border-border">
                                        <div className="flex items-center justify-end gap-3 px-2">
                                            {showPercentageChange && row.avg6.pct !== null && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border" style={getPercentageColor(row.avg6.pct)}>
                                                    {row.avg6.pct > 0 ? "+" : ""}{row.avg6.pct.toFixed(1)}%
                                                </span>
                                            )}
                                            <span className="font-bold text-[15px] leading-tight min-w-[60px] text-right" style={{ color: 'var(--table-text-primary)' }}>{row.avg6.value}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-1.5 border-l border-border">
                                        <div className="flex items-center justify-end gap-3 px-2">
                                            {showPercentageChange && row.avg9.pct !== null && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border" style={getPercentageColor(row.avg9.pct)}>
                                                    {row.avg9.pct > 0 ? "+" : ""}{row.avg9.pct.toFixed(1)}%
                                                </span>
                                            )}
                                            <span className="font-bold text-[15px] leading-tight min-w-[60px] text-right" style={{ color: 'var(--table-text-primary)' }}>{row.avg9.value}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-1.5 border-l border-border">
                                        <span className="font-black text-[16px] leading-tight" style={{ color: highlightTopThree && rank === 1 ? 'var(--badge-warning-text)' : 'var(--table-text-primary)' }}>{row.avg12.value}</span>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </ScrollArea>
        );
    }, [highlightTopThree, showPercentageChange, width]);

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
                return (
                    <div ref={measureRef} className="w-full h-full">
                        {renderFunction(data)}
                    </div>
                );
            }}
        </Widget>
    );
}