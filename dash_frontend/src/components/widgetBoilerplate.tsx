import React from "react";
import Widget from "../components/widgets/Widget";
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, LabelList, Tooltip } from "recharts";
import { nFormatter } from "@/utils/helpers";

// Define the data type for the widget
interface WidgetData {
    category: string; // X-axis key
    value: number;    // Y-axis value
}

// Chart Component
const WidgetChart = ({ data }: { data: WidgetData[] }) => (
    <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid vertical={false} stroke="rgba(200, 200, 200, 0.2)" />
            <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={10} />
            <Tooltip formatter={(value: number) => `$${nFormatter(value, 2)}`} />
            <Bar dataKey="value" fill="var(--primary-color)" radius={[8, 8, 0, 0]}>
                <LabelList
                    dataKey="value"
                    position="top"
                    offset={8}
                    formatter={(value: number) => `$${nFormatter(value, 2)}`}
                    className="fill-white"
                />
            </Bar>
        </BarChart>
    </ResponsiveContainer>
);

// Main Widget Component
export default function NewWidget() {
    const payload = {
        table: "example_table",
        columns: ["category", "SUM(value) AS value"],
        filters: "value > 0",
        group_by: ["category"],
        sort: ["value DESC"],
    };

    return (
        <Widget
            apiEndpoint="/api/widgets"
            payload={payload}
            title="New Widget Title"
            updateInterval={60000} // Refresh every 60 seconds
            render={(data: WidgetData[]) => <WidgetChart data={data} />}
        />
    );
}