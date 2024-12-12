"use client";
import React from "react";
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, YAxis } from "recharts";

const chartData = [
    { month: "January", desktop: 186, mobile: 80 },
    { month: "February", desktop: 305, mobile: 200 },
    { month: "March", desktop: 237, mobile: 120 },
    { month: "April", desktop: 73, mobile: 190 },
    { month: "May", desktop: 209, mobile: 130 },
    { month: "June", desktop: 214, mobile: 140 },
];

export default function Sales6MoVsLastYear() {
    return (
        <div className="widget" style={{ width: "100%", height: "100%" }}>
            <div className="widget-header">Sales (6 Mo)</div>

            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.slice(0, 3)}
                        stroke="#fff"
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        tickFormatter={(value) => `$${value}k`}
                        stroke="#fff"
                    />
                    <Tooltip />
                    <Bar dataKey="desktop" fill="#4caf50" radius={4} />
                    <Bar dataKey="mobile" fill="#2196f3" radius={4} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}