import React from "react";
import Widget from "./Widget";
import { PieChart, Pie, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
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

const CustomerTable = ({ data }: { data: CustomerData[] }) => {
    const processedData = transformData(data); // Process the data before passing it to the chart

    // Map processed data to a format suitable for the pie chart
    const chartData = processedData.map((item) => ({
        name: item.bus_name,
        value: item.total_sales_dollars,
    }));
    return (
        <ResponsiveContainer width="100%" height="100%">
            <ChartContainer config={{}}>
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={100}
                        fill="var(--primary-color)"
                        label={({ name, value }) => `${name}: $${nFormatter(value, 2)}`}
                    />
                </PieChart>
            </ChartContainer>
        </ResponsiveContainer>
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
                limit: 8,
                sort: ["total_sales_dollars DESC"]
            }}
            title="Top Customers This Year"
            updateInterval={300000}
            render={(data: CustomerData[]) => <CustomerTable data={data} />}
        />
    );
}