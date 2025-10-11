import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Widget from "./Widget";
import { nFormatter } from "@/utils/helpers";
import { SalesData, ProcessedSalesData } from "@/types";

/* -------------------------------------- */
/* 🔎 useResponsiveVisibleMonths Hook      */
/* -------------------------------------- */
function useResponsiveVisibleMonths(ref: React.RefObject<HTMLDivElement | null>): number {
    const [visibleMonths, setVisibleMonths] = useState(6);

    useEffect(() => {
        if (!ref.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width >= 1200) setVisibleMonths(16);
                else if (width >= 800) setVisibleMonths(12);
                else if (width >= 600) setVisibleMonths(9);
                else if (width >= 400) setVisibleMonths(6);
                else setVisibleMonths(3);
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
/* 📊 Custom Bar Chart Component          */
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

    const padding = { top: 32, right: 5, bottom: 32, left: 5 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.map(d => d.currentPeriodSales));
    const barWidth = chartWidth / data.length;
    const barGap = Math.max(barWidth * 0.2, 8);
    const actualBarWidth = barWidth - barGap;

    // Calculate month progress for projection
    const today = new Date();
    const currentDayOfMonth = today.getDate();
    const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthProgressRatio = currentDayOfMonth / daysInCurrentMonth;

    return (
        <div ref={chartRef} style={{ width: "100%", height: "100%", position: "relative" }}>
            <svg width={dimensions.width} height={dimensions.height} style={{ overflow: "visible" }}>
                {/* Define pattern for projection */}
                <defs>
                    <pattern id="projectionPatternMonth" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
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

                    // Calculate projection for the last month
                    const projectedTotal = isLast ? item.currentPeriodSales / monthProgressRatio : 0;
                    const projectedRemaining = isLast ? projectedTotal - item.currentPeriodSales : 0;

                    const barHeight = (item.currentPeriodSales / maxValue) * chartHeight;
                    const projectedHeight = isLast ? (projectedTotal / maxValue) * chartHeight : 0;
                    const projectedRemainingHeight = isLast ? (projectedRemaining / maxValue) * chartHeight : 0;

                    const x = padding.left + index * barWidth + barGap / 2;
                    const y = padding.top + chartHeight - barHeight;

                    return (
                        <g key={index}>
                            {/* Solid bar (actual sales) */}
                            <rect
                                x={x}
                                y={y}
                                width={actualBarWidth}
                                height={barHeight}
                                fill={isHovered ? "#42A5F5" : "var(--chart-bar)"}
                                rx="6"
                                ry="6"
                                style={{
                                    cursor: "pointer",
                                    transition: "fill 0.2s ease",
                                }}
                                className={isLast ? "bar-blink" : ""}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />

                            {/* Projection section for last month */}
                            {isLast && projectedRemaining > 0 && (
                                <>
                                    {/* Projected remaining (striped pattern) */}
                                    <path
                                        d={`
                                            M ${x} ${y}
                                            L ${x} ${padding.top + chartHeight - projectedHeight + 6}
                                            Q ${x} ${padding.top + chartHeight - projectedHeight} ${x + 6} ${padding.top + chartHeight - projectedHeight}
                                            L ${x + actualBarWidth - 6} ${padding.top + chartHeight - projectedHeight}
                                            Q ${x + actualBarWidth} ${padding.top + chartHeight - projectedHeight} ${x + actualBarWidth} ${padding.top + chartHeight - projectedHeight + 6}
                                            L ${x + actualBarWidth} ${y}
                                            Z
                                        `}
                                        fill="url(#projectionPatternMonth)"
                                        style={{
                                            cursor: "pointer",
                                            opacity: 0.5,
                                        }}
                                        onMouseEnter={() => setHoveredIndex(index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    />

                                    {/* Dashed border */}
                                    <path
                                        d={`
                                            M ${x} ${y}
                                            L ${x} ${padding.top + chartHeight - projectedHeight + 6}
                                            Q ${x} ${padding.top + chartHeight - projectedHeight} ${x + 6} ${padding.top + chartHeight - projectedHeight}
                                            L ${x + actualBarWidth - 6} ${padding.top + chartHeight - projectedHeight}
                                            Q ${x + actualBarWidth} ${padding.top + chartHeight - projectedHeight} ${x + actualBarWidth} ${padding.top + chartHeight - projectedHeight + 6}
                                            L ${x + actualBarWidth} ${y}
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
                                </>
                            )}

                            {/* Value labels */}
                            {isLast && projectedRemaining > 0 ? (
                                <>
                                    {/* Current value label */}
                                    {barHeight < 40 ? (
                                        <text
                                            x={x + actualBarWidth / 2}
                                            y={y - 10}
                                            textAnchor="middle"
                                            fill="white"
                                            fontSize="15"
                                            fontWeight="700"
                                            style={{ pointerEvents: "none" }}
                                        >
                                            ${nFormatter(item.currentPeriodSales, 2)}
                                        </text>
                                    ) : (
                                        <text
                                            x={x + actualBarWidth / 2}
                                            y={y + 20}
                                            textAnchor="middle"
                                            fill="white"
                                            fontSize="15"
                                            fontWeight="700"
                                            style={{ pointerEvents: "none" }}
                                        >
                                            ${nFormatter(item.currentPeriodSales, 2)}
                                        </text>
                                    )}

                                    {/* Projected value label (always above) */}
                                    <text
                                        x={x + actualBarWidth / 2}
                                        y={padding.top + chartHeight - projectedHeight - 10}
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
                            ) : (
                                <text
                                    x={x + actualBarWidth / 2}
                                    y={y - 10}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="15"
                                    fontWeight="700"
                                    style={{ pointerEvents: "none" }}
                                >
                                    ${nFormatter(item.currentPeriodSales, 2)}
                                </text>
                            )}

                            {/* X-axis label */}
                            <text
                                x={x + actualBarWidth / 2}
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
                        top: padding.top + chartHeight - (data[hoveredIndex].currentPeriodSales / maxValue) * chartHeight - 60,
                        left: padding.left + hoveredIndex * barWidth + barWidth / 2,
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
                    <div style={{ color: "#fff", fontSize: "13px", marginBottom: "4px" }}>
                        {data[hoveredIndex].periodLabel}
                    </div>
                    <div style={{ color: "var(--chart-bar)", fontSize: "16px", fontWeight: 700 }}>
                        ${nFormatter(data[hoveredIndex].currentPeriodSales, 2)}
                    </div>
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
/* 📊 SalesByMonthBar Component           */
/* -------------------------------------- */
export default function SalesByMonthBar() {
    const containerRef = useRef<HTMLDivElement>(null);
    const visibleMonths = useResponsiveVisibleMonths(containerRef);

    const widgetPayload = useMemo(
        () => ({
            module: "SalesByMonthBar",
            table: "sumsales",
            columns: ["FORMAT(sale_date, 'yyyy-MM') AS period", "SUM(sales_dol) AS total"],
            filters: `(sale_date >= DATEADD(MONTH, -12, GETDATE()) AND sale_date <= GETDATE())`,
            group_by: ["FORMAT(sale_date, 'yyyy-MM')"],
            sort: ["period ASC"],
        }),
        []
    );

    const renderSalesByMonth = useCallback(
        (data: SalesData[]) => {
            const chartData = data.slice(-visibleMonths).map((entry) => {
                const [year, month] = entry.period.split("-");
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const monthIndex = parseInt(month, 10) - 1;
                const monthLabel = `${monthNames[monthIndex]} ${year.slice(-2)}`;

                return {
                    period: entry.period,
                    periodLabel: monthLabel,
                    currentPeriodSales: entry.total || 0,
                    previousPeriodSales: 0,
                };
            });
            return <CustomBarChart data={chartData} />;
        },
        [visibleMonths]
    );

    return (
        <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
            <Widget
                endpoint="/api/widgets"
                payload={widgetPayload}
                title="Sales by Month"
                refreshInterval={300000}
            >
                {(data, loading) => {
                    if (!data || data.length === 0) {
                        return <div className="widget-empty">No sales data available</div>;
                    }

                    return renderSalesByMonth(data);
                }}
            </Widget>
        </div>
    );
}