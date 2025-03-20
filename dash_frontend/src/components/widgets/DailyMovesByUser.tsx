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
import { MdMoveToInbox } from "react-icons/md";

/* -------------------------------------- */
/* Widget Metadata                        */
/* -------------------------------------- */
export const dailyMovesByUserMeta = {
    id: "DailyMovesByUser",
    x: 0,
    y: 0,
    w: 4,
    h: 4,
    enabled: true,
    displayName: "Daily Moves By User",
    category: "Logistics",
    description: "Displays the number of moves made by each user today.",
    icon: <MdMoveToInbox />,
};


interface MovesByUserData {
    user_id: number;
    moves: number;
}

const WidgetChart = ({ data }: { data: { user: number; moves: number }[] }) => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid vertical={false} stroke="rgba(200, 200, 200, 0.2)" />
            <XAxis dataKey="user" tickLine={false} axisLine={false} tickMargin={10} fontSize={16} />
            <Tooltip formatter={(value: number) => `${nFormatter(value, 2)} moves`} />
            <Bar dataKey="moves" fill="var(--chart-6)" radius={[8, 8, 0, 0]}>
                <LabelList
                    dataKey="moves"
                    position="top"
                    offset={8}
                    formatter={(value: number) => `${nFormatter(value, 2)}`}
                    className="fill-white"
                />
            </Bar>
        </BarChart>
    </ResponsiveContainer>
);

export default function DailyMovesByUser() {
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
    // Memoize the widget payload to keep it stable between renders.
    const widgetPayload = useMemo(
        () => ({
            module: "DailyMovesByUser",
            table: "inadjinf",
            columns: ["user_id", "COUNT(*) as moves"],
            group_by: ["inadjinf.user_id"],
            filters: `trans_date = '${currentDate}' AND user_id != 'AUTO'`,
            sort: "moves DESC",
        }),
        [currentDate]
    );

    return (
        <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
            <Widget
                apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
                payload={widgetPayload}
                title="Daily Moves By User"
                updateInterval={5000}
                render={(data: MovesByUserData[]) => {
                    // Transform the data to match the chart's expected keys.
                    const transformedData = data.map((item) => ({
                        user: item.user_id,
                        moves: item.moves,
                    }));
                    return <WidgetChart data={transformedData.slice(0, visibleCategories)} />;
                }}
            />
        </div>
    );
}