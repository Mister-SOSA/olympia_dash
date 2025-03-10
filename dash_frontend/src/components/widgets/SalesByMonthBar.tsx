import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Widget from "./Widget";
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, LabelList } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { nFormatter } from "@/utils/helpers";
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
/* 📊 SalesByMonthBar Component           */
/* -------------------------------------- */
export default function SalesByMonthBar() {
    const [visibleMonths, setVisibleMonths] = useState(6);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width } = entry.contentRect;
                if (width >= 800) setVisibleMonths(12);
                else if (width >= 600) setVisibleMonths(9);
                else if (width >= 400) setVisibleMonths(6);
                else setVisibleMonths(3);
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

    const widgetPayload = useMemo(
        () => ({
            table: "sumsales",
            columns: ["FORMAT(sale_date, 'yyyy-MM') AS period", "SUM(sales_dol) AS total"],
            filters: `(sale_date >= DATEADD(MONTH, -12, GETDATE()) AND sale_date <= GETDATE())`,
            group_by: ["FORMAT(sale_date, 'yyyy-MM')"],
            sort: ["period ASC"],
        }),
        []
    );

    const renderSalesByMonth = useCallback(
        (data: SalesData[]) => {
            const chartData = data.slice(-visibleMonths).map((entry) => ({
                period: entry.period,
                periodLabel: entry.period.split("-").join(" "),
                currentPeriodSales: entry.total || 0,
                previousPeriodSales: 0,
            }));
            return <SalesChart data={chartData} />;
        },
        [visibleMonths]
    );

    return (
        <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
            <Widget
                apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
                payload={widgetPayload}
                title="Sales by Month"
                updateInterval={300000}
                render={renderSalesByMonth}
            />
        </div>
    );
}