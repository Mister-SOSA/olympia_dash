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

/* -------------------------------------- */
/* 🛠️ Utility Functions                  */
/* -------------------------------------- */

const parentMapping: { [key: string]: string } = config.PARENT_COMPANY_MAPPING;

function mapToParentCompany(businessName: string): string {
    if (!businessName) {
        return "Unknown";
    }
    for (const key in parentMapping) {
        if (businessName.toUpperCase().includes(key)) {
            return parentMapping[key];
        }
    }
    return businessName;
}

function transformData(data: CustomerData[]): CustomerData[] {
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
    return Object.values(aggregated);
}

function mergeRest(data: CustomerData[], limit: number): CustomerData[] {
    if (data.length <= limit) {
        return data;
    }
    const rest: CustomerData = {
        id: "other",
        timestamp: new Date(),
        businessName: "Other",
        totalSales: data.slice(limit).reduce((acc, { totalSales }) => acc + totalSales, 0),
        color: "var(--chart-other)",
    };
    return [...data.slice(0, limit), rest];
}

function addColors(data: CustomerData[]): CustomerData[] {
    const chartColors = [
        "var(--chart-1)",
        "var(--chart-2)",
        "var(--chart-3)",
        "var(--chart-4)",
        "var(--chart-5)",
        "var(--chart-6)",
        "var(--chart-other)",
    ];
    return data.map((item, index) => ({
        ...item,
        color: chartColors[index] || "var(--chart-other)",
    }));
}

function sortData(data: CustomerData[]): CustomerData[] {
    return data.sort((a, b) => {
        if (a.businessName === "Other") return 1;
        if (b.businessName === "Other") return -1;
        return b.totalSales - a.totalSales;
    });
}

/* -------------------------------------- */
/* 🔎 Custom Hook for Container Orientation */
/* -------------------------------------- */
/**
 * Measures the container’s dimensions and returns "portrait" if the container’s
 * height is greater than or equal to its width, or "landscape" otherwise.
 */
function useContainerOrientation(
    ref: React.RefObject<HTMLElement | null>
): "portrait" | "landscape" {
    const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");

    useEffect(() => {
        if (!ref.current) return;
        const updateOrientation = () => {
            const rect = ref.current!.getBoundingClientRect();
            setOrientation(rect.width / 1.1 > rect.height ? "landscape" : "portrait");
        };

        // Initial orientation update
        updateOrientation();

        // Create a ResizeObserver to watch for container size changes
        const resizeObserver = new ResizeObserver(() => {
            updateOrientation();
        });
        resizeObserver.observe(ref.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [ref]);

    return orientation;
}

/* -------------------------------------- */
/* 📊 CustomerTable Component             */
/* -------------------------------------- */
const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, value, fill } = props;
    const RADIAN = Math.PI / 180;
    const offset = 30; // How far away from the pie edge you want the label

    // Compute label x and y based on the slice's mid angle and offset.
    const x = cx + (outerRadius + offset) * Math.cos(-midAngle * RADIAN);
    const y = cy + (outerRadius + offset) * Math.sin(-midAngle * RADIAN);

    // If x is nearly equal to cx (for top and bottom labels), use "middle".
    const epsilon = 10; // Adjust if necessary depending on your chart size
    const textAnchor =
        Math.abs(x - cx) < epsilon ? "middle" : x > cx ? "start" : "end";

    return (
        <text
            x={x}
            y={y}
            fill={fill} // use the slice's color
            fontSize="20"
            textAnchor={textAnchor}
            dominantBaseline="middle" // vertically centers the text
        >
            ${nFormatter(value, 1)}
        </text>
    );
};


const CustomerTable = ({ data }: { data: CustomerData[] }) => {
    // Use a ref to measure the container’s dimensions.
    const containerRef = useRef<HTMLDivElement>(null);
    const orientation = useContainerOrientation(containerRef);

    const processedData = useMemo(() => {
        if (!data || data.length === 0) {
            console.warn("No data received for CustomerTable");
            return [];
        }
        const aggregatedData = transformData(data);
        const limitedData = mergeRest(aggregatedData, 6);
        const coloredData = addColors(limitedData);
        return sortData(coloredData);
    }, [data]);

    if (processedData.length === 0) {
        return <div>No data available for chart</div>;
    }

    // Adjust legend props based on container orientation.
    const legendProps =
        orientation === "portrait"
            ? ({ align: "center", layout: "horizontal", verticalAlign: "bottom" } as const)
            : ({ align: "right", layout: "vertical", verticalAlign: "middle" } as const);

    return (
        // The outer div uses the ref so we can measure its size.
        <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
            {/* Remove the fixed aspect ratio so that the chart fills the container */}
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
                            label={renderCustomLabel}
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

/* -------------------------------------- */
/* 📊 TopCustomersThisYear Component       */
/* -------------------------------------- */
export default function TopCustomersThisYearPie() {
    const startOfYear = useMemo(
        () =>
            new Date(new Date().getFullYear(), 0, 1)
                .toISOString()
                .split("T")[0],
        []
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
            filters: `(
          sumsales.sale_date >= '${startOfYear}' AND sumsales.sale_date <= '${today}'
      )`,
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

    const renderTopCustomers = useCallback((data: CustomerData[]) => {
        return <CustomerTable data={data} />;
    }, []);

    return (
        <Widget
            apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
            payload={widgetPayload}
            title={`Top Customers - ${new Date().getFullYear()}`}
            updateInterval={300000}
            render={renderTopCustomers}
        />
    );
}