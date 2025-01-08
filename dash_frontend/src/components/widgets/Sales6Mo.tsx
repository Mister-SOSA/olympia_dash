import React, { useEffect, useRef, useState } from "react";
import Widget from "./Widget";
import { BarChart, Bar, XAxis, CartesianGrid, LabelList, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { calculateDateRange, nFormatter } from "@/utils/helpers";
import config from "@/config";
import { SalesData } from "@/types";

/* -------------------------------------- */
/* 📊 SalesChart Component                */
/* -------------------------------------- */


const SalesChart = ({ data }: { data: SalesData[] }) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <ChartContainer config={{}}>
                <BarChart data={data} margin={{ top: 20 }}>
                    <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="total" fill="var(--primary-color)" radius={8} isAnimationActive={false}>
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
/* 📊 Sales6Mo Component                  */
/* -------------------------------------- */

export default function Sales6Mo() {
    const { startDateFormatted, endDateFormatted, months } = calculateDateRange(6);

    return (
        <Widget
            apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
            payload={{
                table: "sumsales",
                columns: ["FORMAT(sale_date, 'yyyy-MM') AS month", "SUM(sales_dol) AS total"],
                filters: `(
                    (sale_date >= '${startDateFormatted}' AND sale_date <= '${endDateFormatted}') 
                )`,
                group_by: ["FORMAT(sale_date, 'yyyy-MM')"],
                sort: ["month ASC"],
            }}
            title="Total Sales (Last 6 Months)"
            updateInterval={300000}
            render={(data: SalesData[]) => {
                const chartData = months.map((month) => {
                    const entry = data.find((d) => d.month === month);
                    return {
                        month,
                        total: entry?.total || 0,
                        year: new Date(month).getFullYear(),
                    };
                });

                return <SalesChart data={chartData} />;
            }}
        />
    );
}