import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Widget from "./Widget";
import { nFormatter } from "@/utils/helpers";

/* -------------------------------------- */
/* 🔎 Responsive Hooks                    */
/* -------------------------------------- */
function useResponsiveConfig(ref: React.RefObject<HTMLDivElement | null>) {
    const [config, setConfig] = useState({
        visibleProducts: 8,
        showPercentages: true,
        showLabels: true,
        showUOM: true,
        compactMode: false,
    });

    useEffect(() => {
        if (!ref.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;

                // Base visible products on height
                let visibleProducts = 8;
                if (height >= 500) visibleProducts = 12;
                else if (height >= 400) visibleProducts = 10;
                else if (height >= 300) visibleProducts = 8;
                else if (height >= 220) visibleProducts = 6;
                else if (height >= 150) visibleProducts = 4;
                else visibleProducts = 3;

                if (width >= 1200 && height >= 300) {
                    setConfig({
                        visibleProducts,
                        showPercentages: true,
                        showLabels: true,
                        showUOM: true,
                        compactMode: false,
                    });
                } else if (width >= 800 && height >= 250) {
                    setConfig({
                        visibleProducts,
                        showPercentages: true,
                        showLabels: true,
                        showUOM: true,
                        compactMode: false,
                    });
                } else if (width >= 500 && height >= 200) {
                    setConfig({
                        visibleProducts,
                        showPercentages: false,
                        showLabels: true,
                        showUOM: true,
                        compactMode: false,
                    });
                } else if (width >= 350 && height >= 180) {
                    setConfig({
                        visibleProducts: Math.min(visibleProducts, 5),
                        showPercentages: false,
                        showLabels: true,
                        showUOM: true,
                        compactMode: true,
                    });
                } else {
                    setConfig({
                        visibleProducts: Math.min(visibleProducts, 3),
                        showPercentages: false,
                        showLabels: false,
                        showUOM: true,
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
interface PutawayData {
    part_code: string;
    lotqty: number;
    uom: string;
}

interface ProcessedProductData {
    product: string;
    quantity: number;
    uom: string;
    percentage: number;
}

/* -------------------------------------- */
/* 📊 Responsive Bar Chart Component      */
/* -------------------------------------- */
interface ResponsiveBarChartProps {
    data: ProcessedProductData[];
    config: {
        showPercentages: boolean;
        showLabels: boolean;
        showUOM: boolean;
        compactMode: boolean;
    };
}

const ResponsiveBarChart: React.FC<ResponsiveBarChartProps> = ({ data, config }) => {
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

    // Calculate padding for horizontal layout
    const topPadding = 15;
    const bottomPadding = 10;

    // Dynamic left padding based on longest product name
    const maxProductNameLength = Math.max(...data.map(d => d.product.length));
    const estimatedLabelWidth = config.compactMode
        ? Math.min(maxProductNameLength * 6, 80)
        : Math.min(maxProductNameLength * 7, 120);

    const leftPadding = config.showLabels ? estimatedLabelWidth + 10 : 15;
    const rightPadding = config.showPercentages ? 50 : 30;

    const padding = {
        top: topPadding,
        right: rightPadding,
        bottom: bottomPadding,
        left: leftPadding
    };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.map(d => d.quantity));
    const barHeight = chartHeight / data.length;
    const barGap = Math.max(barHeight * 0.25, config.compactMode ? 6 : 10);
    const actualBarHeight = barHeight - barGap;

    return (
        <div ref={chartRef} style={{ width: "100%", height: "100%", position: "relative" }}>
            <svg width={dimensions.width} height={dimensions.height} style={{ overflow: "visible" }}>
                {/* Vertical grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const x = padding.left + chartWidth * ratio;
                    return (
                        <line
                            key={i}
                            x1={x}
                            y1={padding.top}
                            x2={x}
                            y2={dimensions.height - padding.bottom}
                            stroke="var(--border-light)"
                            strokeWidth="1"
                            opacity="0.3"
                        />
                    );
                })}

                {/* Horizontal bars and labels */}
                {data.map((item, index) => {
                    const isHovered = hoveredIndex === index;
                    const barWidth = (item.quantity / maxValue) * chartWidth;
                    const y = padding.top + index * barHeight + barGap / 2;
                    const x = padding.left;

                    return (
                        <g key={index}>
                            {/* Bar */}
                            <rect
                                x={x}
                                y={y}
                                width={Math.max(barWidth, 2)}
                                height={actualBarHeight}
                                fill={isHovered ? "#42A5F5" : "var(--chart-6)"}
                                rx={config.compactMode ? "3" : "4"}
                                ry={config.compactMode ? "3" : "4"}
                                style={{
                                    cursor: "pointer",
                                    transition: "fill 0.2s ease, width 0.3s ease",
                                    opacity: 0.95,
                                }}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />

                            {/* Product name label (left side) */}
                            {config.showLabels && (
                                <text
                                    x={padding.left - 8}
                                    y={y + actualBarHeight / 2}
                                    textAnchor="end"
                                    alignmentBaseline="middle"
                                    fill="var(--text-secondary)"
                                    fontSize={config.compactMode ? "10" : "12"}
                                    fontWeight="600"
                                    style={{ pointerEvents: "none" }}
                                >
                                    {item.product}
                                </text>
                            )}

                            {/* UOM label (next to product name) */}
                            {config.showLabels && config.showUOM && (
                                <text
                                    x={padding.left - 8}
                                    y={y + actualBarHeight / 2}
                                    textAnchor="end"
                                    alignmentBaseline="middle"
                                    fill="var(--text-muted)"
                                    fontSize="9"
                                    fontWeight="400"
                                    dy="12"
                                    style={{ pointerEvents: "none" }}
                                >
                                    {item.uom}
                                </text>
                            )}

                            {/* Value label (inside or right of bar) */}
                            {barWidth > 40 ? (
                                // Inside the bar if there's room
                                <text
                                    x={x + barWidth - 8}
                                    y={y + actualBarHeight / 2}
                                    textAnchor="end"
                                    alignmentBaseline="middle"
                                    fill="white"
                                    fontSize={config.compactMode ? "11" : "13"}
                                    fontWeight="700"
                                    style={{ pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                                >
                                    {nFormatter(item.quantity, 1)}
                                </text>
                            ) : (
                                // Outside the bar if too narrow
                                <text
                                    x={x + barWidth + 6}
                                    y={y + actualBarHeight / 2}
                                    textAnchor="start"
                                    alignmentBaseline="middle"
                                    fill="var(--text-primary)"
                                    fontSize={config.compactMode ? "11" : "13"}
                                    fontWeight="700"
                                    style={{ pointerEvents: "none" }}
                                >
                                    {nFormatter(item.quantity, 1)}
                                </text>
                            )}

                            {/* Percentage label (right side) */}
                            {config.showPercentages && (
                                <text
                                    x={dimensions.width - padding.right + 5}
                                    y={y + actualBarHeight / 2}
                                    textAnchor="start"
                                    alignmentBaseline="middle"
                                    fill="var(--text-secondary)"
                                    fontSize="11"
                                    fontWeight="600"
                                    style={{ pointerEvents: "none" }}
                                >
                                    {item.percentage.toFixed(0)}%
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Hover tooltip */}
            {hoveredIndex !== null && (() => {
                const barWidth = (data[hoveredIndex].quantity / maxValue) * chartWidth;
                const y = padding.top + hoveredIndex * barHeight + barGap / 2;
                const tooltipX = Math.min(
                    padding.left + barWidth + 15,
                    dimensions.width - 150
                );

                return (
                    <div
                        style={{
                            position: "absolute",
                            top: y + actualBarHeight / 2,
                            left: tooltipX,
                            transform: "translateY(-50%)",
                            backgroundColor: "var(--ui-bg-primary)",
                            padding: config.compactMode ? "8px 12px" : "10px 14px",
                            borderRadius: "8px",
                            border: "1px solid var(--ui-border-primary)",
                            pointerEvents: "none",
                            zIndex: 1000,
                            whiteSpace: "nowrap",
                            backdropFilter: "blur(12px)",
                            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
                        }}
                    >
                        <div style={{ color: "var(--ui-text-primary)", fontSize: "12px", marginBottom: "6px", fontWeight: 600 }}>
                            {data[hoveredIndex].product}
                        </div>
                        <div style={{ marginBottom: config.showPercentages ? "4px" : "0" }}>
                            <span
                                style={{
                                    color: "var(--chart-6)",
                                    fontSize: "18px",
                                    fontWeight: 700,
                                }}
                            >
                                {nFormatter(data[hoveredIndex].quantity, 2)}
                            </span>
                            <span style={{ color: "var(--text-muted)", fontSize: "12px", marginLeft: "4px" }}>
                                {data[hoveredIndex].uom}
                            </span>
                        </div>
                        {config.showPercentages && (
                            <div style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
                                {data[hoveredIndex].percentage.toFixed(1)}% of production
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
};

/* -------------------------------------- */
/* 📊 DailyProductionPutawaysBar Component */
/* -------------------------------------- */
export default function DailyProductionPutawaysBar() {
    const containerRef = useRef<HTMLDivElement>(null);
    const config = useResponsiveConfig(containerRef);

    // Compute today's date as an ISO string (YYYY-MM-DD)
    const currentDate = useMemo(() => new Date().toISOString().split("T")[0], []);

    // Memoize the widget payload to keep it stable between renders.
    const widgetPayload = useMemo(
        () => ({
            module: "DailyProductionPutawaysBar",
            queryId: "DailyProductionPutawaysBar",
            params: {
                currentDate,
            },
        }),
        [currentDate]
    );

    const renderProductionData = useCallback(
        (data: PutawayData[]) => {
            // Calculate total for percentage calculations
            const totalQuantity = data.reduce((sum, item) => sum + item.lotqty, 0);

            // Process data for visualization
            const processedData: ProcessedProductData[] = data
                .slice(0, config.visibleProducts)
                .map((item) => ({
                    product: item.part_code,
                    quantity: item.lotqty,
                    uom: item.uom,
                    percentage: (item.lotqty / totalQuantity) * 100,
                }));

            return <ResponsiveBarChart data={processedData} config={config} />;
        },
        [config]
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
                                    No Production Today
                                </div>
                                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                                    No putaway data recorded yet
                                </div>
                            </div>
                        );
                    }

                    return renderProductionData(data);
                }}
            </Widget>
        </div>
    );
}