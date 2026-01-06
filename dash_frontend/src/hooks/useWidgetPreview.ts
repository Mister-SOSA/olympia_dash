/**
 * useWidgetPreview - Lightweight data fetching for mobile widget complications
 * 
 * This hook fetches summary data for widget cards, similar to Apple Watch complications.
 * Uses the same /api/widgets endpoint as the actual widgets.
 */

import { useState, useEffect, useRef } from 'react';
import config from '@/config';
import { authService } from '@/lib/auth';

// Cache for preview data - shared across all widget previews
const previewCache = new Map<string, { data: WidgetPreviewData; timestamp: number }>();
const CACHE_TTL = 120000; // 2 minute cache

export interface WidgetPreviewData {
    value?: string;
    label?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    status?: 'good' | 'warning' | 'error' | 'neutral';
    secondaryValue?: string;
    icon?: 'clock' | 'calendar' | 'chart' | 'list' | 'gauge';
}

// Widget-specific preview configs
interface PreviewConfig {
    module: string;
    queryId: string;
    transform: (data: any) => WidgetPreviewData;
}

const WIDGET_PREVIEW_CONFIGS: Record<string, PreviewConfig> = {
    // Sales Widgets
    Overview: {
        module: 'Overview',
        queryId: 'Overview',
        transform: (data: any[]) => {
            if (!data?.length) return {};
            const now = new Date();
            const ytdTotal = data
                .filter((d) => new Date(d.period).getFullYear() === now.getFullYear())
                .reduce((sum, d) => sum + (d.total || 0), 0);
            return {
                value: formatCompact(ytdTotal),
                label: 'YTD',
                icon: 'chart',
            };
        },
    },
    SalesByDayBar: {
        module: 'SalesByDayBar',
        queryId: 'SalesByDayBar',
        transform: (data: any[]) => {
            if (!data?.length) return {};
            const today = data[data.length - 1];
            const yesterday = data[data.length - 2];
            const todayVal = today?.total || 0;
            const yesterdayVal = yesterday?.total || 0;
            const change = yesterdayVal > 0 ? ((todayVal - yesterdayVal) / yesterdayVal) * 100 : 0;
            return {
                value: formatCompact(todayVal),
                label: 'Today',
                trend: change >= 0 ? 'up' : 'down',
                trendValue: `${change >= 0 ? '+' : ''}${Math.round(change)}%`,
            };
        },
    },
    SalesByMonthBar: {
        module: 'SalesByMonthBar',
        queryId: 'SalesByMonthBar',
        transform: (data: any[]) => {
            if (!data?.length) return {};
            const now = new Date();
            const thisMonth = data.filter((d) => {
                const date = new Date(d.period);
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            });
            const total = thisMonth.reduce((sum, d) => sum + (d.total || 0), 0);
            return {
                value: formatCompact(total),
                label: now.toLocaleString('default', { month: 'short' }),
            };
        },
    },
    SalesByMonthComparisonBar: {
        module: 'SalesByMonthComparisonBar',
        queryId: 'SalesByMonthComparisonBar',
        transform: (data: any[]) => {
            if (!data?.length) return {};
            const now = new Date();
            const thisYear = data.filter((d) => {
                const date = new Date(d.period);
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).reduce((s, d) => s + (d.total || 0), 0);
            const lastYear = data.filter((d) => {
                const date = new Date(d.period);
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() - 1;
            }).reduce((s, d) => s + (d.total || 0), 0);
            const change = lastYear > 0 ? ((thisYear - lastYear) / lastYear) * 100 : 0;
            return {
                value: `${change >= 0 ? '+' : ''}${Math.round(change)}%`,
                label: 'YoY',
                trend: change >= 0 ? 'up' : 'down',
                status: change >= 0 ? 'good' : 'warning',
            };
        },
    },
    SalesYTDCumulativeLine: {
        module: 'SalesYTDCumulativeLine',
        queryId: 'SalesYTDCumulativeLine',
        transform: (data: any[]) => {
            if (!data?.length) return {};
            const now = new Date();
            const ytd = data.filter((d) => new Date(d.period).getFullYear() === now.getFullYear());
            const total = ytd.reduce((sum, d) => sum + (d.total || 0), 0);
            return {
                value: formatCompact(total),
                label: 'Cumulative',
                icon: 'chart',
            };
        },
    },
    TopCustomersThisYearPie: {
        module: 'TopCustomersThisYearPie',
        queryId: 'TopCustomersThisYearPie',
        transform: (data: any[]) => {
            if (!data?.length) return {};
            const count = data.length;
            return {
                value: String(count),
                label: 'Customers',
                icon: 'list',
            };
        },
    },
    OutstandingOrdersTable: {
        module: 'OutstandingOrders',
        queryId: 'OutstandingOrders',
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            return {
                value: String(data.length),
                label: 'Orders',
                status: data.length > 20 ? 'warning' : 'neutral',
            };
        },
    },
    DailyDueInTable: {
        module: 'DailyDueIn',
        queryId: 'DailyDueIn',
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            return {
                value: String(data.length),
                label: 'Due In',
                status: data.length > 0 ? 'good' : 'neutral',
            };
        },
    },
    DailyDueInHiddenVendTable: {
        module: 'DailyDueInHiddenVend',
        queryId: 'DailyDueInHiddenVend',
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            return {
                value: String(data.length),
                label: 'Maint.',
            };
        },
    },
    DailyMovesByUser: {
        module: 'DailyMovesByUser',
        queryId: 'DailyMovesByUser',
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            const total = data.reduce((sum, u) => sum + (u.moves || u.count || u.total || 0), 0);
            return {
                value: String(total),
                label: 'Moves',
            };
        },
    },
    InventoryMovesLog: {
        module: 'InventoryMovesLog',
        queryId: 'InventoryMovesLog',
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            return {
                value: String(data.length),
                label: 'Recent',
                icon: 'list',
            };
        },
    },
    DailyProductionPutawaysBar: {
        module: 'DailyProductionPutaways',
        queryId: 'DailyProductionPutaways',
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            const today = data[data.length - 1];
            return {
                value: String(today?.count || today?.total || 0),
                label: 'Putaways',
            };
        },
    },
    TopProductUnitSales: {
        module: 'TopProductUnitSales',
        queryId: 'TopProductUnitSales',
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            return {
                value: String(data.length),
                label: 'Products',
                icon: 'list',
            };
        },
    },
    MachineStockStatus: {
        module: 'MachineStockStatus',
        queryId: 'MachineStockStatus',
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            const ok = data.filter((m) => m.status !== 'low' && (m.level === undefined || m.level >= 20)).length;
            return {
                value: `${ok}/${data.length}`,
                label: 'OK',
                status: ok === data.length ? 'good' : 'warning',
                icon: 'gauge',
            };
        },
    },
    InventoryTracker: {
        module: 'InventoryTracker',
        queryId: 'InventoryTracker',
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            return {
                value: String(data.length),
                label: 'Items',
            };
        },
    },
    Top5PayablesYTD: {
        module: 'Top5PayablesYTD',
        queryId: 'Top5PayablesYTD',
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            const total = data.reduce((sum, v) => sum + (v.total || v.amount || 0), 0);
            return {
                value: formatCompact(total),
                label: 'Payables',
            };
        },
    },
};

