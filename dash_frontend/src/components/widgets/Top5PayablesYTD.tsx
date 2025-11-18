import React, {
    useMemo,
    useCallback,
    useState,
    useEffect,
    useRef,
} from "react";
import Widget from "./Widget";
import { PieChart, Pie, ResponsiveContainer, Cell } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
} from "@/components/ui/chart";
import { nFormatter } from "@/utils/helpers";
import { PayablesData } from "@/types";
import { PieChartLegend } from "./PieChartLegend";

// Chart colors matching TopCustomersThisYearPie
const CHART_COLORS = [
    "#4CAF50", // Green
    "#2196F3", // Blue
    "#FFC107", // Amber
    "#FF5722", // Deep Orange
    "#9C27B0", // Purple
    "#E91E63", // Pink
    "#78909C", // Blue Grey (Other)
];

// Hook to track container dimensions
function useContainerDimensions(ref: React.RefObject<HTMLElement | null>) {
    const [dimensions, setDimensions] = useState({
        width: 0,
        height: 0,
    });

    useEffect(() => {
        if (!ref.current) return;

        const updateDimensions = () => {
            const { width, height } = ref.current!.getBoundingClientRect();
            setDimensions({ width, height });
        };

        updateDimensions();
        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(ref.current);

        return () => resizeObserver.disconnect();
    }, [ref]);

    return dimensions;
}

// Intelligent layout calculator
function calculateOptimalLayout(width: number, height: number, itemCount: number) {
    const aspectRatio = width / height;

    // Check if we should use bar layout (small cards or very wide)
    const minPieSize = 180; // Minimum acceptable pie diameter
    const useBarLayout = height < 200 || width < 300 || (aspectRatio > 2.5 && height < 250);

    if (useBarLayout) {
        return {
            type: "bar" as const,
            position: "bottom" as const,
            legendSize: 0,
            pieSize: 0,
        };
    }

    // Calculate space requirements for each layout option

    // Option 1: Legend on right (vertical)
    const rightLegendWidth = 200; // Fixed width for vertical legend
    const rightLayoutPieSpace = width - rightLegendWidth - 32; // 32px for gaps/padding
    const rightLayoutPieHeight = height - 16;
    const rightLayoutPieSize = Math.min(rightLayoutPieSpace, rightLayoutPieHeight);
    const rightLayoutScore = rightLayoutPieSize >= minPieSize ? rightLayoutPieSize : 0;

    // Option 2: Legend on bottom (horizontal)
    const bottomLegendHeight = 100; // Fixed height for horizontal wrapped legend
    const bottomLayoutPieWidth = width - 16;
    const bottomLayoutPieSpace = height - bottomLegendHeight - 32; // 32px for gaps/padding
    const bottomLayoutPieSize = Math.min(bottomLayoutPieSpace, bottomLayoutPieWidth);
    const bottomLayoutScore = bottomLayoutPieSize >= minPieSize ? bottomLayoutPieSize : 0;

    // Choose layout with largest pie size
    if (rightLayoutScore > bottomLayoutScore && aspectRatio > 1.2 && width > 500) {
        return {
            type: "pie" as const,
            position: "right" as const,
            legendSize: rightLegendWidth,
            pieSize: rightLayoutPieSize,
        };
    } else {
        return {
            type: "pie" as const,
            position: "bottom" as const,
            legendSize: bottomLegendHeight,
            pieSize: bottomLayoutPieSize,
        };
    }
}

interface ProcessedPayablesData {
    name: string;
    value: number;
    color: string;
    percent: number;
}

interface PayablesPieChartProps {
    data: PayablesData[];
}

