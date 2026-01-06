import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Widget from "./Widget";
import { nFormatter } from "@/utils/helpers";
import {
    format,
    startOfYear,
    subYears,
    eachDayOfInterval,
    eachWeekOfInterval,
    eachMonthOfInterval,
    endOfWeek,
    isAfter,
    isBefore,
} from "date-fns";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";

/* -------------------------------------- */
/* 📊 Types                                */
/* -------------------------------------- */
interface YTDSalesData {
    period: string;
    total: number;
}

interface CumulativeDataPoint {
    date: Date;
    label: string;
    shortLabel: string;
    periodSales: number;
    cumulativeSales: number;
    isCurrentPeriod: boolean;
}

interface ComparisonData {
    current: CumulativeDataPoint[];
    previous: CumulativeDataPoint[];
}

type TimeRange = "ytd" | "lastYear" | "comparison";
type Aggregation = "daily" | "weekly" | "monthly";

/* -------------------------------------- */
/* 🔎 useResponsiveConfig Hook             */
/* -------------------------------------- */
interface ResponsiveConfig {
    showAllLabels: boolean;
    labelFrequency: number;
    strokeWidth: number;
    fontSize: {
        axis: number;
        value: number;
        tooltip: number;
        header: number;
    };
    padding: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    showLegend: boolean;
    compactMode: boolean;
}

function useResponsiveConfig(ref: React.RefObject<HTMLDivElement | null>): ResponsiveConfig {
    const [config, setConfig] = useState<ResponsiveConfig>({
        showAllLabels: true,
        labelFrequency: 1,
        strokeWidth: 3,
        fontSize: { axis: 12, value: 14, tooltip: 13, header: 15 },
        padding: { top: 50, right: 20, bottom: 45, left: 65 },
        showLegend: true,
        compactMode: false,
    });

    useEffect(() => {
        if (!ref.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;

                if (width >= 900) {
                    setConfig({
                        showAllLabels: true,
                        labelFrequency: 1,
                        strokeWidth: 3,
                        fontSize: { axis: 12, value: 15, tooltip: 14, header: 16 },
                        padding: { top: 55, right: 25, bottom: 50, left: 75 },
                        showLegend: true,
                        compactMode: false,
                    });
                } else if (width >= 600) {
                    setConfig({
                        showAllLabels: true,
                        labelFrequency: 2,
                        strokeWidth: 2.5,
                        fontSize: { axis: 11, value: 14, tooltip: 13, header: 15 },
                        padding: { top: 50, right: 20, bottom: 45, left: 65 },
                        showLegend: true,
                        compactMode: false,
                    });
                } else if (width >= 400) {
                    setConfig({
                        showAllLabels: true,
                        labelFrequency: 3,
                        strokeWidth: 2,
                        fontSize: { axis: 10, value: 12, tooltip: 12, header: 14 },
                        padding: { top: 45, right: 15, bottom: 40, left: 55 },
                        showLegend: height >= 250,
                        compactMode: true,
                    });
                } else {
                    setConfig({
                        showAllLabels: false,
                        labelFrequency: 4,
                        strokeWidth: 2,
                        fontSize: { axis: 9, value: 11, tooltip: 11, header: 13 },
                        padding: { top: 40, right: 10, bottom: 35, left: 45 },
                        showLegend: false,
                        compactMode: true,
                    });
                }
            }
        });
        resizeObserver.observe(ref.current);
        return () => resizeObserver.disconnect();
    }, [ref]);

    return config;
}

/* -------------------------------------- */
/* 📊 Line Chart Component                 */
/* -------------------------------------- */
interface LineChartProps {
    data: ComparisonData;
    config: ResponsiveConfig;
    showComparison: boolean;
    showArea: boolean;
    timeRange: TimeRange;
}

