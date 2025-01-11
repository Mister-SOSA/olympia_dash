import React, { useRef, useState, useEffect } from "react";
import Widget from "./Widget";
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, LabelList } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { calculateDateRange, processSalesData, prepareChartData, nFormatter } from "@/utils/helpers";
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
                    margin={{ top: 30 }}
                    className="last-blinking"
                >
                    <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="periodLabel" tickLine={false} tickMargin={10} axisLine={false} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />

                    <Bar
                        dataKey="previousPeriodSales"
                        fill="var(--chart-1)"
                        radius={8}
                        isAnimationActive={false}
                    >
                        <LabelList
                            position="top"
                            offset={12}
                            className="fill-white"
                            fontSize={16}
                            fontWeight={600}
                            formatter={(value: number) => `$${nFormatter(value, 2)}`}
                        />
                    </Bar>

                    <Bar
                        dataKey="currentPeriodSales"
                        fill="var(--chart-bar)"
                        radius={8}
                        isAnimationActive={false}
                        className="last-blinking"
                    >
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

export default function SalesByMonthComparisonBar() {
    const [visibleMonths, setVisibleMonths] = useState(6); // Default to 6 months
    const containerRef = useRef<HTMLDivElement>(null);

    const { current, lastYear } = calculateDateRange(12, "monthly"); // Fetch 12 months for both years

    useEffect(() => {
        // Dynamically adjust visibleMonths based on container width
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width } = entry.contentRect;

                // Adjust visibleMonths based on width
                if (width >= 1200) setVisibleMonths(9);
                else if (width >= 800) setVisibleMonths(6);
                else if (width >= 400) setVisibleMonths(3);
                else setVisibleMonths(1);
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            if (containerRef.current) {
                resizeObserver.disconnect();
            }
        };
    }, []);

    return (
        <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
            <Widget
                apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
                payload={{
                    table: "sumsales",
                    columns: ["FORMAT(sale_date, 'yyyy-MM') AS period", "SUM(sales_dol) AS total", "YEAR(sale_date) AS year"],
                    filters: `(
                        (sale_date >= '${current.start.toISOString().split("T")[0]}' AND sale_date <= '${current.end.toISOString().split("T")[0]}') 
                        OR (sale_date >= '${lastYear.start.toISOString().split("T")[0]}' AND sale_date <= '${lastYear.end.toISOString().split("T")[0]}')
                    )`,
                    group_by: ["FORMAT(sale_date, 'yyyy-MM')", "YEAR(sale_date)"],
                    sort: ["period ASC", "year ASC"],
                }}
                title="Sales by Month (Comparison)"
                updateInterval={300000}
                render={(data: SalesData[]) => {
                    // Process and prepare data
                    const groupedData = processSalesData(data, current.periods.slice(-visibleMonths));
                    const chartData = prepareChartData(groupedData);

                    return <SalesChart data={chartData} />;
                }}
            />
        </div>
    );
}