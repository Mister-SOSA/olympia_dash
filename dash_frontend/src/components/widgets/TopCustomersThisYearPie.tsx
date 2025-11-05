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
const processCustomerData = (data: CustomerData[]): CustomerData[] => {
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

    // Merge entries beyond the top 6 into an "Other" category.
    const LIMIT = 6;
    if (aggregatedData.length > LIMIT) {
        const otherTotal = aggregatedData
            .slice(LIMIT)
            .reduce((acc, { totalSales }) => acc + totalSales, 0);
        aggregatedData = [
            ...aggregatedData.slice(0, LIMIT),
            {
                id: "other",
                timestamp: new Date(),
                businessName: "Other",
                totalSales: otherTotal,
                color: CHART_COLORS[CHART_COLORS.length - 1],
            },
        ];
    }

    // Sort so that "Other" is always last and the rest are in descending order.
    aggregatedData.sort((a, b) => {
        if (a.businessName === "Other") return 1;
        if (b.businessName === "Other") return -1;
        return b.totalSales - a.totalSales;
    });

    // Assign colors to each slice.
    return aggregatedData.map((item, index) => ({
        ...item,
        color: CHART_COLORS[index] || CHART_COLORS[CHART_COLORS.length - 1],
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

    // Calculate space requirements for each layout option
    const minPieSize = 180; // Minimum acceptable pie diameter

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
            position: "right" as const,
            legendSize: rightLegendWidth,
            pieSize: rightLayoutPieSize,
        };
    } else {
        return {
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
}

// Main chart component with intelligent layout
const CustomerPieChart: React.FC<CustomerPieChartProps> = ({ data }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { width, height } = useContainerDimensions(containerRef);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const processedData = useMemo(() => {
        const transformed = processCustomerData(data).map((item) => ({
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
    }, [data]);

    // Calculate optimal layout
    const layout = useMemo(
        () => calculateOptimalLayout(width, height, processedData.length),
        [width, height, processedData.length]
    );

    if (!processedData.length) {
        return <div>No data available for chart</div>;
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
        <CustomerPieChart data={data} />
    ), []);

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