const LineChart: React.FC<LineChartProps> = ({
    data,
    config,
    showComparison,
    showArea,
    timeRange,
}) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });
        resizeObserver.observe(chartRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const currentData = data.current;
    const previousData = data.previous;

    // Don't render until we have dimensions
    if (!currentData.length || dimensions.width === 0 || dimensions.height === 0) {
        return <div ref={chartRef} style={{ width: "100%", height: "100%" }} />;
    }

    const { padding, strokeWidth, fontSize } = config;
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    // Calculate max value across both datasets
    const allValues = [
        ...currentData.map((d) => d.cumulativeSales),
        ...(showComparison ? previousData.map((d) => d.cumulativeSales) : []),
    ];
    const maxValue = Math.max(...allValues, 1);

    // Generate nice Y-axis ticks
    const generateYTicks = (max: number): number[] => {
        if (max === 0) return [0];
        const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
        let step = magnitude;
        if (max / step < 3) step = magnitude / 2;
        if (max / step > 6) step = magnitude * 2;

        const ticks: number[] = [];
        for (let v = 0; v <= max * 1.05; v += step) {
            ticks.push(v);
        }
        return ticks;
    };

    const yTicks = generateYTicks(maxValue);
    const adjustedMax = yTicks[yTicks.length - 1] || maxValue;

    // Calculate date range for X-axis positioning
    const today = new Date();
    const yearStart = startOfYear(today);
    const totalDays = (today.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24);

    // Calculate point positions based on actual dates
    // For previous year data, we normalize dates to current year for proper overlay
    const getPoints = (dataset: CumulativeDataPoint[], isPreviousYear: boolean = false) =>
        dataset.map((item, index) => {
            let dateForPosition = item.date;
            if (isPreviousYear) {
                // Shift previous year dates to current year for alignment
                dateForPosition = new Date(item.date);
                dateForPosition.setFullYear(today.getFullYear());
            }
            const daysFromStart = (dateForPosition.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24);
            return {
                x: padding.left + (Math.max(0, daysFromStart) / totalDays) * chartWidth,
                y: padding.top + chartHeight - (item.cumulativeSales / adjustedMax) * chartHeight,
                data: item,
                index,
            };
        });

    const currentPoints = getPoints(currentData, false);
    const previousPoints = showComparison ? getPoints(previousData, true) : [];

    // Create smooth curve path using cardinal spline
    const createSmoothPath = (points: { x: number; y: number }[]): string => {
        if (points.length < 2) return "";
        if (points.length === 2) {
            return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
        }

        let path = `M ${points[0].x} ${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];

            const tension = 0.3;
            const cp1x = p1.x + ((p2.x - p0.x) * tension) / 2;
            const cp1y = p1.y + ((p2.y - p0.y) * tension) / 2;
            const cp2x = p2.x - ((p3.x - p1.x) * tension) / 2;
            const cp2y = p2.y - ((p3.y - p1.y) * tension) / 2;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }

        return path;
    };

    const currentPath = createSmoothPath(currentPoints);
    const previousPath = showComparison ? createSmoothPath(previousPoints) : "";

    // Create area path
    const createAreaPath = (linePath: string, points: { x: number; y: number }[]): string => {
        if (!points.length || !linePath) return "";
        const baseline = padding.top + chartHeight;
        return `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
    };

    // Handle mouse interaction - find nearest point by X position
    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;

        if (mouseX >= padding.left && mouseX <= dimensions.width - padding.right) {
            // Find the nearest point by X position
            let nearestIndex = 0;
            let nearestDistance = Infinity;

            currentPoints.forEach((point, index) => {
                const distance = Math.abs(point.x - mouseX);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = index;
                }
            });

            setHoveredIndex(nearestIndex);
        } else {
            setHoveredIndex(null);
        }
    };

    // Get current/latest values for header display
    const latestCurrent = currentData[currentData.length - 1];
    const latestPrevious = previousData[previousData.length - 1];
    const percentChange =
        showComparison && latestPrevious?.cumulativeSales
            ? ((latestCurrent.cumulativeSales - latestPrevious.cumulativeSales) /
                latestPrevious.cumulativeSales) *
            100
            : null;

    return (
        <div ref={chartRef} style={{ width: "100%", height: "100%", position: "relative" }}>
            <svg
                width={dimensions.width}
                height={dimensions.height}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredIndex(null)}
            >
                <defs>
                    <linearGradient id="currentAreaGradientYTD" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="var(--chart-bar)" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="var(--chart-bar)" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="previousAreaGradientYTD" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#9CA3AF" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#9CA3AF" stopOpacity="0.02" />
                    </linearGradient>
                    <filter id="lineShadowYTD" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                    </filter>
                </defs>

                {/* Y-axis grid lines and labels */}
                {yTicks.map((tick, i) => {
                    const y = padding.top + chartHeight - (tick / adjustedMax) * chartHeight;
                    return (
                        <g key={`y-${i}`}>
                            <line
                                x1={padding.left}
                                y1={y}
                                x2={dimensions.width - padding.right}
                                y2={y}
                                stroke="var(--border-light)"
                                strokeWidth="1"
                                opacity={tick === 0 ? 0.5 : 0.2}
                            />
                            <text
                                x={padding.left - 8}
                                y={y + 4}
                                textAnchor="end"
                                fill="var(--text-muted)"
                                fontSize={fontSize.axis}
                            >
                                ${nFormatter(tick, 1)}
                            </text>
                        </g>
                    );
                })}

                {/* X-axis month markers - evenly spaced based on full year range */}
                {(() => {
                    if (currentData.length < 2 || totalDays <= 0) return null;

                    // Generate all months from Jan to current month
                    const months = eachMonthOfInterval({ start: yearStart, end: today });

                    return months.map((monthDate, i) => {
                        // Calculate X position based on days from Jan 1
                        const daysFromStart = (monthDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24);
                        const x = padding.left + (daysFromStart / totalDays) * chartWidth;

                        return (
                            <g key={`month-${i}`}>
                                {/* Vertical dashed line through chart area */}
                                {i > 0 && (
                                    <line
                                        x1={x}
                                        y1={padding.top}
                                        x2={x}
                                        y2={padding.top + chartHeight}
                                        stroke="var(--border-light)"
                                        strokeWidth="1"
                                        strokeDasharray="4,4"
                                        opacity="0.7"
                                    />
                                )}
                                {/* Tick mark below axis */}
                                <line
                                    x1={x}
                                    y1={padding.top + chartHeight}
                                    x2={x}
                                    y2={padding.top + chartHeight + 5}
                                    stroke="var(--text-muted)"
                                    strokeWidth="1"
                                    opacity="0.4"
                                />
                                <text
                                    x={x}
                                    y={padding.top + chartHeight + 20}
                                    textAnchor={i === 0 ? "start" : "middle"}
                                    fill="var(--text-muted)"
                                    fontSize={fontSize.axis}
                                    fontWeight="500"
                                >
                                    {format(monthDate, "MMM")}
                                </text>
                            </g>
                        );
                    });
                })()}

                {/* Previous year area & line */}
                {showComparison && previousPoints.length > 0 && (
                    <>
                        {showArea && (
                            <path
                                d={createAreaPath(previousPath, previousPoints)}
                                fill="url(#previousAreaGradientYTD)"
                            />
                        )}
                        <path
                            d={previousPath}
                            fill="none"
                            stroke="#9CA3AF"
                            strokeWidth={strokeWidth * 0.8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="6,4"
                            opacity="0.6"
                        />
                    </>
                )}

                {/* Current year area & line */}
                {showArea && (
                    <path
                        d={createAreaPath(currentPath, currentPoints)}
                        fill="url(#currentAreaGradientYTD)"
                    />
                )}
                <path
                    d={currentPath}
                    fill="none"
                    stroke="var(--chart-bar)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#lineShadowYTD)"
                />

                {/* End point indicator for current data */}
                {currentPoints.length > 0 && (
                    <circle
                        cx={currentPoints[currentPoints.length - 1].x}
                        cy={currentPoints[currentPoints.length - 1].y}
                        r={6}
                        fill="var(--chart-bar)"
                        stroke="var(--ui-bg-primary)"
                        strokeWidth="3"
                    />
                )}

                {/* Hover elements */}
                {hoveredIndex !== null && currentPoints[hoveredIndex] && (
                    <>
                        {/* Vertical line */}
                        <line
                            x1={currentPoints[hoveredIndex].x}
                            y1={padding.top}
                            x2={currentPoints[hoveredIndex].x}
                            y2={padding.top + chartHeight}
                            stroke="var(--chart-bar)"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                            opacity="0.4"
                        />
                        {/* Current point */}
                        <circle
                            cx={currentPoints[hoveredIndex].x}
                            cy={currentPoints[hoveredIndex].y}
                            r={7}
                            fill="var(--chart-bar)"
                            stroke="var(--ui-bg-primary)"
                            strokeWidth="3"
                        />
                        {/* Previous point */}
                        {showComparison && previousPoints[hoveredIndex] && (
                            <circle
                                cx={previousPoints[hoveredIndex].x}
                                cy={previousPoints[hoveredIndex].y}
                                r={5}
                                fill="#9CA3AF"
                                stroke="var(--ui-bg-primary)"
                                strokeWidth="2"
                            />
                        )}
                    </>
                )}

                {/* Header with current value */}
                <text
                    x={dimensions.width - padding.right}
                    y={padding.top - 25}
                    textAnchor="end"
                    fill="var(--text-primary)"
                    fontSize={fontSize.header}
                    fontWeight="700"
                >
                    ${nFormatter(latestCurrent?.cumulativeSales || 0, 2)}
                </text>
                {showComparison && percentChange !== null && (
                    <text
                        x={dimensions.width - padding.right}
                        y={padding.top - 8}
                        textAnchor="end"
                        fill={percentChange >= 0 ? "#22C55E" : "#EF4444"}
                        fontSize={fontSize.axis + 1}
                        fontWeight="600"
                    >
                        {percentChange >= 0 ? "▲" : "▼"} {Math.abs(percentChange).toFixed(1)}% vs LY
                    </text>
                )}
            </svg>

            {/* Legend */}
            {config.showLegend && showComparison && (
                <div
                    style={{
                        position: "absolute",
                        top: 8,
                        left: padding.left,
                        display: "flex",
                        gap: "16px",
                        fontSize: fontSize.axis,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div
                            style={{
                                width: 16,
                                height: 3,
                                backgroundColor: "var(--chart-bar)",
                                borderRadius: 2,
                            }}
                        />
                        <span style={{ color: "var(--text-secondary)" }}>
                            {timeRange === "comparison" ? "This Year" : "Current"}
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div
                            style={{
                                width: 16,
                                height: 3,
                                backgroundColor: "#9CA3AF",
                                borderRadius: 2,
                                opacity: 0.6,
                            }}
                        />
                        <span style={{ color: "var(--text-muted)" }}>Last Year</span>
                    </div>
                </div>
            )}

            {/* Tooltip */}
            {hoveredIndex !== null && currentData[hoveredIndex] && (
                <div
                    style={{
                        position: "absolute",
                        top: Math.max(
                            padding.top,
                            Math.min(
                                currentPoints[hoveredIndex].y - 90,
                                dimensions.height - 130
                            )
                        ),
                        left: Math.min(
                            Math.max(currentPoints[hoveredIndex].x - 90, 10),
                            dimensions.width - 190
                        ),
                        backgroundColor: "var(--ui-bg-primary)",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        border: "1px solid var(--ui-border-primary)",
                        pointerEvents: "none",
                        zIndex: 1000,
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                        minWidth: "160px",
                    }}
                >
                    <div
                        style={{
                            color: "var(--text-secondary)",
                            fontSize: fontSize.tooltip - 1,
                            marginBottom: "8px",
                            fontWeight: 500,
                        }}
                    >
                        {currentData[hoveredIndex].label}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: showComparison ? "6px" : 0,
                        }}
                    >
                        <span style={{ color: "var(--text-muted)", fontSize: fontSize.tooltip - 1 }}>
                            {showComparison ? "This Year" : "Cumulative"}
                        </span>
                        <span
                            style={{
                                color: "var(--chart-bar)",
                                fontSize: fontSize.tooltip + 2,
                                fontWeight: 700,
                            }}
                        >
                            ${nFormatter(currentData[hoveredIndex].cumulativeSales, 2)}
                        </span>
                    </div>
                    {showComparison && previousData[hoveredIndex] && (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <span style={{ color: "var(--text-muted)", fontSize: fontSize.tooltip - 1 }}>
                                Last Year
                            </span>
                            <span
                                style={{
                                    color: "#9CA3AF",
                                    fontSize: fontSize.tooltip,
                                    fontWeight: 600,
                                }}
                            >
                                ${nFormatter(previousData[hoveredIndex].cumulativeSales, 2)}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* -------------------------------------- */
/* 🎛️ Control Bar Component               */
/* -------------------------------------- */
interface ControlBarProps {
    timeRange: TimeRange;
    setTimeRange: (range: TimeRange) => void;
    aggregation: Aggregation;
    setAggregation: (agg: Aggregation) => void;
    compact: boolean;
}

const ControlBar: React.FC<ControlBarProps> = ({
    timeRange,
    setTimeRange,
    aggregation,
    setAggregation,
    compact,
}) => {
    const buttonStyle = (active: boolean): React.CSSProperties => ({
        padding: compact ? "4px 8px" : "5px 12px",
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "all 0.15s ease",
        backgroundColor: active ? "var(--chart-bar)" : "var(--ui-bg-secondary)",
        color: active ? "white" : "var(--text-secondary)",
    });

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
                gap: 8,
                flexWrap: "wrap",
            }}
        >
            <div style={{ display: "flex", gap: 4 }}>
                <button style={buttonStyle(timeRange === "ytd")} onClick={() => setTimeRange("ytd")}>
                    YTD
                </button>
                <button
                    style={buttonStyle(timeRange === "comparison")}
                    onClick={() => setTimeRange("comparison")}
                >
                    vs Last Year
                </button>
                <button
                    style={buttonStyle(timeRange === "lastYear")}
                    onClick={() => setTimeRange("lastYear")}
                >
                    Last Year
                </button>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
                <button
                    style={buttonStyle(aggregation === "daily")}
                    onClick={() => setAggregation("daily")}
                >
                    Daily
                </button>
                <button
                    style={buttonStyle(aggregation === "weekly")}
                    onClick={() => setAggregation("weekly")}
                >
                    Weekly
                </button>
                <button
                    style={buttonStyle(aggregation === "monthly")}
                    onClick={() => setAggregation("monthly")}
                >
                    Monthly
                </button>
            </div>
        </div>
    );
};

/* -------------------------------------- */
/* 📊 Main Widget Component                */
/* -------------------------------------- */
export default function SalesYTDCumulativeLine() {
    const containerRef = useRef<HTMLDivElement>(null);
    const config = useResponsiveConfig(containerRef);
    const { settings } = useWidgetSettings("SalesYTDCumulativeLine");

    const [timeRange, setTimeRange] = useState<TimeRange>((settings.defaultTimeRange as TimeRange) ?? "ytd");
    const [aggregation, setAggregation] = useState<Aggregation>((settings.defaultAggregation as Aggregation) ?? "weekly");

    const showArea = settings.showArea ?? true;

    // We need data for both current and previous year
    const widgetPayload = useMemo(
        () => ({
            module: "SalesYTDCumulativeLine",
            queryId: "SalesYTDCumulativeTwoYear",
        }),
        []
    );

    // Process raw data into chart-ready format
    const processData = useCallback(
        (rawData: YTDSalesData[]): ComparisonData => {
            const today = new Date();
            const currentYearStart = startOfYear(today);
            const lastYearStart = startOfYear(subYears(today, 1));
            const lastYearEquivalentDate = subYears(today, 1);

            // Create sales lookup maps
            const salesMap = new Map<string, number>();
            rawData.forEach((item) => {
                salesMap.set(item.period, item.total);
            });

            // Helper to sum sales in a date range
            const sumSalesInRange = (start: Date, end: Date): number => {
                let total = 0;
                const current = new Date(start);
                while (current <= end) {
                    const key = format(current, "yyyy-MM-dd");
                    total += salesMap.get(key) || 0;
                    current.setDate(current.getDate() + 1);
                }
                return total;
            };

            // Generate aggregated data points
            const generateDataPoints = (
                yearStart: Date,
                endDate: Date,
                isCurrentYear: boolean
            ): CumulativeDataPoint[] => {
                const points: CumulativeDataPoint[] = [];
                let cumulative = 0;

                if (aggregation === "daily") {
                    const days = eachDayOfInterval({ start: yearStart, end: endDate });
                    days.forEach((day, idx) => {
                        const key = format(day, "yyyy-MM-dd");
                        const periodSales = salesMap.get(key) || 0;
                        cumulative += periodSales;

                        points.push({
                            date: day,
                            label: format(day, "MMMM d, yyyy"),
                            shortLabel: format(day, "M/d"),
                            periodSales,
                            cumulativeSales: cumulative,
                            isCurrentPeriod: isCurrentYear && idx === days.length - 1,
                        });
                    });
                } else if (aggregation === "monthly") {
                    const months = eachMonthOfInterval({ start: yearStart, end: endDate });
                    months.forEach((monthStart, idx) => {
                        const monthEnd = idx < months.length - 1
                            ? new Date(months[idx + 1].getTime() - 1)
                            : endDate;
                        const periodSales = sumSalesInRange(monthStart, monthEnd);
                        cumulative += periodSales;

                        points.push({
                            date: monthStart,
                            label: format(monthStart, "MMMM"),
                            shortLabel: format(monthStart, "MMM"),
                            periodSales,
                            cumulativeSales: cumulative,
                            isCurrentPeriod: isCurrentYear && idx === months.length - 1,
                        });
                    });
                } else if (aggregation === "weekly") {
                    // Weekly aggregationif somehow none match
                    const weeks = eachWeekOfInterval(
                        { start: yearStart, end: endDate },
                        { weekStartsOn: 0 }
                    );

                    weeks.forEach((weekStart, idx) => {
                        const effectiveStart = isBefore(weekStart, yearStart) ? yearStart : weekStart;
                        let weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

                        if (isAfter(weekEnd, endDate)) {
                            weekEnd = endDate;
                        }

                        const periodSales = sumSalesInRange(effectiveStart, weekEnd);
                        cumulative += periodSales;

                        points.push({
                            date: effectiveStart,
                            label: `Week of ${format(effectiveStart, "MMM d")}`,
                            shortLabel: format(effectiveStart, "M/d"),
                            periodSales,
                            cumulativeSales: cumulative,
                            isCurrentPeriod: isCurrentYear && idx === weeks.length - 1,
                        });
                    });
                }

                return points;
            };

            // Generate data based on time range
            let currentData: CumulativeDataPoint[] = [];
            let previousData: CumulativeDataPoint[] = [];

            if (timeRange === "ytd") {
                currentData = generateDataPoints(currentYearStart, today, true);
            } else if (timeRange === "lastYear") {
                currentData = generateDataPoints(lastYearStart, lastYearEquivalentDate, false);
            } else {
                // Comparison mode
                currentData = generateDataPoints(currentYearStart, today, true);
                previousData = generateDataPoints(lastYearStart, lastYearEquivalentDate, false);
            }

            return { current: currentData, previous: previousData };
        },
        [aggregation, timeRange]
    );

    return (
        <div ref={containerRef} style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
            <Widget
                endpoint="/api/widgets"
                payload={widgetPayload}
                title="YTD Sales (Cumulative)"
                refreshInterval={300000}
                skeletonType="chart"
            >
                {(rawData: YTDSalesData[]) => {
                    if (!rawData || rawData.length === 0) {
                        return <div className="widget-empty">No sales data available</div>;
                    }

                    const chartData = processData(rawData);

                    return (
                        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                            <ControlBar
                                timeRange={timeRange}
                                setTimeRange={setTimeRange}
                                aggregation={aggregation}
                                setAggregation={setAggregation}
                                compact={config.compactMode}
                            />
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <LineChart
                                    data={chartData}
                                    config={config}
                                    showComparison={timeRange === "comparison"}
                                    showArea={showArea}
                                    timeRange={timeRange}
                                />
                            </div>
                        </div>
                    );
                }}
            </Widget>
        </div>
    );
}
