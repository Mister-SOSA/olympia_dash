import React, { useState, useEffect, useRef } from "react";
import { MdError, MdRefresh } from "react-icons/md";
import { Loader } from "@/components/ui/loader";
import config from "@/config";
import { authService } from "@/lib/auth";

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
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [showLoader, setShowLoader] = useState(!!endpoint);
    const [error, setError] = useState<string | null>(null);
    const [refreshProgress, setRefreshProgress] = useState(0);
    const [isResetting, setIsResetting] = useState(false);
    const isInitialLoadRef = useRef(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const loaderDelayRef = useRef<NodeJS.Timeout | null>(null);
    const loaderHideRef = useRef<NodeJS.Timeout | null>(null);
    const loaderShownAtRef = useRef<number | null>(null);
    const lastFetchTimeRef = useRef<number>(Date.now());

    // Tunables for buttery-smooth UX
    const LOADER_DELAY_MS = 150; // don't flash loader for super-fast fetches
    const LOADER_MIN_MS = 250;   // keep loader visible briefly once shown
    const FADE_OUT_MS = 300;     // CSS fade-out duration

    const fetchData = async () => {
        if (!endpoint) return;

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        // Only show loader on initial load, not on auto-refresh
        const shouldShowLoader = isInitialLoadRef.current;

        if (shouldShowLoader) {
            setLoading(true);
            setIsTransitioning(false);
            setShowLoader(false);
            if (loaderDelayRef.current) clearTimeout(loaderDelayRef.current);
            loaderDelayRef.current = setTimeout(() => {
                // Only show loader if we're still loading
                setShowLoader((prev) => {
                    if (loading) {
                        loaderShownAtRef.current = Date.now();
                        return true;
                    }
                    return prev;
                });
            }, LOADER_DELAY_MS);
        }

        try {
            const response = await authService.fetchWithAuth(`${config.API_BASE_URL}${endpoint}`, {
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
            // Mark initial load as complete
            if (isInitialLoadRef.current) {
                isInitialLoadRef.current = false;
            }

            // Clear delayed show timer if still pending
            if (loaderDelayRef.current) {
                clearTimeout(loaderDelayRef.current);
                loaderDelayRef.current = null;
            }

            const finish = () => {
                setLoading(false);
                setIsTransitioning(false);
                setShowLoader(false);
            };

            if (shouldShowLoader && showLoader && loaderShownAtRef.current) {
                // Ensure loader stayed visible for minimum time, then fade out
                const elapsed = Date.now() - loaderShownAtRef.current;
                const remaining = Math.max(LOADER_MIN_MS - elapsed, 0);
                // Begin fade-out after remaining time
                if (loaderHideRef.current) clearTimeout(loaderHideRef.current);
                loaderHideRef.current = setTimeout(() => {
                    setIsTransitioning(true);
                    // Wait for CSS fade-out to complete
                    loaderHideRef.current = setTimeout(() => {
                        finish();
                    }, FADE_OUT_MS);
                }, remaining);
            } else {
                // Loader never showed (fast fetch) → finish immediately
                finish();
            }

            lastFetchTimeRef.current = Date.now();

            // Reset progress instantly (no transition)
            setIsResetting(true);
            setRefreshProgress(0);
            // Re-enable transition after reset
            setTimeout(() => setIsResetting(false), 50);
        }
    };

    useEffect(() => {
        fetchData();

        if (refreshInterval && endpoint) {
            intervalRef.current = setInterval(fetchData, refreshInterval);

            // Update progress smoothly
            const progressUpdateInterval = 200; // Update every 200ms
            progressIntervalRef.current = setInterval(() => {
                const elapsed = Date.now() - lastFetchTimeRef.current;
                const progress = Math.min((elapsed / refreshInterval) * 100, 100);
                setRefreshProgress(progress);
            }, progressUpdateInterval);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            if (abortControllerRef.current) abortControllerRef.current.abort();
            if (loaderDelayRef.current) clearTimeout(loaderDelayRef.current);
            if (loaderHideRef.current) clearTimeout(loaderHideRef.current);
        };
    }, [endpoint, refreshInterval]); const handleRetry = () => {
        isInitialLoadRef.current = true; // Treat manual retry as initial load
        setLoading(true);
        setError(null);
        fetchData();
    };

    return (
        <div className="widget">
            {/* Drag Handle - Apple-style: minimal, centered, appears on hover */}
            <div className="widget-drag-handle" title="Drag to move widget" />

            {/* Persistent refresh indicator */}
            {endpoint && refreshInterval && (
                <div className="widget-refresh-indicator">
                    <svg width="20" height="20" viewBox="0 0 20 20" className="refresh-ring">
                        <circle
                            cx="10"
                            cy="10"
                            r="8"
                            fill="none"
                            stroke="var(--border-light)"
                            strokeWidth="2"
                            opacity="0.3"
                        />
                        <circle
                            cx="10"
                            cy="10"
                            r="8"
                            fill="none"
                            stroke="rgba(59, 130, 246, 0.5)"
                            strokeWidth="2"
                            strokeDasharray={`${2 * Math.PI * 8}`}
                            strokeDashoffset={`${2 * Math.PI * 8 * (1 - refreshProgress / 100)}`}
                            strokeLinecap="round"
                            className={`refresh-ring-progress ${isResetting ? 'no-transition' : ''}`}
                        />
                    </svg>
                </div>
            )}

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
                    <div
                        className="flex items-center justify-center h-full w-full"
                        style={{
                            animation: isTransitioning ? 'fadeOut 0.3s ease-out forwards' : undefined,
                        }}
                    >
                        {showLoader ? <Loader /> : null}
                    </div>
                ) : (
                    <div className="widget-data-container">
                        {children(data, loading, error ?? undefined)}
                    </div>
                )}
            </div>
        </div>
    );
}