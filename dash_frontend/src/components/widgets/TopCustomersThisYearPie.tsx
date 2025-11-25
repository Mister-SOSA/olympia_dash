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
    ChartTooltipContent,
} from "@/components/ui/chart";
import { nFormatter } from "@/utils/helpers";
import config from "@/config";
import { CustomerData } from "@/types";
import { PieChartLegend } from "./PieChartLegend";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";

// Constants
const PARENT_MAPPING = config.PARENT_COMPANY_MAPPING;
const CHART_COLORS = [
    "#4CAF50", // Green
    "#2196F3", // Blue
    "#FFC107", // Amber
    "#FF5722", // Deep Orange
    "#9C27B0", // Purple
    "#E91E63", // Pink
    "#78909C", // Blue Grey (Other)
];

// Map a business name to its parent company using the config mapping.
const mapToParentCompany = (businessName: string): string => {
    if (!businessName) return "Unknown";
    for (const key in PARENT_MAPPING) {
        if (businessName.toUpperCase().includes(key)) {
            return PARENT_MAPPING[key as keyof typeof PARENT_MAPPING];
        }
    }
    return businessName;
};

// Combine data transformation steps into one function.
const processCustomerData = (data: CustomerData[], maxShown: number = 6, showOther: boolean = true): CustomerData[] => {
    if (!data || data.length === 0) return [];

    // Aggregate data by parent company.
    const aggregated: { [key: string]: CustomerData } = {};
    data.forEach(({ businessName, totalSales }) => {
        const parentCompany = mapToParentCompany(businessName || "Unknown");
        if (!aggregated[parentCompany]) {
            aggregated[parentCompany] = {
                id: parentCompany,
                timestamp: new Date(),
                businessName: parentCompany,
                totalSales: 0,
                color: "",
            };
        }
        aggregated[parentCompany].totalSales += totalSales;
    });

    let aggregatedData = Object.values(aggregated);

    // Sort by total sales descending first
    aggregatedData.sort((a, b) => b.totalSales - a.totalSales);

    // Merge entries beyond the limit into an "Other" category if enabled
    if (showOther && aggregatedData.length > maxShown) {
        const otherTotal = aggregatedData
            .slice(maxShown)
            .reduce((acc, { totalSales }) => acc + totalSales, 0);
        aggregatedData = [
            ...aggregatedData.slice(0, maxShown),
            {
                id: "other",
                timestamp: new Date(),
                businessName: "Other",
                totalSales: otherTotal,
                color: CHART_COLORS[CHART_COLORS.length - 1],
            },
        ];
    } else {
        // Just limit to max shown without "Other" category
        aggregatedData = aggregatedData.slice(0, maxShown);
    }

    // Sort so that "Other" is always last and the rest are in descending order.
    aggregatedData.sort((a, b) => {
        if (a.businessName === "Other") return 1;
        if (b.businessName === "Other") return -1;
        return b.totalSales - a.totalSales;
    });

    // Assign colors to each slice - "Other" always gets grey
    return aggregatedData.map((item, index) => ({
        ...item,
        color: item.businessName === "Other"
            ? CHART_COLORS[CHART_COLORS.length - 1] // Grey for Other
            : CHART_COLORS[index] || CHART_COLORS[0],
    }));
};

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

interface ProcessedCustomerData {
    name: string;
    value: number;
    color: string;
    percent: number;
}

interface CustomerPieChartProps {
    data: CustomerData[];
    maxCustomersShown: number;
    showOtherCategory: boolean;
    showPercentages: boolean;
}

// Bar Chart Component for small sizes
const PartitionedBar: React.FC<{ data: ProcessedCustomerData[]; showPercentages: boolean }> = ({ data, showPercentages: showPercents }) => {
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
    const showPercentages = showPercents && barHeight >= 70; // Only show percentages if bar is tall enough and enabled
    const showInlineLabels = showPercents && barHeight >= 90; // Show labels inside bar if tall enough and enabled

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
const CustomerPieChart: React.FC<CustomerPieChartProps> = ({ data, maxCustomersShown, showOtherCategory, showPercentages }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { width, height } = useContainerDimensions(containerRef);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const processedData = useMemo(() => {
        const transformed = processCustomerData(data, maxCustomersShown, showOtherCategory).map((item) => ({
            name: item.businessName,
            value: item.totalSales,
            color: item.color,
            percent: 0,
        }));

        const total = transformed.reduce((sum, item) => sum + item.value, 0);
        return transformed.map((item) => ({
            ...item,
            percent: (item.value / total) * 100,
        }));
    }, [data, maxCustomersShown, showOtherCategory]);

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
                <PartitionedBar data={processedData} showPercentages={showPercentages} />
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
                    <ChartContainer config={{}} className="font-bold customer-pie">
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
                                                {data.percent.toFixed(1)}% of total sales
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

// Main component to render the widget.
export default function TopCustomersThisYearPie() {
    const currentYear = new Date().getFullYear();
    const { settings } = useWidgetSettings('TopCustomersThisYearPie');

    const showOtherCategory = settings.showOtherCategory ?? true;
    const maxCustomersShown = settings.maxCustomersShown ?? 5;
    const showPercentages = settings.showPercentages ?? true;

    const startOfYear = useMemo(
        () => new Date(currentYear, 0, 1).toISOString().split("T")[0],
        [currentYear]
    );
    const today = useMemo(() => new Date().toISOString().split("T")[0], []);

    const widgetPayload = useMemo(
        () => ({
            module: "TopCustomersThisYearPie",
            queryId: "TopCustomersThisYearPie",
            params: {
                startOfYear,
                endDate: today,
            },
        }),
        [startOfYear, today]
    );

    const renderChart = useCallback((data: CustomerData[]) => (
        <CustomerPieChart
            data={data}
            maxCustomersShown={maxCustomersShown}
            showOtherCategory={showOtherCategory}
            showPercentages={showPercentages}
        />
    ), [maxCustomersShown, showOtherCategory, showPercentages]);

    return (
        <Widget
            endpoint="/api/widgets"
            payload={widgetPayload}
            title={`Top Customers - ${currentYear}`}
            refreshInterval={300000}
        >
            {(data, loading) => {
                if (!data || data.length === 0) {
                    return <div className="widget-empty">No customer data available</div>;
                }

                return renderChart(data);
            }}
        </Widget>
    );
}