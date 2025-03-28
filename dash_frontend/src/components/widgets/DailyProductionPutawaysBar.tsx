import React, { useEffect, useRef, useState, useMemo } from "react";
import Widget from "./Widget";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    CartesianGrid,
    LabelList,
    Tooltip,
} from "recharts";
import { nFormatter } from "@/utils/helpers";
import config from "@/config";
import { MdFactory } from "react-icons/md";

/* -------------------------------------- */
/* Widget Metadata                        */
/* -------------------------------------- */
export const dailyProductionPutawaysBarMeta = {
    id: "DailyProductionPutawaysBar",
    x: 0,
    y: 0,
    w: 4,
    h: 4,
    enabled: true,
    displayName: "Daily Putaways by Product",
    category: "🏭 Manufacturing",
    description: "Displays the number of production putaways made by each product today.",
    icon: <MdFactory size={24} />,
};

interface PutawayData {
    part_code: string;
    lotqty: number;
    uom: string;
}

const WidgetChart = ({ data }: { data: { product: string; putaways: number }[] }) => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid vertical={false} stroke="rgba(200, 200, 200, 0.2)" />
            <XAxis
                tick={{ fill: "var(--text-primary)", fontSize: 16 }}
                dataKey="product"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                fontSize={16}
            />
            <Tooltip formatter={(value: number) => `${nFormatter(value, 2)} units`} />
            <Bar dataKey="putaways" fill="var(--chart-6)" radius={[8, 8, 0, 0]}>
                <LabelList
                    dataKey="putaways"
                    position="top"
                    offset={8}
                    formatter={(value: number) => `${nFormatter(value, 2)}`}
                    className="fill-white"
                />
            </Bar>
        </BarChart>
    </ResponsiveContainer>
);

export default function DailyProductionPutawaysBar() {
    const [visibleCategories, setVisibleCategories] = useState(6);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width >= 800) setVisibleCategories(12);
                else if (width >= 600) setVisibleCategories(9);
                else if (width >= 500) setVisibleCategories(6);
                else setVisibleCategories(3);
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

    // Compute today's date as an ISO string (YYYY-MM-DD)
    const currentDate = useMemo(() => new Date().toISOString().split("T")[0], []);
    console.log(currentDate);

    // Memoize the widget payload to keep it stable between renders.
    const widgetPayload = useMemo(
        () => ({
            module: "DailyProductionPutawaysBar",
            table: "putaway",
            columns: [
                "part_code",
                "SUM(lotqty) AS lotqty",
                "MAX(uom) AS uom"
            ],
            filters: `recdat = '${currentDate}' AND source_type = 'MF'`,
            group_by: ["part_code"],
            sort: "lotqty DESC",
        }),
        [currentDate]
    );

    return (
        <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
            <Widget
                apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
                payload={widgetPayload}
                title="Daily Production Putaways"
                updateInterval={15000}
                render={(data: PutawayData[]) => {
                    // Transform the data to match the chart's expected keys.
                    const transformedData = data.map((item) => ({
                        product: item.part_code,
                        putaways: item.lotqty,
                    }));
                    return <WidgetChart data={transformedData.slice(0, visibleCategories)} />;
                }}
            />
        </div>
    );
}