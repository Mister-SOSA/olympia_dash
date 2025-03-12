import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
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

    // Adjust visibleDays based on container width
    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width } = entry.contentRect;
                if (width >= 1200) setVisibleDays(21);
                else if (width >= 800) setVisibleDays(14);
                else if (width >= 600) setVisibleDays(7);
                else if (width >= 400) setVisibleDays(5);
                else setVisibleDays(3);
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // Memoize the payload so its reference does not change on every render.
    const widgetPayload = useMemo(
        () => ({
            module: "SalesByDayBar",
            raw_query: `
                -- Fetch sales data for the last 3 days from orditem
                SELECT 
                    FORMAT(duedate, 'yyyy-MM-dd') AS period,
                    SUM(ext_price) AS total
                FROM 
                    orditem
                WHERE 
                    duedate >= DATEADD(DAY, -30, GETDATE()) -- Limit to the last 30 days
                    AND duedate >= DATEADD(DAY, -3, GETDATE()) -- Only the last 3 days
                    AND duedate <= GETDATE()
                GROUP BY 
                    FORMAT(duedate, 'yyyy-MM-dd')

                UNION ALL

                -- Fetch sales data older than 3 days but within 30 days from sumsales
                SELECT 
                    FORMAT(sale_date, 'yyyy-MM-dd') AS period,
                    SUM(sales_dol) AS total
                FROM 
                    sumsales
                WHERE 
                    sale_date >= DATEADD(DAY, -30, GETDATE()) -- Limit to the last 30 days
                    AND sale_date < DATEADD(DAY, -3, GETDATE()) -- Beyond the last 3 days
                    AND sale_date <= GETDATE()
                GROUP BY 
                    FORMAT(sale_date, 'yyyy-MM-dd')

                -- Combine and aggregate the data for consistent results
                ORDER BY 
                    period ASC;
            `,
        }),
        []
    );

    // Memoize the render function to prevent unnecessary re-creations.
    const renderSalesData = useCallback((data: SalesData[]) => {
        const rangeStart = new Date();
        rangeStart.setDate(rangeStart.getDate() - 14); // Start of the 14-day range
        const rangeEnd = new Date(); // Today

        // Generate all dates in the range
        const allDates: Date[] = [];
        const currentDate = new Date(rangeStart);
        while (currentDate <= rangeEnd) {
            allDates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Create a complete dataset with zero sales for missing days
        const chartData = allDates.map((date) => {
            const formattedDate = format(date, "yyyy-MM-dd");
            const entry = data.find((item) => item.period === formattedDate);
            const formattedLabel = `${format(date, "EEE")} (${format(date, "MMM d")})`;
            return {
                period: formattedDate,
                periodLabel: formattedLabel,
                currentPeriodSales: entry?.total || 0,
                previousPeriodSales: 0, // Default value for previousPeriodSales
            };
        });

        return <SalesChart data={chartData.slice(-visibleDays)} />;
    }, [visibleDays]);

    return (
        <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
            <Widget
                apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
                payload={widgetPayload}
                title="Sales by Day"
                updateInterval={60000}
                render={renderSalesData}
            />
        </div>
    );
}