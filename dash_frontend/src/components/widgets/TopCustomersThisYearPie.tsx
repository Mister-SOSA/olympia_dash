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
    ChartLegend,
} from "@/components/ui/chart";
import { nFormatter } from "@/utils/helpers";
import config from "@/config";
import { CustomerData } from "@/types";


// Constants
const PARENT_MAPPING = config.PARENT_COMPANY_MAPPING;
const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--chart-6)",
    "var(--chart-other)",
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

// Custom hook to determine the container's orientation.
function useContainerOrientation(
    ref: React.RefObject<HTMLElement | null>
): "portrait" | "landscape" {
    const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");

    useEffect(() => {
        if (!ref.current) return;

        const updateOrientation = () => {
            const { width, height } = ref.current!.getBoundingClientRect();
            setOrientation(width / 1.1 > height ? "landscape" : "portrait");
        };

        updateOrientation();

        const resizeObserver = new ResizeObserver(updateOrientation);
        resizeObserver.observe(ref.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [ref]);

    return orientation;
}

// Custom label component for the Pie chart.
const CustomLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, value, fill } = props;
    const RADIAN = Math.PI / 180;
    const offset = 30;
    const x = cx + (outerRadius + offset) * Math.cos(-midAngle * RADIAN);
    const y = cy + (outerRadius + offset) * Math.sin(-midAngle * RADIAN);
    const epsilon = 10;
    const textAnchor = Math.abs(x - cx) < epsilon ? "middle" : x > cx ? "start" : "end";

    return (
        <text
            x={x}
            y={y}
            fill={fill}
            fontSize="20"
            textAnchor={textAnchor}
            dominantBaseline="middle"
        >
            ${nFormatter(value, 1)}
        </text>
    );
};

interface CustomerPieChartProps {
    data: CustomerData[];
}

// Component that renders the Pie chart.
const CustomerPieChart: React.FC<CustomerPieChartProps> = ({ data }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const orientation = useContainerOrientation(containerRef);

    const processedData = useMemo(() => processCustomerData(data), [data]);

    if (!processedData.length) {
        return <div>No data available for chart</div>;
    }

    const legendProps: {
        align: "center" | "right";
        layout: "horizontal" | "vertical";
        verticalAlign: "bottom" | "middle";
    } =
        orientation === "portrait"
            ? { align: "center", layout: "horizontal", verticalAlign: "bottom" }
            : { align: "right", layout: "vertical", verticalAlign: "middle" };

    return (
        <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={{}} className="font-bold customer-pie">
                    <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie
                            data={processedData}
                            dataKey="totalSales"
                            nameKey="businessName"
                            innerRadius="35%"
                            outerRadius="55%"
                            paddingAngle={8}
                            label={<CustomLabel />}
                            isAnimationActive={false}
                        >
                            {processedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <ChartLegend {...legendProps} />
                    </PieChart>
                </ChartContainer>
            </ResponsiveContainer>
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
            table: "sumsales",
            columns: [
                "sumsales.cust_code",
                "orderfrom.bus_name AS businessName",
                "SUM(sumsales.sales_dol) AS totalSales",
                "SUM(sumsales.qty_sold) AS total_quantity_sold",
            ],
            filters: `(sumsales.sale_date >= '${startOfYear}' AND sumsales.sale_date <= '${today}')`,
            join: {
                table: "orderfrom",
                on: "sumsales.cust_code = orderfrom.cust_code",
                type: "LEFT",
            },
            group_by: ["sumsales.cust_code", "orderfrom.bus_name"],
            sort: ["totalSales DESC"],
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
                if (loading) {
                    return <div className="widget-loading">Loading customer data...</div>;
                }

                if (!data || data.length === 0) {
                    return <div className="widget-empty">No customer data available</div>;
                }

                return renderChart(data);
            }}
        </Widget>
    );
}