import React, { useState, useEffect, useRef } from "react";
import { MdError, MdRefresh } from "react-icons/md";
import { Loader } from "@/components/ui/loader";
import config from "@/config";
import { authService } from "@/lib/auth";
import { preferencesService } from "@/lib/preferences";
import { WIDGET_SETTINGS } from "@/constants/settings";
import { trackWidgetInteraction } from "@/lib/analytics";

interface WidgetProps {
    title?: string;
    endpoint?: string;
    payload?: object;
    refreshInterval?: number;
    widgetId?: string;  // Widget identifier for tracking
    children: (data: any, loading: boolean, error?: string) => React.ReactNode;
}

export default function Widget({
    title,
    endpoint,
    payload,
    refreshInterval = 30000,
    widgetId,
    children
}: WidgetProps) {
    // Read settings directly from preferences service (not via hook to avoid re-render loops)
    const showRefreshIndicator = preferencesService.get(
        WIDGET_SETTINGS.showRefreshIndicators.key,
        WIDGET_SETTINGS.showRefreshIndicators.default
    );
    const showWidgetTitles = preferencesService.get(
        WIDGET_SETTINGS.showWidgetTitles.key,
        WIDGET_SETTINGS.showWidgetTitles.default
    );

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(!!endpoint);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshProgress, setRefreshProgress] = useState(0);
    const [isResetting, setIsResetting] = useState(false);
    const isInitialLoadRef = useRef(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const loaderHideRef = useRef<NodeJS.Timeout | null>(null);
    const lastFetchTimeRef = useRef<number>(Date.now());
    const viewTrackedRef = useRef(false);

    // Track widget view on mount (only once per session)
    useEffect(() => {
        if (!viewTrackedRef.current) {
            // Try to get widget identifier from multiple sources
            const moduleId = (payload as any)?.module || (payload as any)?.queryId;
            const widgetType = title || moduleId || widgetId || 'Unknown';
            const trackingId = widgetId || moduleId || title || 'unknown';

            if (widgetType !== 'Unknown') {
                trackWidgetInteraction(widgetType, trackingId, 'view');
                viewTrackedRef.current = true;
            }
        }
    }, [widgetId, title, payload]);

    // Tunables for smooth UX
    const LOADER_MIN_MS = 200;   // keep loader visible briefly once shown
    const FADE_OUT_MS = 250;     // CSS fade-out duration

    const fetchData = async () => {
        if (!endpoint) return;

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        // Only show loading states on initial load, not on auto-refresh
        const shouldShowLoader = isInitialLoadRef.current;

        if (shouldShowLoader) {
            setLoading(true);
            setIsTransitioning(false);
        }

        const loadStartTime = Date.now();

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

            const finish = () => {
                setLoading(false);
                setIsTransitioning(false);
            };

            if (shouldShowLoader) {
                // Ensure loader stayed visible for minimum time, then fade out
                const elapsed = Date.now() - loadStartTime;
                const remaining = Math.max(LOADER_MIN_MS - elapsed, 0);

                if (loaderHideRef.current) clearTimeout(loaderHideRef.current);
                loaderHideRef.current = setTimeout(() => {
                    setIsTransitioning(true);
                    // Wait for CSS fade-out to complete
                    loaderHideRef.current = setTimeout(() => {
                        finish();
                    }, FADE_OUT_MS);
                }, remaining);
            } else {
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

    // Track if we've done initial fetch
    const hasFetchedRef = useRef(false);

    // Fetch data effect - only runs on mount and when endpoint changes
    useEffect(() => {
        // Skip if no endpoint
        if (!endpoint) return;

        // Fetch immediately on mount
        fetchData();
        hasFetchedRef.current = true;

        // Set up interval for periodic refresh
        if (refreshInterval && refreshInterval > 0) {
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
            if (loaderHideRef.current) clearTimeout(loaderHideRef.current);
        };
    }, [endpoint, refreshInterval]);

    const handleRetry = () => {
        isInitialLoadRef.current = true; // Treat manual retry as initial load
        setLoading(true);
        setError(null);
        fetchData();
    };

    return (
        <div className="widget">
            {/* Drag Handle Container - clips the handle so it slides from the edge */}
            <div className="widget-drag-handle-container">
                <div className="widget-drag-handle" title="Drag to move widget" />
            </div>

            {/* Persistent refresh indicator - respects user settings */}
            {endpoint && refreshInterval && showRefreshIndicator && (
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

            {title && showWidgetTitles && (
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
                    <div
                        className="widget-error-container flex flex-col items-center justify-center gap-3 p-4 animate-in fade-in duration-200"
                        style={{ color: 'var(--ui-danger-text)' }}
                    >
                        <div className="p-3 rounded-full bg-ui-danger-bg/20">
                            <MdError size={32} className="text-ui-danger-text" />
                        </div>
                        <p className="text-sm font-mono bg-ui-bg-tertiary px-3 py-2 rounded-md text-center max-w-xs break-words">
                            {error}
                        </p>
                        <button
                            onClick={handleRetry}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-ui-bg-secondary hover:bg-ui-bg-tertiary border border-ui-border-primary transition-colors"
                            style={{ color: 'var(--ui-text-secondary)' }}
                        >
                            <MdRefresh size={14} />
                            Retry
                        </button>
                    </div>
                ) : loading ? (
                    <div
                        className="widget-loading-container"
                        style={{
                            animation: isTransitioning ? 'fadeOut 0.25s ease-out forwards' : undefined,
                        }}
                    >
                        <Loader />
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