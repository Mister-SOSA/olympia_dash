import React from "react";
import Widget from "./Widget";
import { BarChart, Bar, XAxis, CartesianGrid, LabelList, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { calculateDates, processData, nFormatter } from "@/utils/helpers";
import config from "@/config";

interface SalesData {
    month: string;
    total: number;
    year: number;
}

const SalesChart = ({ data }: { data: SalesData[] }) => {
    const { currentYear } = calculateDates();
    const groupedData = React.useMemo(() => processData(data, currentYear), [data, currentYear]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ChartContainer config={{}}>
                <BarChart accessibilityLayer data={groupedData} margin={{ top: 20 }} className="last-blinking">
                    <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
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

export default function Sales6Mo() {
    const {
        sixMonthsAgoFormatted,
        endOfMonthFormatted,
    } = calculateDates();

    return (
        <Widget
            apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
            payload={{
                table: "sumsales",
                columns: ["FORMAT(sale_date, 'yyyy-MM') AS month", "SUM(sales_dol) AS total", "YEAR(sale_date) AS year"],
                filters: `(
                    (sale_date >= '${sixMonthsAgoFormatted}' AND sale_date <= '${endOfMonthFormatted}') 
                )`,
                group_by: ["FORMAT(sale_date, 'yyyy-MM')", "YEAR(sale_date)"],
                sort: ["month ASC", "year ASC"],
            }}
            title="Total Sales (6 Months)"
            updateInterval={300000}
            render={(data: SalesData[]) => <SalesChart data={data} />}
        />
    );
}