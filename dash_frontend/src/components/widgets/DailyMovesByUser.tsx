import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Widget from "./Widget";
import { nFormatter } from "@/utils/helpers";

/* -------------------------------------- */
/* 🔎 useResponsiveVisibleUsers Hook      */
/* -------------------------------------- */
function useResponsiveVisibleUsers(ref: React.RefObject<HTMLDivElement | null>): number {
    const [visibleUsers, setVisibleUsers] = useState(6);

    useEffect(() => {
        if (!ref.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width >= 1200) setVisibleUsers(16);
                else if (width >= 800) setVisibleUsers(12);
                else if (width >= 600) setVisibleUsers(9);
                else if (width >= 400) setVisibleUsers(6);
                else setVisibleUsers(3);
            }
        });

        resizeObserver.observe(ref.current);
        return () => {
            resizeObserver.disconnect();
        };
    }, [ref]);

    return visibleUsers;
}

/* -------------------------------------- */
/* 📊 Custom Bar Chart Component          */
/* -------------------------------------- */
interface MovesByUserData {
    user_id: number;
    moves: number;
}

interface ProcessedUserData {
    user: number;
    moves: number;
}

interface CustomBarChartProps {
    data: ProcessedUserData[];
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

    const maxValue = Math.max(...data.map(d => d.moves));
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
                    const isHovered = hoveredIndex === index;
                    const barHeight = (item.moves / maxValue) * chartHeight;
                    const x = padding.left + index * barWidth + barGap / 2;
                    const y = padding.top + chartHeight - barHeight;

                    return (
                        <g key={index}>
                            {/* Bar */}
                            <rect
                                x={x}
                                y={y}
                                width={actualBarWidth}
                                height={barHeight}
                                fill={isHovered ? "#42A5F5" : "var(--chart-6)"}
                                rx="6"
                                ry="6"
                                style={{
                                    cursor: "pointer",
                                    transition: "fill 0.2s ease",
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
                                {nFormatter(item.moves, 2)}
                            </text>

                            {/* X-axis label (User ID) */}
                            <text
                                x={x + actualBarWidth / 2}
                                y={padding.top + chartHeight + 25}
                                textAnchor="middle"
                                fill="rgba(255, 255, 255, 0.8)"
                                fontSize="14"
                                fontWeight="500"
                                style={{ pointerEvents: "none" }}
                            >
                                {item.user}
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
                        top: padding.top + chartHeight - (data[hoveredIndex].moves / maxValue) * chartHeight - 60,
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
                        User {data[hoveredIndex].user}
                    </div>
                    <div style={{ color: "var(--chart-6)", fontSize: "16px", fontWeight: 700 }}>
                        {nFormatter(data[hoveredIndex].moves, 2)} moves
                    </div>
                </div>
            )}
        </div>
    );
};

/* -------------------------------------- */
/* 📊 DailyMovesByUser Component          */
/* -------------------------------------- */
export default function DailyMovesByUser() {
    const containerRef = useRef<HTMLDivElement>(null);
    const visibleUsers = useResponsiveVisibleUsers(containerRef);

    // Compute today's date as an ISO string (YYYY-MM-DD)
    const currentDate = useMemo(() => new Date().toISOString().split("T")[0], []);

    // Memoize the widget payload to keep it stable between renders.
    const widgetPayload = useMemo(
        () => ({
            module: "DailyMovesByUser",
            table: "inadjinf",
            columns: ["user_id", "COUNT(*) as moves"],
            group_by: ["inadjinf.user_id"],
            filters: `trans_date = '${currentDate}' AND user_id != 'AUTO'`,
            sort: "moves DESC",
        }),
        [currentDate]
    );

    const renderMovesByUser = useCallback(
        (data: MovesByUserData[]) => {
            const chartData = data.slice(0, visibleUsers).map((item) => ({
                user: item.user_id,
                moves: item.moves,
            }));
            return <CustomBarChart data={chartData} />;
        },
        [visibleUsers]
    );

    return (
        <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
            <Widget
                endpoint="/api/widgets"
                payload={widgetPayload}
                title="Daily Moves By User"
                refreshInterval={5000}
            >
                {(data: MovesByUserData[], loading) => {
                    if (!data || data.length === 0) {
                        return <div className="widget-empty">No user moves data available</div>;
                    }

                    return renderMovesByUser(data);
                }}
            </Widget>
        </div>
    );
}