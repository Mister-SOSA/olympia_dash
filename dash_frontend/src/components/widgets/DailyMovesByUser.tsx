import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Widget from "./Widget";
import { nFormatter } from "@/utils/helpers";

/* -------------------------------------- */
/* 🔎 Responsive Hooks                    */
/* -------------------------------------- */
function useResponsiveConfig(ref: React.RefObject<HTMLDivElement | null>) {
    const [config, setConfig] = useState({
        visibleUsers: 8,
        showSummary: true,
        showPercentages: true,
        showLabels: true,
        compactMode: false,
    });

    useEffect(() => {
        if (!ref.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;

                // Determine configuration based on size
                if (width >= 1200 && height >= 300) {
                    setConfig({
                        visibleUsers: 20,
                        showSummary: true,
                        showPercentages: true,
                        showLabels: true,
                        compactMode: false,
                    });
                } else if (width >= 800 && height >= 250) {
                    setConfig({
                        visibleUsers: 15,
                        showSummary: true,
                        showPercentages: true,
                        showLabels: true,
                        compactMode: false,
                    });
                } else if (width >= 500 && height >= 200) {
                    setConfig({
                        visibleUsers: 10,
                        showSummary: true,
                        showPercentages: false,
                        showLabels: true,
                        compactMode: false,
                    });
                } else if (width >= 350 && height >= 180) {
                    setConfig({
                        visibleUsers: 6,
                        showSummary: false,
                        showPercentages: false,
                        showLabels: true,
                        compactMode: true,
                    });
                } else {
                    // Very small widget
                    setConfig({
                        visibleUsers: 4,
                        showSummary: false,
                        showPercentages: false,
                        showLabels: false,
                        compactMode: true,
                    });
                }
            }
        });

        resizeObserver.observe(ref.current);
        return () => {
            resizeObserver.disconnect();
        };
    }, [ref]);

    return config;
}

/* -------------------------------------- */
/* 📊 Data Types                          */
/* -------------------------------------- */
interface MovesByUserData {
    user_id: number;
    moves: number;
}

interface ProcessedUserData {
    user: number;
    moves: number;
    percentage: number;
}

interface SummaryStats {
    totalMoves: number;
    activeUsers: number;
    averageMoves: number;
}

/* -------------------------------------- */
/* 📊 Responsive Bar Chart Component      */
/* -------------------------------------- */
interface ResponsiveBarChartProps {
    data: ProcessedUserData[];
    summary: SummaryStats;
    config: {
        showSummary: boolean;
        showPercentages: boolean;
        showLabels: boolean;
        compactMode: boolean;
    };
}

