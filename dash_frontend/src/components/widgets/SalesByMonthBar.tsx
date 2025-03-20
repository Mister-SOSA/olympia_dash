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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { nFormatter } from "@/utils/helpers";
import config from "@/config";
import { SalesData, ProcessedSalesData } from "@/types";
import { MdAttachMoney } from "react-icons/md";


/* -------------------------------------- */
/* Widget Metadata                        */
/* -------------------------------------- */
export const salesByMonthBarMeta = {
    id: "SalesByMonthBar",
    x: 0,
    y: 0,
    w: 4,
    h: 4,
    enabled: true,
    displayName: "Sales by Month",
    category: "💸 Sales",
    description: "Displays sales dollars by month.",
    icon: <MdAttachMoney size={24} />,
};

/* -------------------------------------- */
/* 🔎 useResponsiveVisibleMonths Hook      */
/* -------------------------------------- */
/**
 * Returns the number of visible months based on the container's width.
 * - width >= 1200: 16 months
 * - width >= 800: 12 months
 * - width >= 600: 9 months
 * - width >= 400: 6 months
 * - Otherwise: 3 months
 */
function useResponsiveVisibleMonths(ref: React.RefObject<HTMLDivElement | null>): number {
    const [visibleMonths, setVisibleMonths] = useState(6);

    useEffect(() => {
        if (!ref.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width >= 1200) setVisibleMonths(16);
                else if (width >= 800) setVisibleMonths(12);
                else if (width >= 600) setVisibleMonths(9);
                else if (width >= 400) setVisibleMonths(6);
                else setVisibleMonths(3);
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
/* 📊 SalesByMonthBar Component           */
/* -------------------------------------- */
export default function SalesByMonthBar() {
    const containerRef = useRef<HTMLDivElement>(null);
    const visibleMonths = useResponsiveVisibleMonths(containerRef);

    const widgetPayload = useMemo(
        () => ({
            module: "SalesByMonthBar",
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