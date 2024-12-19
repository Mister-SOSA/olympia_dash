import React from "react";
import Widget from "./Widget";
import { PieChart, Pie, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { nFormatter } from "@/utils/helpers";
import config from "@/config";
import { CustomerData } from "@/types";

const parentMapping: { [key: string]: string } = config.PARENT_COMPANY_MAPPING;

function mapToParentCompany(busName: string): string {
    for (const key in parentMapping) {
        if (busName.toUpperCase().includes(key)) {
            return parentMapping[key];
        }
    }
    return busName;
}

function transformData(data: CustomerData[]): CustomerData[] {
    const aggregated: { [key: string]: CustomerData } = {};

    data.forEach(({ bus_name, total_sales_dollars }) => {
        const parentCompany = mapToParentCompany(bus_name);

        if (!aggregated[parentCompany]) {
            aggregated[parentCompany] = { bus_name: parentCompany, total_sales_dollars: 0 };
        }
        aggregated[parentCompany].total_sales_dollars += total_sales_dollars;
    });

    return Object.values(aggregated);
}

function mergeRest(data: CustomerData[], limit: number): CustomerData[] {
    if (data.length <= limit) {
        return data;
    }

    const rest: CustomerData = {
        bus_name: "Other",
        total_sales_dollars: data.slice(limit).reduce((acc, { total_sales_dollars }) => acc + total_sales_dollars, 0),
    };

    return [...data.slice(0, limit), rest];
}

function addColors(data: CustomerData[]): CustomerData[] {
    data.forEach((item, index) => {
        item.fill = `var(--chart-${index + 1})`;
    });

    data[data.length - 1].fill = "var(--chart-other)";

    return data;
}

function sortData(data: CustomerData[]): CustomerData[] {
    return data.sort((a, b) => {
        if (a.bus_name === "Other") return 1;
        if (b.bus_name === "Other") return -1;
        return b.total_sales_dollars - a.total_sales_dollars;
    });
}

const CustomerTable = ({ data }: { data: CustomerData[] }) => {
    const processedData = transformData(data); // Process the data before passing it to the chart

    const chartData = processedData.map((item) => ({
        bus_name: item.bus_name,
        total_sales_dollars: item.total_sales_dollars,
    }));

    const limitedData = mergeRest(chartData, 6);

    addColors(limitedData);
    sortData(limitedData);

    console.log(limitedData);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ChartContainer config={{}} className="font-bold text-sm">
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                        data={limitedData}
                        dataKey="total_sales_dollars"
                        nameKey="bus_name"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={8}
                        label={({ name, value }) => `$${nFormatter(value, 2)}`}
                    />
                    <ChartLegend
                        align="center"
                        layout="vertical"
                        verticalAlign="bottom"
                        className="display-flex flex-wrap flex-col"
                    />
                </PieChart>
            </ChartContainer>
        </ResponsiveContainer >
    );
};

export default function TopCustomersThisYear() {
    return (
        <Widget
            apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
            payload={{
                table: "sumsales",
                columns: [
                    "sumsales.cust_code",
                    "orderfrom.bus_name",
                    "SUM(sumsales.sales_dol) AS total_sales_dollars",
                    "SUM(sumsales.qty_sold) AS total_quantity_sold"
                ],
                filters: `(
                    sumsales.sale_date >= '2024-01-01' AND sumsales.sale_date <= '2024-12-31'
                )`,
                join: {
                    table: "orderfrom",
                    on: "sumsales.cust_code = orderfrom.cust_code",
                    type: "LEFT"
                },
                group_by: ["sumsales.cust_code", "orderfrom.bus_name"],
                sort: ["total_sales_dollars DESC"]
            }}
            title="Top Customers This Year"
            updateInterval={300000}
            render={(data: CustomerData[]) => <CustomerTable data={data} />}
        />
    );
}