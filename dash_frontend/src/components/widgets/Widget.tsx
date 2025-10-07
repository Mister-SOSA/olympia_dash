import React, { useState, useEffect, useRef } from "react";
import { MdError, MdRefresh } from "react-icons/md";
import PropogateLoader from "react-spinners/PropagateLoader";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import config from "@/config";

interface WidgetProps {
    title?: string;
    endpoint?: string;
    payload?: object;
    refreshInterval?: number;
    children: (data: any, loading: boolean, error?: string) => React.ReactNode;
}

export default function Widget({
    title,
    endpoint,
    payload,
    refreshInterval = 30000,
    children
}: WidgetProps) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(!!endpoint);
    const [error, setError] = useState<string | null>(null);
    const [fetchTrigger, setFetchTrigger] = useState<number>(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchData = async () => {
        if (!endpoint) return;

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch(`${config.API_BASE_URL}${endpoint}`, {
                method: payload ? "POST" : "GET",
                headers: { "Content-Type": "application/json" },
                body: payload ? JSON.stringify(payload) : undefined,
                signal: abortControllerRef.current.signal,
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || "API request failed");
            }

            setData(result.data);
            setError(null);
        } catch (err: any) {
            if (err.name !== "AbortError") {
                setError(err.message);
                console.error(`Widget fetch error:`, err);
            }
        } finally {
            setLoading(false);
            setFetchTrigger((prev) => prev + 1); // Trigger timer reset
        }
    };

    useEffect(() => {
        fetchData();

        if (refreshInterval && endpoint) {
            intervalRef.current = setInterval(fetchData, refreshInterval);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [endpoint, refreshInterval]);

    const handleRetry = () => {
        setLoading(true);
        setError(null);
        fetchData();
    };

    return (
        <div className="widget">
            {title && (
                <div className="widget-header">
                    <h2>{title}</h2>
                    {error && (
                        <button onClick={handleRetry} className="retry-button">
                            <MdRefresh size={16} />
                        </button>
                    )}
                </div>
            )}
            <div className="widget-content">
                {error ? (
                    <div className="widget-error-container text-[1rem] flex flex-col items-center justify-center">
                        <MdError size={48} />
                        <p className="font-[consolas] bg-black p-2 rounded-md m-2 text-center">{error}</p>
                    </div>
                ) : loading ? (
                    <div className="loader-container">
                        <PropogateLoader className="loader" color="white" />
                    </div>
                ) : (
                    children(data, loading, error ?? undefined)
                )}

                {/* Countdown timer for widgets with refresh intervals */}
                {endpoint && refreshInterval && (
                    <div className="timer-container absolute">
                        <CountdownCircleTimer
                            key={fetchTrigger} // Reset the timer when fetchTrigger changes
                            isPlaying
                            duration={refreshInterval / 1000}
                            colors={["#000", "#000", "#000", "#000"]}
                            colorsTime={[refreshInterval / 1000, refreshInterval / 2000, 0, 0]}
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