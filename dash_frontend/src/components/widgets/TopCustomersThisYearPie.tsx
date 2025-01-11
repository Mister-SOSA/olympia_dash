import React, { useState, useEffect, useRef } from "react";
import Widget from "./Widget";
import { PieChart, Pie, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { nFormatter } from "@/utils/helpers";
import config from "@/config";
import { CustomerData } from "@/types";

/* -------------------------------------- */
/* 🛠️ Utility Functions                  */
/* -------------------------------------- */

/**
 * Maps a business name to its parent company using config mappings.
 */
const parentMapping: { [key: string]: string } = config.PARENT_COMPANY_MAPPING;

function mapToParentCompany(businessName: string): string {
    if (!businessName) {
        return "Unknown"; // Default value for undefined or missing business names
    }

    for (const key in parentMapping) {
        if (businessName.toUpperCase().includes(key)) {
            return parentMapping[key];
        }
    }

    return businessName;
}

/**
 * Aggregates sales data by parent company.
 */
function transformData(data: CustomerData[]): CustomerData[] {
    const aggregated: { [key: string]: CustomerData } = {};

    data.forEach(({ businessName, totalSales }) => {
        const parentCompany = mapToParentCompany(businessName || "Unknown");

        if (!aggregated[parentCompany]) {
            aggregated[parentCompany] = { id: parentCompany, timestamp: new Date(), businessName: parentCompany, totalSales: 0, color: "" };
        }
        aggregated[parentCompany].totalSales += totalSales;
    });

    return Object.values(aggregated);
}

/**
 * Merges remaining data into an "Other" category if exceeding the limit.
 */
function mergeRest(data: CustomerData[], limit: number): CustomerData[] {
    if (data.length <= limit) {
        return data;
    }

    const rest: CustomerData = {
        id: "other",
        timestamp: new Date(),
        businessName: "Other",
        totalSales: data.slice(limit).reduce((acc, { totalSales }) => acc + totalSales, 0),
        color: "var(--chart-other)"
    };

    return [...data.slice(0, limit), rest];
}

/**
 * Adds colors to each data point, ensuring consistent and predictable styling.
 */
function addColors(data: CustomerData[]): CustomerData[] {
    const chartColors = [
        "var(--chart-1)",
        "var(--chart-2)",
        "var(--chart-3)",
        "var(--chart-4)",
        "var(--chart-5)",
        "var(--chart-6)",
        "var(--chart-other)", // Ensure "Other" has a specific color
    ];

    return data.map((item, index) => {
        return {
            ...item,
            color: chartColors[index] || "var(--chart-other)", // Default to "Other" color if out of bounds
        };
    });
}

/**
 * Sorts data, ensuring "Other" is always last.
 */
function sortData(data: CustomerData[]): CustomerData[] {
    return data.sort((a, b) => {
        if (a.businessName === "Other") return 1;
        if (b.businessName === "Other") return -1;
        return b.totalSales - a.totalSales;
    });
}

/* -------------------------------------- */
/* 📊 CustomerTable Component            */
/* -------------------------------------- */

const CustomerTable = ({ data }: { data: CustomerData[] }) => {
    const [isLandscape, setIsLandscape] = useState(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    // Function to calculate and set the aspect ratio
    const updateAspectRatio = () => {
        if (chartContainerRef.current) {
            const { offsetWidth, offsetHeight } = chartContainerRef.current;
            setIsLandscape(offsetWidth / offsetHeight > 1.5); // Landscape if aspect ratio > 1
        }
    };

    // Use ResizeObserver to monitor changes in the container size
    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            updateAspectRatio();
        });

        if (chartContainerRef.current) {
            resizeObserver.observe(chartContainerRef.current);
        }

        return () => {
            if (chartContainerRef.current) {
                resizeObserver.unobserve(chartContainerRef.current);
            }
        };
    }, []);

    const processedData = React.useMemo(() => {
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

    return (
        <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }}>
            <ResponsiveContainer>
                <ChartContainer
                    config={{}}
                    className="font-bold customer-pie"
                >
                    <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie
                            data={processedData}
                            dataKey="totalSales"
                            nameKey="businessName"
                            innerRadius={"45%"}
                            outerRadius={"65%"}
                            paddingAngle={8}
                            label={({ name, value }) => `$${nFormatter(value, 2)}`}
                            isAnimationActive={false}
                            fontSize={isLandscape ? 16 : 12}
                        >
                            {processedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <ChartLegend
                            align={isLandscape ? "right" : "center"}
                            layout={"vertical"}
                            verticalAlign={isLandscape ? "middle" : "bottom"}
                            className="display-flex flex-wrap flex-col"
                        />
                    </PieChart>
                </ChartContainer>
            </ResponsiveContainer>
        </div>
    );
};


/* -------------------------------------- */
/* 📊 TopCustomersThisYear Component      */
/* -------------------------------------- */

export default function TopCustomersThisYearPie() {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    return (
        <Widget
            apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
            payload={{
                table: "sumsales",
                columns: [
                    "sumsales.cust_code",
                    "orderfrom.bus_name AS businessName",
                    "SUM(sumsales.sales_dol) AS totalSales",
                    "SUM(sumsales.qty_sold) AS total_quantity_sold"
                ],
                filters: `(
                    sumsales.sale_date >= '${startOfYear}' AND sumsales.sale_date <= '${today}'
                )`,
                join: {
                    table: "orderfrom",
                    on: "sumsales.cust_code = orderfrom.cust_code",
                    type: "LEFT"
                },
                group_by: ["sumsales.cust_code", "orderfrom.bus_name"],
                sort: ["totalSales DESC"]
            }}
            title="Top Customers This Year"
            updateInterval={300000}
            render={(data: CustomerData[]) => {
                console.log("Data received from API:", data);
                return <CustomerTable data={data} />;
            }}
        />
    );
}
