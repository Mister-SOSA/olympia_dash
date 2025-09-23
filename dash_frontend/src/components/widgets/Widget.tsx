"use client";

import { JSX, useEffect, useRef, useState } from "react";
import PropogateLoader from "react-spinners/PropagateLoader";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { MdError } from "react-icons/md";

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
    const [retryTime, setRetryTime] = useState<number | null>(null);
    const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!apiEndpoint) {
            // Skip fetching if apiEndpoint is null or undefined
            setLoading(false);
            return;
        }

        const controller = new AbortController();

        async function fetchData(retries = 3, delay = 2000) {
            try {
                if (updateInterval && intervalRef.current) {
                    clearInterval(intervalRef.current as NodeJS.Timeout); // Pause normal updates
                    intervalRef.current = null;
                }

                const response = await fetch(apiEndpoint as string, {
                    method: payload ? "POST" : "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: payload ? JSON.stringify(payload) : undefined,
                    signal: controller.signal, // Attach the abort signal to the fetch request.
                });

                if (!response.ok) {
                    console.error(`Error fetching data for module ${title}:`, response.statusText);
                }

                const result = await response.json();

                // If the API signals an error, throw an error to trigger retry logic.
                if (!result.success) {
                    throw new Error(result.error);
                }

                setData(result.data);
                setError(null); // Clear previous errors
                setRetryTime(null); // Reset retry time

                // Resume normal interval after successful fetch
                if (retryTimeoutRef.current) {
                    clearTimeout(retryTimeoutRef.current);
                    retryTimeoutRef.current = null;
                }
                if (!intervalRef.current && updateInterval) {
                    intervalRef.current = setInterval(() => fetchData(), updateInterval);
                }

            } catch (err: any) {
                // Only log errors that are not due to the fetch being aborted.
                if (err.name !== "AbortError") {
                    console.error(`Error fetching data for module ${title}:`, err);
                    setError(err.message);

                    let nextDelay = Math.min(delay * 2, 60000); // Cap at 60 seconds
                    setRetryTime(nextDelay / 1000);

                    if (retryIntervalRef.current) {
                        clearInterval(retryIntervalRef.current);
                    }

                    retryIntervalRef.current = setInterval(() => {
                        setRetryTime((prev) => {
                            if (prev === null || prev <= 1) {
                                clearInterval(retryIntervalRef.current!);
                                retryIntervalRef.current = null;
                                return null;
                            }
                            return prev - 1;
                        });
                    }, 1000);

                    if (retryTimeoutRef.current) {
                        clearTimeout(retryTimeoutRef.current);
                    }

                    retryTimeoutRef.current = setTimeout(() => {
                        if (retryIntervalRef.current) {
                            clearInterval(retryIntervalRef.current);
                            retryIntervalRef.current = null;
                        }
                        fetchData(retries > 0 ? retries - 1 : retries, nextDelay);
                    }, nextDelay);
                }
            } finally {
                setLoading(false);
                setFetchTrigger((prev) => prev + 1); // Trigger timer reset.
            }
        }

        fetchData(); // Initial fetch

        if (updateInterval) {
            intervalRef.current = setInterval(() => fetchData(), updateInterval);
        }

        // Cleanup: clear the interval and abort any ongoing fetch.
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
            controller.abort();
        };
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
            <div className="widget">
                <h2 className="widget-header">{title}</h2>
                <div className="widget-content">
                    <div className="widget-error-container text-[1rem] flex flex-col items-center justify-center">
                        <MdError size={48} />
                        <p className="font-[consolas] bg-black p-2 rounded-md m-2 text-center">{error}</p>
                        {retryTime !== null && <p className="text-[1rem]">Retrying in {retryTime} seconds...</p>}
                    </div>
                </div>
            </div>
        );

    return (
        <div className="widget">
            <h2 className="widget-header">{title}</h2>
            <div className="widget-content">
                {render(data)}
                {apiEndpoint && ( // Conditionally render the countdown timer only if apiEndpoint is truthy.
                    <div className="timer-container absolute">
                        <CountdownCircleTimer
                            key={fetchTrigger} // Reset the timer when fetchTrigger changes.
                            isPlaying
                            duration={updateInterval / 1000}
                            colors={["#000", "#000", "#000", "#000"]}
                            colorsTime={[updateInterval / 1000, updateInterval / 2000, 0, 0]}
                            strokeWidth={25}
                        >
                            {({ remainingTime }) => ""}
                        </CountdownCircleTimer>
                    </div>
                )}
            </div>
        </div>
    );
}