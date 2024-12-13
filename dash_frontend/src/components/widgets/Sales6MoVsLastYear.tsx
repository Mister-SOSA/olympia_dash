"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Sales6MoVsLastYear() {
    const [data, setData] = useState([]); // State for chart data
    const [loading, setLoading] = useState(true); // Loading state
    const [error, setError] = useState<string | null>(null); // Error state
    const updateInterval = 30000; // Interval rate in milliseconds (30 seconds)

    useEffect(() => {
        async function fetchData() {
            // Get the last 6 full months
            const now = new Date();
            const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;
            const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

            try {
                const response = await fetch("http://localhost:5000/api/widgets", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        table: "invhead",
                        columns: ["FORMAT(order_date, 'yyyy-MM') AS month", "SUM(invoice_tot) AS total"],
                        filters: `order_date >= '${startDate}' AND order_date < '${endDate}'`,
                        sort: "month:ASC",
                        group_by: "month",
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const result = await response.json();
                setData(result.data); // Update chart data
            } catch (err: any) {
                setError(err.message); // Set error message
            } finally {
                setLoading(false); // End loading state
            }
        }

        fetchData(); // Fetch data immediately on mount

        // Set interval to update data periodically
        const interval = setInterval(fetchData, updateInterval);

        // Clear interval on unmount
        return () => clearInterval(interval);
    }, []); // Empty dependency array to run only on mount

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="widget">
            <h2>Invoice Totals (Last 6 Months)</h2>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <Tooltip />
                    <Bar dataKey="total" fill="#82ca9d" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}