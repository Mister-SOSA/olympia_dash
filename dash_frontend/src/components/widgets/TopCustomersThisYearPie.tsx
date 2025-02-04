import React, { useMemo, useCallback } from "react";
import Widget from "./Widget";
import { PieChart, Pie, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart";
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
            aggregated[parentCompany] = { id: parentCompany, timestamp: new Date(), businessName: parentCompany, totalSales: 0, color: "" };
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
/* 📊 CustomerTable Component             */
/* -------------------------------------- */
const CustomerTable = ({ data }: { data: CustomerData[] }) => {
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

    return (
        <ResponsiveContainer>
            <ChartContainer config={{}} className="font-bold customer-pie">
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                        data={processedData}
                        dataKey="totalSales"
                        nameKey="businessName"
                        innerRadius={"40%"}
                        outerRadius={"65%"}
                        paddingAngle={8}
                        label={({ name, value }) => `$${nFormatter(value, 2)}`}
                        isAnimationActive={false}
                    >
                        {processedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <ChartLegend align="right" layout="vertical" verticalAlign="middle" />
                </PieChart>
            </ChartContainer>
        </ResponsiveContainer>
    );
};

/* -------------------------------------- */
/* 📊 TopCustomersThisYear Component       */
/* -------------------------------------- */
export default function TopCustomersThisYearPie() {
    const startOfYear = useMemo(() => new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0], []);
    const today = useMemo(() => new Date().toISOString().split("T")[0], []);

    const widgetPayload = useMemo(
        () => ({
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
        console.log("Data received from API:", data);
        return <CustomerTable data={data} />;
    }, []);

    return (
        <Widget
            apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
            payload={widgetPayload}
            title="Top Customers This Year"
            updateInterval={300000}
            render={renderTopCustomers}
        />
    );
}