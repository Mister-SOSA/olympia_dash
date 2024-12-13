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
            try {
                const response = await fetch(
                    "/api/data/advanced?table=sales_data&columns=month,desktop,mobile&order_by=month ASC"
                );
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
            <h2>Sales Data</h2>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <Tooltip />
                    <Bar dataKey="desktop" fill="#82ca9d" />
                    <Bar dataKey="mobile" fill="#8884d8" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}