import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Widget from "./Widget";
import {
    calculateDateRange,
    processSalesData,
    prepareChartData,
    nFormatter,
} from "@/utils/helpers";
import { SalesData, ProcessedSalesData } from "@/types";

/* -------------------------------------- */
/* 🔎 useResponsiveVisibleMonths Hook      */
/* -------------------------------------- */
function useResponsiveVisibleMonths(ref: React.RefObject<HTMLDivElement>): number {
    const [visibleMonths, setVisibleMonths] = useState(6);

    useEffect(() => {
        if (!ref.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width } = entry.contentRect;
                if (width >= 1200) setVisibleMonths(9);
                else if (width >= 800) setVisibleMonths(6);
                else if (width >= 400) setVisibleMonths(3);
                else setVisibleMonths(1);
            }
        });
        resizeObserver.observe(ref.current);
        return () => {
            resizeObserver.disconnect();
        };
    }, [ref]);

    return visibleMonths;
}

/* -------------------------------------- */
/* 📊 Custom Comparison Bar Chart         */
/* -------------------------------------- */
interface CustomBarChartProps {
    data: ProcessedSalesData[];
}

const CustomBarChart: React.FC<CustomBarChartProps> = ({ data }) => {
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

    if (!data.length || !dimensions.width) {
        return <div ref={chartRef} style={{ width: "100%", height: "100%" }} />;
    }

    const padding = { top: 50, right: 15, bottom: 50, left: 15 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;
    
    const maxValue = Math.max(...data.map(d => Math.max(d.currentPeriodSales, d.previousPeriodSales)));
    const groupWidth = chartWidth / data.length;
    const groupGap = Math.max(groupWidth * 0.15, 8);
    const barWidth = (groupWidth - groupGap) / 2;
    const barGap = 4;

    // Get current day of month to calculate partial comparison
    const today = new Date();
    const currentDayOfMonth = today.getDate();
    const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthProgressRatio = currentDayOfMonth / daysInCurrentMonth;

    return (
        <div ref={chartRef} style={{ width: "100%", height: "100%", position: "relative" }}>
            <svg width={dimensions.width} height={dimensions.height} style={{ overflow: "visible" }}>
                {/* Define pattern for projection */}
                <defs>
                    <pattern id="projectionPattern" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                        <line x1="0" y1="0" x2="0" y2="8" stroke="var(--chart-bar)" strokeWidth="4" opacity="0.6" />
                    </pattern>
                </defs>

                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const y = padding.top + chartHeight * (1 - ratio);
                    return (
                        <line
                            key={i}
                            x1={padding.left}
                            y1={y}
                            x2={dimensions.width - padding.right}
                            y2={y}
                            stroke="rgba(255, 255, 255, 0.08)"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Bars and labels */}
                {data.map((item, index) => {
                    const isLast = index === data.length - 1;
                    const isHovered = hoveredIndex === index;
                    
                    const groupX = padding.left + index * groupWidth + groupGap / 2;
                    const prevX = groupX;
                    const currX = groupX + barWidth + barGap;
                    
                    // For last month: calculate partial vs remaining
                    const partialPrevious = isLast ? item.previousPeriodSales * monthProgressRatio : 0;
                    const remainingPrevious = isLast ? item.previousPeriodSales * (1 - monthProgressRatio) : 0;
                    const fullPrevious = item.previousPeriodSales;
                    
                    const currentHeight = (item.currentPeriodSales / maxValue) * chartHeight;
                    const currY = padding.top + chartHeight - currentHeight;

                    return (
                        <g key={index}>
                            {/* Previous year bar */}
                            {!isLast ? (
                                // Simple single bar for completed months
                                <>
                                    <rect
                                        x={prevX}
                                        y={padding.top + chartHeight - (fullPrevious / maxValue) * chartHeight}
                                        width={barWidth}
                                        height={(fullPrevious / maxValue) * chartHeight}
                                        fill={isHovered ? "#66BB6A" : "var(--chart-1)"}
                                        rx="5"
                                        ry="5"
                                        style={{
                                            cursor: "pointer",
                                            transition: "fill 0.2s ease",
                                            opacity: 0.9,
                                        }}
                                        onMouseEnter={() => setHoveredIndex(index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    />
                                    <text
                                        x={prevX + barWidth / 2}
                                        y={padding.top + chartHeight - (fullPrevious / maxValue) * chartHeight - 8}
                                        textAnchor="middle"
                                        fill="rgba(255, 255, 255, 0.9)"
                                        fontSize="14"
                                        fontWeight="600"
                                        style={{ pointerEvents: "none" }}
                                    >
                                        ${nFormatter(fullPrevious, 2)}
                                    </text>
                                    
                                    {/* Current year bar for completed months */}
                                    <rect
                                        x={currX}
                                        y={currY}
                                        width={barWidth}
                                        height={currentHeight}
                                        fill={isHovered ? "#42A5F5" : "var(--chart-bar)"}
                                        rx="5"
                                        ry="5"
                                        style={{
                                            cursor: "pointer",
                                            transition: "fill 0.2s ease",
                                        }}
                                        onMouseEnter={() => setHoveredIndex(index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    />
                                    <text
                                        x={currX + barWidth / 2}
                                        y={currY - 8}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="15"
                                        fontWeight="700"
                                        style={{ pointerEvents: "none" }}
                                    >
                                        ${nFormatter(item.currentPeriodSales, 2)}
                                    </text>
                                </>
                            ) : (
                                // Stacked bar for current month (partial on bottom, remaining on top)
                                <>
                                    {/* Calculate projection */}
                                    {(() => {
                                        const projectedTotal = item.currentPeriodSales / monthProgressRatio;
                                        const projectedRemaining = projectedTotal - item.currentPeriodSales;
                                        const projectedHeight = (projectedTotal / maxValue) * chartHeight;
                                        const currentBarHeight = currentHeight;
                                        const projectedRemainingHeight = (projectedRemaining / maxValue) * chartHeight;
                                        
                                        return (
                                            <>
                                                {/* Bottom part: Partial (up to current day) */}
                                                <rect
                                                    x={prevX}
                                                    y={padding.top + chartHeight - (partialPrevious / maxValue) * chartHeight}
                                                    width={barWidth}
                                                    height={(partialPrevious / maxValue) * chartHeight}
                                                    fill={isHovered ? "#66BB6A" : "var(--chart-1)"}
                                                    rx="5"
                                                    ry="5"
                                                    style={{
                                                        cursor: "pointer",
                                                        transition: "fill 0.2s ease",
                                                        opacity: 0.9,
                                                    }}
                                                    onMouseEnter={() => setHoveredIndex(index)}
                                                    onMouseLeave={() => setHoveredIndex(null)}
                                                />
                                                {/* Top part: Remaining days - only rounded at top */}
                                                <path
                                                    d={`
                                                        M ${prevX} ${padding.top + chartHeight - (partialPrevious / maxValue) * chartHeight}
                                                        L ${prevX} ${padding.top + chartHeight - (fullPrevious / maxValue) * chartHeight + 5}
                                                        Q ${prevX} ${padding.top + chartHeight - (fullPrevious / maxValue) * chartHeight} ${prevX + 5} ${padding.top + chartHeight - (fullPrevious / maxValue) * chartHeight}
                                                        L ${prevX + barWidth - 5} ${padding.top + chartHeight - (fullPrevious / maxValue) * chartHeight}
                                                        Q ${prevX + barWidth} ${padding.top + chartHeight - (fullPrevious / maxValue) * chartHeight} ${prevX + barWidth} ${padding.top + chartHeight - (fullPrevious / maxValue) * chartHeight + 5}
                                                        L ${prevX + barWidth} ${padding.top + chartHeight - (partialPrevious / maxValue) * chartHeight}
                                                        Z
                                                    `}
                                                    fill={isHovered ? "rgba(102, 187, 106, 0.4)" : "rgba(76, 175, 80, 0.3)"}
                                                    style={{
                                                        cursor: "pointer",
                                                        transition: "fill 0.2s ease",
                                                    }}
                                                    onMouseEnter={() => setHoveredIndex(index)}
                                                    onMouseLeave={() => setHoveredIndex(null)}
                                                />
                                                {/* Label positioning based on partial vs full amount ratio */}
                                                {partialPrevious / fullPrevious > 0.75 ? (
                                                    // If partial is more than 75% of full, put labels inside bars to avoid overlap
                                                    <>
                                                        {/* Full month label - inside the faded top portion */}
                                                        <text
                                                            x={prevX + barWidth / 2}
                                                            y={padding.top + chartHeight - (fullPrevious / maxValue) * chartHeight + 20}
                                                            textAnchor="middle"
                                                            fill="rgba(255, 255, 255, 0.7)"
                                                            fontSize="13"
                                                            fontWeight="500"
                                                            style={{ pointerEvents: "none" }}
                                                        >
                                                            ${nFormatter(fullPrevious, 2)}
                                                        </text>
                                                        {/* Partial amount label - inside the solid bottom portion */}
                                                        <text
                                                            x={prevX + barWidth / 2}
                                                            y={padding.top + chartHeight - (partialPrevious / maxValue) * chartHeight + 20}
                                                            textAnchor="middle"
                                                            fill="white"
                                                            fontSize="14"
                                                            fontWeight="600"
                                                            style={{ pointerEvents: "none" }}
                                                        >
                                                            ${nFormatter(partialPrevious, 2)}
                                                        </text>
                                                    </>
                                                ) : (
                                                    // If partial is less than 75% of full, put labels above bars with safe spacing
                                                    <>
                                                        {/* Full month label at the very top */}
                                                        <text
                                                            x={prevX + barWidth / 2}
                                                            y={padding.top + chartHeight - (fullPrevious / maxValue) * chartHeight - 8}
                                                            textAnchor="middle"
                                                            fill="rgba(255, 255, 255, 0.5)"
                                                            fontSize="13"
                                                            fontWeight="500"
                                                            style={{ pointerEvents: "none" }}
                                                        >
                                                            ${nFormatter(fullPrevious, 2)}
                                                        </text>
                                                        {/* Partial amount label at partial bar top */}
                                                        <text
                                                            x={prevX + barWidth / 2}
                                                            y={padding.top + chartHeight - (partialPrevious / maxValue) * chartHeight - 8}
                                                            textAnchor="middle"
                                                            fill="rgba(255, 255, 255, 0.9)"
                                                            fontSize="14"
                                                            fontWeight="600"
                                                            style={{ pointerEvents: "none" }}
                                                        >
                                                            ${nFormatter(partialPrevious, 2)}
                                                        </text>
                                                    </>
                                                )}

                                                {/* Current period bar (solid, blinking) */}
                                                <rect
                                                    x={currX}
                                                    y={currY}
                                                    width={barWidth}
                                                    height={currentBarHeight}
                                                    fill={isHovered ? "#42A5F5" : "var(--chart-bar)"}
                                                    rx="5"
                                                    ry="5"
                                                    style={{
                                                        cursor: "pointer",
                                                        transition: "fill 0.2s ease",
                                                    }}
                                                    className="bar-blink"
                                                    onMouseEnter={() => setHoveredIndex(index)}
                                                    onMouseLeave={() => setHoveredIndex(null)}
                                                />

                                                {/* Projected remaining (dashed/dotted pattern on top) */}
                                                <path
                                                    d={`
                                                        M ${currX} ${currY}
                                                        L ${currX} ${padding.top + chartHeight - projectedHeight + 5}
                                                        Q ${currX} ${padding.top + chartHeight - projectedHeight} ${currX + 5} ${padding.top + chartHeight - projectedHeight}
                                                        L ${currX + barWidth - 5} ${padding.top + chartHeight - projectedHeight}
                                                        Q ${currX + barWidth} ${padding.top + chartHeight - projectedHeight} ${currX + barWidth} ${padding.top + chartHeight - projectedHeight + 5}
                                                        L ${currX + barWidth} ${currY}
                                                        Z
                                                    `}
                                                    fill="url(#projectionPattern)"
                                                    style={{
                                                        cursor: "pointer",
                                                        opacity: 0.5,
                                                    }}
                                                    onMouseEnter={() => setHoveredIndex(index)}
                                                    onMouseLeave={() => setHoveredIndex(null)}
                                                />

                                                {/* Dashed border to emphasize projection */}
                                                <path
                                                    d={`
                                                        M ${currX} ${currY}
                                                        L ${currX} ${padding.top + chartHeight - projectedHeight + 5}
                                                        Q ${currX} ${padding.top + chartHeight - projectedHeight} ${currX + 5} ${padding.top + chartHeight - projectedHeight}
                                                        L ${currX + barWidth - 5} ${padding.top + chartHeight - projectedHeight}
                                                        Q ${currX + barWidth} ${padding.top + chartHeight - projectedHeight} ${currX + barWidth} ${padding.top + chartHeight - projectedHeight + 5}
                                                        L ${currX + barWidth} ${currY}
                                                    `}
                                                    stroke="var(--chart-bar)"
                                                    strokeWidth="2"
                                                    strokeDasharray="4,4"
                                                    fill="none"
                                                    style={{
                                                        opacity: 0.7,
                                                        pointerEvents: "none",
                                                    }}
                                                />

                                                {/* Current value label */}
                                                {item.currentPeriodSales > 0 && (
                                                    <>
                                                        {currentBarHeight < 40 ? (
                                                            // If bar is too short, put label above
                                                            <text
                                                                x={currX + barWidth / 2}
                                                                y={currY - 8}
                                                                textAnchor="middle"
                                                                fill="white"
                                                                fontSize="15"
                                                                fontWeight="700"
                                                                style={{ pointerEvents: "none" }}
                                                            >
                                                                ${nFormatter(item.currentPeriodSales, 2)}
                                                            </text>
                                                        ) : (
                                                            // If bar is tall enough, put inside
                                                            <text
                                                                x={currX + barWidth / 2}
                                                                y={currY + 20}
                                                                textAnchor="middle"
                                                                fill="white"
                                                                fontSize="15"
                                                                fontWeight="700"
                                                                style={{ pointerEvents: "none" }}
                                                            >
                                                                ${nFormatter(item.currentPeriodSales, 2)}
                                                            </text>
                                                        )}
                                                    </>
                                                )}

                                                {/* Projected value label with indicator */}
                                                <text
                                                    x={currX + barWidth / 2}
                                                    y={padding.top + chartHeight - projectedHeight - 8}
                                                    textAnchor="middle"
                                                    fill="rgba(255, 255, 255, 0.8)"
                                                    fontSize="13"
                                                    fontWeight="500"
                                                    fontStyle="italic"
                                                    style={{ pointerEvents: "none" }}
                                                >
                                                    ~${nFormatter(projectedTotal, 2)}
                                                </text>
                                            </>
                                        );
                                    })()}
                                </>
                            )}

                            {/* X-axis label */}
                            <text
                                x={groupX + (barWidth * 2 + barGap) / 2}
                                y={padding.top + chartHeight + 25}
                                textAnchor="middle"
                                fill="rgba(255, 255, 255, 0.8)"
                                fontSize="14"
                                fontWeight="500"
                                style={{ pointerEvents: "none" }}
                            >
                                {item.periodLabel}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {/* Hover tooltip */}
            {hoveredIndex !== null && (
                <div
                    style={{
                        position: "absolute",
                        top: padding.top - 10,
                        left: padding.left + hoveredIndex * groupWidth + groupWidth / 2,
                        transform: "translateX(-50%)",
                        backgroundColor: "rgba(0, 0, 0, 0.95)",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        pointerEvents: "none",
                        zIndex: 1000,
                        whiteSpace: "nowrap",
                    }}
                >
                    <div style={{ color: "#fff", fontSize: "13px", marginBottom: "6px", fontWeight: 500 }}>
                        {data[hoveredIndex].periodLabel}
                    </div>
                    {hoveredIndex === data.length - 1 ? (
                        <>
                            <div style={{ color: "var(--chart-1)", fontSize: "14px", fontWeight: 600, marginBottom: "2px" }}>
                                Last Year (MTD): ${nFormatter(data[hoveredIndex].previousPeriodSales * monthProgressRatio, 2)}
                            </div>
                            <div style={{ color: "rgba(76, 175, 80, 0.6)", fontSize: "12px", fontWeight: 500, marginBottom: "4px" }}>
                                Remaining: ${nFormatter(data[hoveredIndex].previousPeriodSales * (1 - monthProgressRatio), 2)}
                            </div>
                            <div style={{ color: "var(--chart-bar)", fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>
                                This Year (MTD): ${nFormatter(data[hoveredIndex].currentPeriodSales, 2)}
                            </div>
                            <div style={{ 
                                color: "rgba(255, 255, 255, 0.7)", 
                                fontSize: "13px", 
                                fontWeight: 500,
                                fontStyle: "italic",
                                borderTop: "1px solid rgba(255, 255, 255, 0.2)",
                                paddingTop: "4px",
                                marginTop: "2px"
                            }}>
                                Projected: ~${nFormatter(data[hoveredIndex].currentPeriodSales / monthProgressRatio, 2)}
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ color: "var(--chart-1)", fontSize: "14px", fontWeight: 600, marginBottom: "2px" }}>
                                Last Year: ${nFormatter(data[hoveredIndex].previousPeriodSales, 2)}
                            </div>
                            <div style={{ color: "var(--chart-bar)", fontSize: "15px", fontWeight: 700 }}>
                                This Year: ${nFormatter(data[hoveredIndex].currentPeriodSales, 2)}
                            </div>
                        </>
                    )}
                </div>
            )}

            <style>{`
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                .bar-blink {
                    animation: blink 1.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

/* -------------------------------------- */
/* 📊 SalesByMonthComparisonBar Component */
/* -------------------------------------- */
export default function SalesByMonthComparisonBar() {
    const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
    const visibleMonths = useResponsiveVisibleMonths(containerRef);

    // Calculate date ranges for the current and last year (12-month period).
    const { current, lastYear } = useMemo(
        () => calculateDateRange(12, "monthly"),
        []
    );

    const widgetPayload = useMemo(
        () => ({
            module: "SalesByMonthComparisonBar",
            table: "sumsales",
            columns: [
                "FORMAT(sale_date, 'yyyy-MM') AS period",
                "SUM(sales_dol) AS total",
                "YEAR(sale_date) AS year",
            ],
            filters: `(
        (sale_date >= '${current.start.toISOString().split("T")[0]}' AND sale_date <= '${current.end.toISOString().split("T")[0]}') 
        OR (sale_date >= '${lastYear.start.toISOString().split("T")[0]}' AND sale_date <= '${lastYear.end.toISOString().split("T")[0]}')
      )`,
            group_by: ["FORMAT(sale_date, 'yyyy-MM')", "YEAR(sale_date)"],
            sort: ["period ASC", "year ASC"],
        }),
        [current, lastYear]
    );

    const renderSalesComparison = useCallback(
        (data: SalesData[]) => {
            const groupedData = processSalesData(data, current.periods.slice(-visibleMonths));
            const chartData = prepareChartData(groupedData);
            return <CustomBarChart data={chartData} />;
        },
        [current.periods, visibleMonths]
    );

    return (
        <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
            <Widget
                endpoint="/api/widgets"
                payload={widgetPayload}
                title="Sales by Month (Comparison)"
                refreshInterval={300000}
            >
                {(data, loading) => {
                    if (loading) {
                        return <div className="widget-loading">Loading sales data...</div>;
                    }
                    if (!data || data.length === 0) {
                        return <div className="widget-empty">No sales data available</div>;
                    }
                    return renderSalesComparison(data);
                }}
            </Widget>
        </div>
    );
}