// Bar Chart Component for small sizes
const PartitionedBar: React.FC<{ data: ProcessedPayablesData[] }> = ({ data }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [availableHeight, setAvailableHeight] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const updateHeight = () => {
            const { height } = containerRef.current!.getBoundingClientRect();
            setAvailableHeight(height);
        };
        updateHeight();
        const resizeObserver = new ResizeObserver(updateHeight);
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Intelligent text shortening for readability
    const shortenName = (name: string, maxLength: number = 20): string => {
        if (name.length <= maxLength) return name;

        // Remove common business suffixes
        const cleaned = name
            .replace(/,?\s+(INC\.?|LLC\.?|CORP\.?|CORPORATION|LIMITED|LTD\.?|CO\.?)$/i, '')
            .trim();

        if (cleaned.length <= maxLength) return cleaned;

        // Extract initials from multi-word names if still too long
        const words = cleaned.split(/\s+/);
        if (words.length > 2 && cleaned.length > maxLength) {
            // Keep first word + initials (e.g., "AMERICAN EAGLE PACKAGING" -> "AMERICAN E.P.")
            return words[0] + ' ' + words.slice(1).map(w => w[0] + '.').join('');
        }

        return cleaned.substring(0, maxLength) + '...';
    };

    // Calculate optimal bar height based on available space
    const barHeight = Math.min(Math.max(availableHeight * 0.4, 50), 120);
    const showPercentages = barHeight >= 70; // Only show percentages if bar is tall enough
    const showInlineLabels = barHeight >= 90; // Show labels inside bar if tall enough

    return (
        <div ref={containerRef} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.625rem", padding: "0.5rem" }}>
            {/* Bar */}
            <div style={{ display: "flex", width: "100%", height: `${barHeight}px`, borderRadius: "0.5rem", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                {data.map((item, index) => (
                    <div
                        key={index}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        style={{
                            flex: item.percent,
                            backgroundColor: item.color,
                            opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.4,
                            transition: "opacity 0.2s ease",
                            cursor: "pointer",
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.25rem",
                            padding: "0.25rem",
                        }}
                        title={`${item.name}: $${nFormatter(item.value, 2)} (${item.percent.toFixed(1)}%)`}
                    >
                        {showInlineLabels && item.percent > 12 && (
                            <>
                                <span style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    color: "rgba(255, 255, 255, 0.95)",
                                    textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                                    lineHeight: 1.1,
                                    textAlign: "center",
                                    maxWidth: "100%",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}>
                                    {shortenName(item.name, 15)}
                                </span>
                                <span style={{
                                    fontSize: "1rem",
                                    fontWeight: 800,
                                    color: "rgba(255, 255, 255, 0.98)",
                                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                                }}>
                                    {Math.round(item.percent)}%
                                </span>
                            </>
                        )}
                        {!showInlineLabels && showPercentages && item.percent > 8 && (
                            <span style={{
                                fontSize: "0.875rem",
                                fontWeight: 700,
                                color: "rgba(255, 255, 255, 0.95)",
                                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                            }}>
                                {Math.round(item.percent)}%
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Labels */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem", justifyContent: "center", alignItems: "center" }}>
                {data.map((item, index) => (
                    <div
                        key={index}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            cursor: "pointer",
                            opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.4,
                            transition: "opacity 0.2s ease",
                            padding: "0.125rem 0",
                        }}
                    >
                        <div style={{
                            width: "0.75rem",
                            height: "0.75rem",
                            borderRadius: "0.125rem",
                            backgroundColor: item.color,
                            flexShrink: 0,
                            boxShadow: hoveredIndex === index ? `0 0 0 2px ${item.color}50` : 'none',
                            transition: "box-shadow 0.2s ease",
                        }} />
                        <span style={{
                            fontSize: "0.8125rem",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            letterSpacing: "-0.01em",
                        }}>
                            {shortenName(item.name)}
                        </span>
                        <span style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                            fontWeight: 600,
                        }}>
                            ${nFormatter(item.value, 1)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Main chart component with intelligent layout
const PayablesPieChart: React.FC<PayablesPieChartProps> = ({ data }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { width, height } = useContainerDimensions(containerRef);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const processedData = useMemo(() => {
        // Sort by total_pay_value descending
        const sortedData = [...data]
            .sort((a, b) => b.total_pay_value - a.total_pay_value);

        const total = sortedData.reduce((sum, item) => sum + item.total_pay_value, 0);

        // Map to processed format - without colors yet
        const processed = sortedData.slice(0, 6).map((item) => ({
            name: item.vend_name_group,
            value: item.total_pay_value,
            color: "", // Will assign after sorting
            percent: (item.total_pay_value / total) * 100,
        }));

        // Sort so "Other" is always last, others by value descending
        processed.sort((a, b) => {
            if (a.name.toUpperCase() === "OTHER") return 1;
            if (b.name.toUpperCase() === "OTHER") return -1;
            return b.value - a.value;
        });

        // Assign colors after sorting - "Other" always gets grey
        return processed.map((item, index) => ({
            ...item,
            color: item.name.toUpperCase() === "OTHER"
                ? CHART_COLORS[CHART_COLORS.length - 1] // Grey for Other
                : CHART_COLORS[index] || CHART_COLORS[0],
        }));
    }, [data]);

    // Calculate optimal layout
    const layout = useMemo(
        () => calculateOptimalLayout(width, height, processedData.length),
        [width, height, processedData.length]
    );

    if (!processedData.length) {
        return <div>No data available for chart</div>;
    }

    // Use bar layout for small cards
    if (layout.type === "bar") {
        return (
            <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
                <PartitionedBar data={processedData} />
            </div>
        );
    }

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    const onPieLeave = () => {
        setActiveIndex(null);
    };

    const handleLegendClick = (index: number) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    const isRightLayout = layout.position === "right";

    // Calculate pie radius based on available space
    const pieRadius = layout.pieSize > 350 ? "75%" : layout.pieSize > 250 ? "72%" : "68%";

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: isRightLayout ? "row" : "column",
                gap: "1rem",
                padding: "0.5rem",
            }}
        >
            {/* Pie Chart Container */}
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <ChartContainer config={{}} className="font-bold payables-pie">
                        <PieChart>
                            <ChartTooltip
                                animationDuration={0}
                                isAnimationActive={false}
                                content={({ active, payload }) => {
                                    if (!active || !payload || !payload.length) return null;
                                    const data = payload[0].payload;
                                    return (
                                        <div
                                            style={{
                                                backgroundColor: "var(--ui-bg-primary)",
                                                border: "1px solid var(--ui-border-primary)",
                                                borderRadius: "0.5rem",
                                                padding: "0.875rem",
                                                backdropFilter: "blur(12px)",
                                                boxShadow: "0 4px 12px var(--shadow-dark)",
                                            }}
                                        >
                                            <div style={{
                                                fontWeight: 700,
                                                marginBottom: "0.375rem",
                                                fontSize: "0.9375rem",
                                                color: "var(--ui-text-primary)",
                                            }}>
                                                {data.name}
                                            </div>
                                            <div style={{
                                                color: "var(--ui-text-primary)",
                                                fontSize: "1rem",
                                                fontWeight: 600,
                                                marginBottom: "0.25rem",
                                            }}>
                                                ${nFormatter(data.value, 2)}
                                            </div>
                                            <div
                                                style={{
                                                    color: "var(--ui-text-secondary)",
                                                    fontSize: "0.8125rem",
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {data.percent.toFixed(1)}% of total payables
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                            <Pie
                                data={processedData}
                                cx="50%"
                                cy="50%"
                                innerRadius="42%"
                                outerRadius={pieRadius}
                                paddingAngle={1}
                                dataKey="value"
                                onMouseEnter={onPieEnter}
                                onMouseLeave={onPieLeave}
                                isAnimationActive={false}
                            >
                                {processedData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        opacity={
                                            activeIndex === null || activeIndex === index ? 1 : 0.3
                                        }
                                        style={{
                                            transition: "opacity 0.2s ease",
                                            cursor: "pointer",
                                            stroke: "var(--background-light)",
                                            strokeWidth: 2,
                                        }}
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                </ResponsiveContainer>
            </div>

            {/* Legend Container */}
            <div
                style={{
                    width: isRightLayout ? `${layout.legendSize}px` : "100%",
                    height: isRightLayout ? "100%" : `${layout.legendSize}px`,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: isRightLayout ? "stretch" : "center",
                    minHeight: 0,
                }}
            >
                <PieChartLegend
                    data={processedData}
                    activeIndex={activeIndex}
                    onItemClick={handleLegendClick}
                    position={layout.position}
                />
            </div>
        </div>
    );
};

/* -------------------------------------- */
/* Top5PayablesYTD Component              */
/* -------------------------------------- */
export default function Top5PayablesYTD() {
    // Memoize the widget payload via the query registry.
    const widgetPayload = useMemo(
        () => ({
            module: "Top5PayablesYTD",
            queryId: "Top5PayablesYTD"
        }),
        []
    );

    const renderChart = useCallback((data: PayablesData[]) => (
        <PayablesPieChart data={data} />
    ), []);

    return (
        <Widget
            endpoint="/api/widgets"
            payload={widgetPayload}
            title="Top 5 Payables YTD"
            refreshInterval={300000}
        >
            {(data, loading) => {
                if (!data || data.length === 0) {
                    return <div className="widget-empty">No payables data available</div>;
                }
                return renderChart(data);
            }}
        </Widget>
    );
}
