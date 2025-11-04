import React, { useRef, useState, useEffect, useMemo } from "react";
import Widget from "./Widget";
import { nFormatter } from "@/utils/helpers";
import { format } from "date-fns";
import { SalesData, ProcessedSalesData } from "@/types";

/* -------------------------------------- */
/* 🔎 useResponsiveVisibleDays Hook        */
/* -------------------------------------- */
function useResponsiveVisibleDays(ref: React.RefObject<HTMLDivElement | null>): number {
    const [visibleDays, setVisibleDays] = useState(10);

    useEffect(() => {
        if (!ref.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width >= 1200) setVisibleDays(21);
                else if (width >= 800) setVisibleDays(14);
                else if (width >= 600) setVisibleDays(7);
                else if (width >= 400) setVisibleDays(5);
                else setVisibleDays(3);
            }
        });
        resizeObserver.observe(ref.current);
        return () => {
            resizeObserver.disconnect();
        };
    }, [ref]);

    return visibleDays;
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

    const padding = { top: 32, right: 5, bottom: 38, left: 5 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.map(d => d.currentPeriodSales));
    const barWidth = chartWidth / data.length;
    const barGap = Math.max(barWidth * 0.2, 8);
    const actualBarWidth = barWidth - barGap;

    return (
        <div ref={chartRef} style={{ width: "100%", height: "100%", position: "relative" }}>
            <svg width={dimensions.width} height={dimensions.height} style={{ overflow: "visible" }}>
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
                            stroke="var(--border-light)"
                            strokeWidth="1"
                            opacity="0.3"
                        />
                    );
                })}

                {/* Bars and labels */}
                {data.map((item, index) => {
                    const barHeight = (item.currentPeriodSales / maxValue) * chartHeight;
                    const x = padding.left + index * barWidth + barGap / 2;
                    const y = padding.top + chartHeight - barHeight;
                    const isHovered = hoveredIndex === index;
                    const isLast = index === data.length - 1;

                    return (
                        <g key={index}>
                            {/* Bar */}
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

                            {/* Value label */}
                            <text
                                x={x + actualBarWidth / 2}
                                y={y - 10}
                                textAnchor="middle"
                                fill="var(--text-primary)"
                                fontSize="15"
                                fontWeight="700"
                                style={{ pointerEvents: "none" }}
                            >
                                ${nFormatter(item.currentPeriodSales, 2)}
                            </text>

                            {/* X-axis label */}
                            <text
                                x={x + actualBarWidth / 2}
                                y={padding.top + chartHeight + 20}
                                textAnchor="middle"
                                fill="var(--text-secondary)"
                                fontSize="14"
                                fontWeight="500"
                                style={{ pointerEvents: "none" }}
                            >
                                {item.periodLabel.split(" (")[0]}
                            </text>
                            <text
                                x={x + actualBarWidth / 2}
                                y={padding.top + chartHeight + 38}
                                textAnchor="middle"
                                fill="var(--text-muted)"
                                fontSize="13"
                                fontWeight="400"
                                style={{ pointerEvents: "none" }}
                            >
                                {item.periodLabel.match(/\(([^)]+)\)/)?.[1] || ""}
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
                        backgroundColor: "var(--ui-bg-primary)",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--ui-border-primary)",
                        pointerEvents: "none",
                        zIndex: 1000,
                        whiteSpace: "nowrap",
                        backdropFilter: "blur(12px)",
                    }}
                >
                    <div style={{ color: "var(--ui-text-primary)", fontSize: "13px", marginBottom: "4px" }}>
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
/* 📊 SalesByDayBar Component             */
/* -------------------------------------- */
export default function SalesByDayBar() {
    const containerRef = useRef<HTMLDivElement>(null);
    const visibleDays = useResponsiveVisibleDays(containerRef);

    // Memoize the widget payload.
    const widgetPayload = useMemo(
        () => ({
            module: "SalesByDayBar",
            raw_query: `
        -- Fetch sales data for the last 3 days from orditem
        SELECT 
          FORMAT(duedate, 'yyyy-MM-dd') AS period,
          SUM(ext_price) AS total
        FROM 
          orditem
        WHERE 
          duedate >= DATEADD(DAY, -30, GETDATE()) -- Limit to the last 30 days
          AND duedate >= DATEADD(DAY, -3, GETDATE()) -- Only the last 3 days
          AND duedate <= GETDATE()
        GROUP BY 
          FORMAT(duedate, 'yyyy-MM-dd')

        UNION ALL

        -- Fetch sales data older than 3 days but within 30 days from sumsales
        SELECT 
          FORMAT(sale_date, 'yyyy-MM-dd') AS period,
          SUM(sales_dol) AS total
        FROM 
          sumsales
        WHERE 
          sale_date >= DATEADD(DAY, -30, GETDATE()) -- Limit to the last 30 days
          AND sale_date < DATEADD(DAY, -3, GETDATE()) -- Beyond the last 3 days
          AND sale_date <= GETDATE()
        GROUP BY 
          FORMAT(sale_date, 'yyyy-MM-dd')

        -- Combine and aggregate the data for consistent results
        ORDER BY 
          period ASC;
      `,
        }),
        []
    );

    return (
        <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
            <Widget
                endpoint="/api/widgets"
                payload={widgetPayload}
                title="Sales by Day"
                refreshInterval={60000}
            >
                {(data: SalesData[], loading) => {
                    if (!data || data.length === 0) {
                        return <div className="widget-empty">No sales data available</div>;
                    }

                    // Define a 14-day range ending today.
                    const rangeStart = new Date();
                    rangeStart.setDate(rangeStart.getDate() - 14);
                    const rangeEnd = new Date();

                    // Generate all dates within the range.
                    const allDates: Date[] = [];
                    const currentDate = new Date(rangeStart);
                    while (currentDate <= rangeEnd) {
                        allDates.push(new Date(currentDate));
                        currentDate.setDate(currentDate.getDate() + 1);
                    }

                    // Build the complete dataset with zero sales for missing dates.
                    const chartData: ProcessedSalesData[] = allDates.map((date) => {
                        const formattedDate = format(date, "yyyy-MM-dd");
                        const entry = data.find((item) => item.period === formattedDate);
                        const formattedLabel = `${format(date, "EEE")} (${format(date, "MMM d")})`;
                        return {
                            period: formattedDate,
                            periodLabel: formattedLabel,
                            currentPeriodSales: entry?.total || 0,
                            previousPeriodSales: 0,
                        };
                    });

                    return <CustomBarChart data={chartData.slice(-visibleDays)} />;
                }}
            </Widget>
        </div>
    );
}