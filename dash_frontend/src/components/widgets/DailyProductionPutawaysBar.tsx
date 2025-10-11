import React, { useEffect, useRef, useState, useMemo } from "react";
import Widget from "./Widget";
import { nFormatter } from "@/utils/helpers";

interface PutawayData {
    part_code: string;
    lotqty: number;
    uom: string;
}

/* -------------------------------------- */
/* 📊 Custom Bar Chart Component          */
/* -------------------------------------- */
const CustomBarChart = ({ data }: { data: { product: string; putaways: number }[] }) => {
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

    const padding = { top: 40, right: 15, bottom: 50, left: 15 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.map(d => d.putaways));
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
                            stroke="rgba(255, 255, 255, 0.08)"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Bars and labels */}
                {data.map((item, index) => {
                    const barHeight = (item.putaways / maxValue) * chartHeight;
                    const x = padding.left + index * barWidth + barGap / 2;
                    const y = padding.top + chartHeight - barHeight;
                    const isHovered = hoveredIndex === index;

                    return (
                        <g key={index}>
                            {/* Bar */}
                            <rect
                                x={x}
                                y={y}
                                width={actualBarWidth}
                                height={barHeight}
                                fill={isHovered ? "#F06292" : "var(--chart-6)"}
                                rx="6"
                                ry="6"
                                style={{
                                    cursor: "pointer",
                                    transition: "fill 0.2s ease",
                                    opacity: 0.95,
                                }}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />

                            {/* Value label */}
                            <text
                                x={x + actualBarWidth / 2}
                                y={y - 10}
                                textAnchor="middle"
                                fill="white"
                                fontSize="15"
                                fontWeight="700"
                                style={{ pointerEvents: "none" }}
                            >
                                {nFormatter(item.putaways, 2)}
                            </text>

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
                                {item.product}
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
                        top: padding.top + chartHeight - (data[hoveredIndex].putaways / maxValue) * chartHeight - 60,
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
                        {data[hoveredIndex].product}
                    </div>
                    <div style={{ color: "var(--chart-6)", fontSize: "16px", fontWeight: 700 }}>
                        {nFormatter(data[hoveredIndex].putaways, 2)} units
                    </div>
                </div>
            )}
        </div>
    );
};

export default function DailyProductionPutawaysBar() {
    const [visibleCategories, setVisibleCategories] = useState(6);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width >= 800) setVisibleCategories(12);
                else if (width >= 600) setVisibleCategories(9);
                else if (width >= 500) setVisibleCategories(6);
                else setVisibleCategories(3);
            }
        });
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        return () => {
            if (containerRef.current) {
                resizeObserver.disconnect();
            }
        };
    }, []);

    // Compute today's date as an ISO string (YYYY-MM-DD)
    const currentDate = useMemo(() => new Date().toISOString().split("T")[0], []);

    // Memoize the widget payload to keep it stable between renders.
    const widgetPayload = useMemo(
        () => ({
            module: "DailyProductionPutawaysBar",
            table: "putaway",
            columns: [
                "part_code",
                "SUM(lotqty) AS lotqty",
                "MAX(uom) AS uom"
            ],
            filters: `recdat = '${currentDate}' AND source_type = 'MF'`,
            group_by: ["part_code"],
            sort: "lotqty DESC",
        }),
        [currentDate]
    );

    return (
        <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
            <Widget
                endpoint="/api/widgets"
                payload={widgetPayload}
                title="Daily Production Putaways"
                refreshInterval={15000}
            >
                {(data: PutawayData[], loading) => {
                    if (!data || data.length === 0) {
                        return <div className="widget-empty">No putaway data available</div>;
                    }
                    // Transform the data to match the chart's expected keys.
                    const transformedData = data.map((item) => ({
                        product: item.part_code,
                        putaways: item.lotqty,
                    }));
                    return <CustomBarChart data={transformedData.slice(0, visibleCategories)} />;
                }}
            </Widget>
        </div>
    );
}