const ResponsiveBarChart: React.FC<ResponsiveBarChartProps> = ({ data, summary, config }) => {
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

    // Calculate padding based on what's being shown
    const summaryHeight = config.showSummary ? 55 : 0;
    const topPadding = config.showSummary ? summaryHeight + 35 : (config.showPercentages ? 35 : 25);
    const bottomPadding = config.showLabels ? (config.compactMode ? 25 : 40) : 15;

    const padding = {
        top: topPadding,
        right: 8,
        bottom: bottomPadding,
        left: 8
    };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.map(d => d.moves));
    const barWidth = chartWidth / data.length;
    const barGap = Math.max(barWidth * 0.15, config.compactMode ? 4 : 6);
    const actualBarWidth = barWidth - barGap;

    return (
        <div ref={chartRef} style={{ width: "100%", height: "100%", position: "relative" }}>
            {/* Summary Statistics - Only show if config allows */}
            {config.showSummary && (
                <div
                    style={{
                        position: "absolute",
                        top: "8px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        gap: "16px",
                        backgroundColor: "var(--ui-bg-secondary)",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        border: "1px solid var(--ui-border-primary)",
                        zIndex: 10,
                        fontSize: "12px",
                    }}
                >
                    <div style={{ textAlign: "center" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "10px", marginBottom: "3px" }}>
                            Total
                        </div>
                        <div style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 700 }}>
                            {nFormatter(summary.totalMoves, 2)}
                        </div>
                    </div>
                    <div style={{ width: "1px", backgroundColor: "var(--ui-border-primary)" }} />
                    <div style={{ textAlign: "center" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "10px", marginBottom: "3px" }}>
                            Users
                        </div>
                        <div style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 700 }}>
                            {summary.activeUsers}
                        </div>
                    </div>
                    <div style={{ width: "1px", backgroundColor: "var(--ui-border-primary)" }} />
                    <div style={{ textAlign: "center" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "10px", marginBottom: "3px" }}>
                            Avg
                        </div>
                        <div style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 700 }}>
                            {nFormatter(summary.averageMoves, 1)}
                        </div>
                    </div>
                </div>
            )}

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
                                height={Math.max(barHeight, 2)}
                                fill={isHovered ? "#42A5F5" : "var(--chart-6)"}
                                rx={config.compactMode ? "3" : "5"}
                                ry={config.compactMode ? "3" : "5"}
                                style={{
                                    cursor: "pointer",
                                    transition: "fill 0.2s ease",
                                    opacity: 0.95,
                                }}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />

                            {/* Value label - only show if not compact or bar is tall enough */}
                            {(!config.compactMode || barHeight > 20) && (
                                <text
                                    x={x + actualBarWidth / 2}
                                    y={y - (config.showPercentages ? 6 : 8)}
                                    textAnchor="middle"
                                    fill="var(--text-primary)"
                                    fontSize={config.compactMode ? "11" : "14"}
                                    fontWeight="700"
                                    style={{ pointerEvents: "none" }}
                                >
                                    {nFormatter(item.moves, 1)}
                                </text>
                            )}

                            {/* Percentage label - only show if config allows */}
                            {config.showPercentages && (
                                <text
                                    x={x + actualBarWidth / 2}
                                    y={y - 20}
                                    textAnchor="middle"
                                    fill="var(--text-secondary)"
                                    fontSize="10"
                                    fontWeight="500"
                                    style={{ pointerEvents: "none" }}
                                >
                                    {item.percentage.toFixed(0)}%
                                </text>
                            )}

                            {/* User ID label - only show if config allows */}
                            {config.showLabels && (
                                <text
                                    x={x + actualBarWidth / 2}
                                    y={padding.top + chartHeight + (config.compactMode ? 14 : 20)}
                                    textAnchor="middle"
                                    fill="var(--text-secondary)"
                                    fontSize={config.compactMode ? "11" : "13"}
                                    fontWeight="600"
                                    style={{ pointerEvents: "none" }}
                                >
                                    #{item.user}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Hover tooltip */}
            {hoveredIndex !== null && (
                <div
                    style={{
                        position: "absolute",
                        top: Math.max(
                            10,
                            padding.top + chartHeight - (data[hoveredIndex].moves / maxValue) * chartHeight - 70
                        ),
                        left: padding.left + hoveredIndex * barWidth + barWidth / 2,
                        transform: "translateX(-50%)",
                        backgroundColor: "var(--ui-bg-primary)",
                        padding: config.compactMode ? "8px 12px" : "12px 16px",
                        borderRadius: "8px",
                        border: "1px solid var(--ui-border-primary)",
                        pointerEvents: "none",
                        zIndex: 1000,
                        whiteSpace: "nowrap",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
                    }}
                >
                    <div style={{ color: "var(--ui-text-primary)", fontSize: "12px", marginBottom: "6px" }}>
                        User #{data[hoveredIndex].user}
                    </div>
                    <div style={{ marginBottom: config.showPercentages ? "4px" : "0" }}>
                        <span
                            style={{
                                color: "var(--chart-6)",
                                fontSize: "18px",
                                fontWeight: 700,
                            }}
                        >
                            {nFormatter(data[hoveredIndex].moves, 2)}
                        </span>
                        <span style={{ color: "var(--text-muted)", fontSize: "12px", marginLeft: "4px" }}>
                            moves
                        </span>
                    </div>
                    {config.showPercentages && (
                        <div style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
                            {data[hoveredIndex].percentage.toFixed(1)}% of total
                        </div>
                    )}
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
    const config = useResponsiveConfig(containerRef);

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
            // Calculate summary statistics
            const totalMoves = data.reduce((sum, item) => sum + item.moves, 0);
            const activeUsers = data.length;
            const averageMoves = totalMoves / activeUsers;

            const summary: SummaryStats = {
                totalMoves,
                activeUsers,
                averageMoves,
            };

            // Process data for visualization
            const processedData: ProcessedUserData[] = data.slice(0, config.visibleUsers).map((item) => ({
                user: item.user_id,
                moves: item.moves,
                percentage: (item.moves / totalMoves) * 100,
            }));

            return <ResponsiveBarChart data={processedData} summary={summary} config={config} />;
        },
        [config]
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
                        return (
                            <div
                                className="widget-empty"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100%",
                                    gap: "8px",
                                }}
                            >
                                <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-secondary)" }}>
                                    No Activity Today
                                </div>
                                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                                    No user moves recorded yet
                                </div>
                            </div>
                        );
                    }

                    return renderMovesByUser(data);
                }}
            </Widget>
        </div>
    );
}