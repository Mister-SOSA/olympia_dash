import React, { useRef, useState, useEffect, useMemo } from "react";
import Widget from "./Widget";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    CartesianGrid,
    LabelList,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { nFormatter } from "@/utils/helpers";
import { format } from "date-fns";
import { SalesData, ProcessedSalesData } from "@/types";

/* -------------------------------------- */
/* 🔎 useResponsiveVisibleDays Hook        */
/* -------------------------------------- */
/**
 * Determines the number of visible days based on the container's width.
 * - width >= 1200: 21 days
 * - width >= 800: 14 days
 * - width >= 600: 7 days
 * - width >= 400: 5 days
 * - Otherwise: 3 days
 */
function useResponsiveVisibleDays(ref: React.RefObject<HTMLDivElement | null>): number {
    const [visibleDays, setVisibleDays] = useState(10);

    useEffect(() => {
        if (!ref.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width >= 1200) setVisibleDays(21);
                else if (width >= 800) setVisibleDays(14);
                else if (width >= 600) setVisibleDays(7);
                else if (width >= 400) setVisibleDays(5);
                else setVisibleDays(3);
            }
        });
        resizeObserver.observe(ref.current);
        return () => {
            resizeObserver.disconnect();
        };
    }, [ref]);

    return visibleDays;
}

/* -------------------------------------- */
/* 📊 SalesChart Component                */
/* -------------------------------------- */
interface SalesChartProps {
    data: ProcessedSalesData[];
}

const SalesChart: React.FC<SalesChartProps> = ({ data }) => (
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
    const containerRef = useRef<HTMLDivElement>(null);
    const visibleDays = useResponsiveVisibleDays(containerRef);

    // Memoize the widget payload.
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

    return (
        <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
            <Widget
                endpoint="/api/widgets"
                payload={widgetPayload}
                title="Sales by Day"
                refreshInterval={60000}
            >
                {(data: SalesData[], loading) => {
                    if (loading) {
                        return <div className="widget-loading">Loading sales data...</div>;
                    }

                    if (!data || data.length === 0) {
                        return <div className="widget-empty">No sales data available</div>;
                    }

                    // Define a 14-day range ending today.
                    const rangeStart = new Date();
                    rangeStart.setDate(rangeStart.getDate() - 14);
                    const rangeEnd = new Date();

                    // Generate all dates within the range.
                    const allDates: Date[] = [];
                    const currentDate = new Date(rangeStart);
                    while (currentDate <= rangeEnd) {
                        allDates.push(new Date(currentDate));
                        currentDate.setDate(currentDate.getDate() + 1);
                    }

                    // Build the complete dataset with zero sales for missing dates.
                    const chartData: ProcessedSalesData[] = allDates.map((date) => {
                        const formattedDate = format(date, "yyyy-MM-dd");
                        const entry = data.find((item) => item.period === formattedDate);
                        const formattedLabel = `${format(date, "EEE")} (${format(date, "MMM d")})`;
                        return {
                            period: formattedDate,
                            periodLabel: formattedLabel,
                            currentPeriodSales: entry?.total || 0,
                            previousPeriodSales: 0,
                        };
                    });

                    return <SalesChart data={chartData.slice(-visibleDays)} />;
                }}
            </Widget>
        </div>
    );
}