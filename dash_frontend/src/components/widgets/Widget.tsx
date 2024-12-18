"use client";

import { JSX, useEffect, useState } from "react";

interface WidgetProps {
    apiEndpoint: string; // The API endpoint to fetch data from
    payload: object; // The payload for the API request
    render: (data: any) => JSX.Element; // A render function to define how the widget displays its data
    updateInterval?: number; // How often to update the data (default: 30 seconds)
    title: string; // The widget title
}

export default function Widget({ apiEndpoint, payload, render, updateInterval = 30000, title }: WidgetProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch(apiEndpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const result = await response.json();
                setData(result.data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchData();

        const interval = setInterval(fetchData, updateInterval);
        return () => clearInterval(interval);
    }, [apiEndpoint, payload, updateInterval]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="widget">
            <h2>{title}</h2>
            {render(data)}
        </div>
    );
}