// Static widgets that don't need API calls
const STATIC_WIDGETS: Record<string, () => WidgetPreviewData> = {
    ClockWidget: () => {
        const now = new Date();
        return {
            value: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            label: now.toLocaleDateString('en-US', { weekday: 'short' }),
            icon: 'clock',
        };
    },
    DateWidget: () => {
        const now = new Date();
        return {
            value: String(now.getDate()),
            label: now.toLocaleDateString('en-US', { month: 'short' }),
            icon: 'calendar',
        };
    },
};

// Helper function
function formatCompact(value: number): string {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${Math.round(value / 1000)}K`;
    return `$${Math.round(value)}`;
}

// Main hook
export function useWidgetPreview(widgetId: string): {
    data: WidgetPreviewData | null;
    loading: boolean;
} {
    const [data, setData] = useState<WidgetPreviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        const fetchPreview = async () => {
            // Check for static widget first
            const staticFn = STATIC_WIDGETS[widgetId];
            if (staticFn) {
                setData(staticFn());
                setLoading(false);
                return;
            }

            // Check cache
            const cached = previewCache.get(widgetId);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                setData(cached.data);
                setLoading(false);
                return;
            }

            // Get config
            const previewConfig = WIDGET_PREVIEW_CONFIGS[widgetId];
            if (!previewConfig) {
                setData(null);
                setLoading(false);
                return;
            }

            // Fetch
            try {
                const response = await authService.fetchWithAuth(`${config.API_BASE_URL}/api/widgets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        module: previewConfig.module,
                        queryId: previewConfig.queryId,
                    }),
                });

                const result = await response.json();

                if (!mountedRef.current) return;

                if (result.success && result.data) {
                    const transformed = previewConfig.transform(result.data);
                    previewCache.set(widgetId, { data: transformed, timestamp: Date.now() });
                    setData(transformed);
                } else {
                    setData(null);
                }
            } catch {
                if (mountedRef.current) {
                    setData(null);
                }
            } finally {
                if (mountedRef.current) {
                    setLoading(false);
                }
            }
        };

        fetchPreview();

        // Update static widgets every minute
        const staticFn = STATIC_WIDGETS[widgetId];
        let interval: NodeJS.Timeout | undefined;
        if (staticFn) {
            interval = setInterval(() => {
                if (mountedRef.current) {
                    setData(staticFn());
                }
            }, 60000);
        }

        return () => {
            mountedRef.current = false;
            if (interval) clearInterval(interval);
        };
    }, [widgetId]);

    return { data, loading };
}

// Export for cache invalidation
export function invalidatePreviewCache(widgetId?: string) {
    if (widgetId) {
        previewCache.delete(widgetId);
    } else {
        previewCache.clear();
    }
}
