import React, { useRef, useState, useEffect } from "react";
import Widget from "./Widget";
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, LabelList } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { nFormatter } from "@/utils/helpers";
import { format } from "date-fns";
import config from "@/config";
import { SalesData, ProcessedSalesData } from "@/types";

/* -------------------------------------- */
/* 📊 SalesChart Component                */
/* -------------------------------------- */

const SalesChart = ({ data }: { data: ProcessedSalesData[] }) => (
    console.log(data),
    <ResponsiveContainer width="100%" height="100%">
        <ChartContainer config={{}}>
            <BarChart data={data} margin={{ top: 30 }}>
                <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="periodLabel" tickLine={false} tickMargin={10} axisLine={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
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

/* -------------------------------------- */
/* 📊 SalesByDayBar Component             */
/* -------------------------------------- */

export default function SalesByDayBar() {
    const [visibleDays, setVisibleDays] = useState(10); // Default to 10 days
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Dynamically adjust visibleDays based on container width
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width } = entry.contentRect;

                // Dynamically adjust visibleDays based on width
                if (width >= 800) setVisibleDays(10);
                else if (width >= 600) setVisibleDays(7);
                else if (width >= 400) setVisibleDays(5);
                else setVisibleDays(3);
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
                    columns: ["FORMAT(sale_date, 'yyyy-MM-dd') AS period", "SUM(sales_dol) AS total"],
                    filters: `(sale_date >= DATEADD(DAY, -14, GETDATE()) AND sale_date <= GETDATE())`,
                    group_by: ["FORMAT(sale_date, 'yyyy-MM-dd')"],
                    sort: ["period ASC"],
                }}
                title="Sales by Day"
                updateInterval={300000}
                render={(data: SalesData[]) => {
                    const rangeStart = new Date();
                    rangeStart.setDate(rangeStart.getDate() - 14); // Start of the 14-day range
                    const rangeEnd = new Date(); // Today

                    // Generate all dates in the range
                    const allDates = [];
                    for (let d = rangeStart; d <= rangeEnd; d.setDate(d.getDate() + 1)) {
                        allDates.push(new Date(d));
                    }

                    // Create a complete dataset with zero sales for missing days
                    const chartData = allDates.map((date) => {
                        const formattedDate = format(date, "yyyy-MM-dd");
                        const entry = data.find((item) => item.period === formattedDate);
                        const formattedLabel = `${format(date, "EEE")} (${format(date, "MMM d")})`; // Format: Sun (Jan 1)

                        return {
                            period: formattedDate,
                            periodLabel: formattedLabel,
                            currentPeriodSales: entry?.total || 0,
                            previousPeriodSales: 0, // Add a default value for previousPeriodSales
                        };
                    });

                    return <SalesChart data={chartData.slice(-visibleDays)} />;
                }}
            />
        </div>
    );
}