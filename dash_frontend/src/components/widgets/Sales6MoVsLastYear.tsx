// Sales6MoVsLastYear.tsx

import React from "react";
import Widget from "./Widget";
import { BarChart, Bar, XAxis, CartesianGrid, LabelList, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { calculateDateRange, processData, prepareChartData, nFormatter } from "@/utils/helpers";
import config from "@/config";
import { SalesData, ProcessedSalesData } from "@/types";

/* -------------------------------------- */
/* 📊 SalesChart Component                */
/* -------------------------------------- */

const SalesChart = ({ data }: { data: ProcessedSalesData[] }) => {
    if (!data || data.length === 0) {
        return <div>No Data Available</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ChartContainer config={{}}>
                <BarChart
                    accessibilityLayer
                    data={data}
                    margin={{ top: 20 }}
                    className="last-blinking"
                >
                    <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />

                    <Bar dataKey="lastYear" fill="var(--accent-color)" radius={8}>
                        <LabelList
                            position="top"
                            offset={12}
                            className="fill-white"
                            fontSize={16}
                            fontWeight={600}
                            formatter={(value: number) => `$${nFormatter(value, 2)}`}
                        />
                    </Bar>

                    <Bar dataKey="currentYear" fill="var(--primary-color)" radius={8}>
                        <LabelList
                            position="top"
                            offset={12}
                            className="fill-white"
                            fontSize={16}
                            fontWeight={600}
                            formatter={(value: number) => `$${nFormatter(value, 2)}`}
                        />
                    </Bar>
                </BarChart>
            </ChartContainer>
        </ResponsiveContainer>
    );
};

/* -------------------------------------- */
/* 📊 Sales6MoVsLastYear Component        */
/* -------------------------------------- */

export default function Sales6MoVsLastYear() {
    const {
        startDateFormatted,
        endDateFormatted,
        startDateLastYearFormatted,
        endDateLastYearFormatted,
        currentYear,
        lastYear,
        months,
    } = calculateDateRange(6);

    return (
        <Widget
            apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
            payload={{
                table: "sumsales",
                columns: ["FORMAT(sale_date, 'yyyy-MM') AS month", "SUM(sales_dol) AS total", "YEAR(sale_date) AS year"],
                filters: `(
                    (sale_date >= '${startDateFormatted}' AND sale_date <= '${endDateFormatted}') 
                    OR (sale_date >= '${startDateLastYearFormatted}' AND sale_date <= '${endDateLastYearFormatted}')
                )`,
                group_by: ["FORMAT(sale_date, 'yyyy-MM')", "YEAR(sale_date)"],
                sort: ["month ASC", "year ASC"],
            }}
            title="Total Sales (Last 6 Months vs Last Year)"
            updateInterval={300000}
            render={(data: SalesData[]) => {
                const groupedData = processData(data, months);

                const chartData = prepareChartData(groupedData);

                console.log("🚀 Raw API Data:", data);

                // Test Manual Matching
                console.log(
                    "🧪 Current Year Match:",
                    data.find((d) => d.month === "2024-08" && d.year === 2024)
                );

                console.log(
                    "🧪 Last Year Match:",
                    data.find((d) => d.month === "2023-08" && d.year === 2023)
                );

                console.log("📅 Months Array:", months);

                return <SalesChart data={chartData} />;
            }}
        />
    );
}