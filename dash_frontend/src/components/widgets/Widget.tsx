"use client";

import { JSX, useEffect, useState } from "react";
import PropogateLoader from "react-spinners/PropagateLoader";
import { CountdownCircleTimer } from "react-countdown-circle-timer";

interface WidgetProps {
    apiEndpoint?: string | null; // The API endpoint to fetch data from (optional)
    payload?: object | null; // The payload for the API request (optional)
    render: (data: any) => JSX.Element; // A render function to define how the widget displays its data
    updateInterval?: number; // How often to update the data (default: 30 seconds)
    title: string; // The widget title
}

export default function Widget({
    apiEndpoint,
    payload,
    render,
    updateInterval = 30000,
    title,
}: WidgetProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fetchTrigger, setFetchTrigger] = useState<number>(0); // Used to reset the timer

    useEffect(() => {
        if (!apiEndpoint) {
            // Skip fetching if apiEndpoint is null or undefined
            setLoading(false);
            return;
        }

        async function fetchData() {
            try {
                const response = await fetch(apiEndpoint as string, {
                    method: payload ? "POST" : "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: payload ? JSON.stringify(payload) : undefined,
                });

                if (!response.ok) {
                    throw new Error(`${response.status} - ${response.statusText}`);
                }

                const result = await response.json();
                setData(result.data);
                console.log(`Module ${title} fetched data:`, result.data);
            } catch (err: any) {
                console.error(`Error fetching data for module ${title}:`, err);
                setError(err.message);
            } finally {
                setLoading(false);
                setFetchTrigger((prev) => prev + 1); // Trigger timer reset
            }
        }

        fetchData();

        if (updateInterval) {
            const interval = setInterval(fetchData, updateInterval);
            return () => clearInterval(interval);
        }
    }, [apiEndpoint, payload, updateInterval]);

    if (loading)
        return (
            <div>
                <h2 className="widget-header">{title}</h2>
                <div className="widget-content">
                    <div className="loader-container">
                        <PropogateLoader className="loader" color="white" />
                    </div>
                </div>
            </div>
        );

    if (error)
        return (
            <div>
                Error: {error} Retrying in {updateInterval / 1000} seconds...
            </div>
        );

    return (
        <div className="widget">
            <h2 className="widget-header">{title}</h2>
            <div className="widget-content">
                {render(data)}
                {apiEndpoint && ( // Conditionally render the countdown timer only if apiEndpoint is truthy
                    <div className="timer-container absolute">
                        <CountdownCircleTimer
                            key={fetchTrigger} // Reset the timer when fetchTrigger changes
                            isPlaying
                            duration={updateInterval / 1000}
                            colors={["#000", "#000", "#000", "#000"]}
                            colorsTime={[updateInterval / 1000, updateInterval / 2000, 0, 0]}
                            strokeWidth={25}
                        >
                            {({ remainingTime }) => ''}
                        </CountdownCircleTimer>
                    </div>
                )}
            </div>
        </div>
    );
}