import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Widget from "./Widget";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    CartesianGrid,
    LabelList,
} from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import {
    calculateDateRange,
    processSalesData,
    prepareChartData,
    nFormatter,
} from "@/utils/helpers";
import { SalesData, ProcessedSalesData } from "@/types";


/* -------------------------------------- */
/* 🔎 useResponsiveVisibleMonths Hook      */
/* -------------------------------------- */
/**
 * Determines the number of visible months based on the container width.
 */
function useResponsiveVisibleMonths(ref: React.RefObject<HTMLDivElement>): number {
    const [visibleMonths, setVisibleMonths] = useState(6);

    useEffect(() => {
        if (!ref.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width } = entry.contentRect;
                if (width >= 1200) setVisibleMonths(9);
                else if (width >= 800) setVisibleMonths(6);
                else if (width >= 400) setVisibleMonths(3);
                else setVisibleMonths(1);
            }
        });
        resizeObserver.observe(ref.current);
        return () => {
            resizeObserver.disconnect();
        };
    }, [ref]);

    return visibleMonths;
}

/* -------------------------------------- */
/* 📊 SalesChart Component                */
/* -------------------------------------- */
interface SalesChartProps {
    data: ProcessedSalesData[];
}

const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div>No Data Available</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ChartContainer config={{}}>
                <BarChart data={data} margin={{ top: 30 }} className="last-blinking">
                    <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis
                        dataKey="periodLabel"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                    />
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
/* 📊 SalesByMonthComparisonBar Component */
/* -------------------------------------- */
export default function SalesByMonthComparisonBar() {
    const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
    const visibleMonths = useResponsiveVisibleMonths(containerRef);

    // Calculate date ranges for the current and last year (12-month period).
    const { current, lastYear } = useMemo(
        () => calculateDateRange(12, "monthly"),
        []
    );

    const widgetPayload = useMemo(
        () => ({
            module: "SalesByMonthComparisonBar",
            table: "sumsales",
            columns: [
                "FORMAT(sale_date, 'yyyy-MM') AS period",
                "SUM(sales_dol) AS total",
                "YEAR(sale_date) AS year",
            ],
            filters: `(
        (sale_date >= '${current.start.toISOString().split("T")[0]}' AND sale_date <= '${current.end.toISOString().split("T")[0]}') 
        OR (sale_date >= '${lastYear.start.toISOString().split("T")[0]}' AND sale_date <= '${lastYear.end.toISOString().split("T")[0]}')
      )`,
            group_by: ["FORMAT(sale_date, 'yyyy-MM')", "YEAR(sale_date)"],
            sort: ["period ASC", "year ASC"],
        }),
        [current, lastYear]
    );

    const renderSalesComparison = useCallback(
        (data: SalesData[]) => {
            const groupedData = processSalesData(data, current.periods.slice(-visibleMonths));
            const chartData = prepareChartData(groupedData);
            return <SalesChart data={chartData} />;
        },
        [current.periods, visibleMonths]
    );

    return (
        <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
            <Widget
                endpoint="/api/widgets"
                payload={widgetPayload}
                title="Sales by Month (Comparison)"
                refreshInterval={300000}
            >
                {(data, loading) => {
                    if (loading) {
                        return <div className="widget-loading">Loading sales data...</div>;
                    }
                    if (!data || data.length === 0) {
                        return <div className="widget-empty">No sales data available</div>;
                    }
                    return renderSalesComparison(data);
                }}
            </Widget>
        </div>
    );
}