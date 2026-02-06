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
    icon?: 'clock' | 'calendar' | 'chart' | 'list' | 'gauge' | 'dollar' | 'truck' | 'box' | 'users' | 'door';
    /** Optional array of numeric values for mini charts */
    chartData?: number[];
}

// Widget-specific preview configs
interface PreviewConfig {
    module: string;
    queryId: string;
    params?: () => Record<string, any>; // Dynamic params generator
    transform: (data: any) => WidgetPreviewData;
}

// Special endpoint configs for widgets that don't use /api/widgets
interface DirectEndpointConfig {
    endpoint: string;
    method?: 'GET' | 'POST';
    transform: (data: any) => WidgetPreviewData;
}

const DIRECT_ENDPOINT_CONFIGS: Record<string, DirectEndpointConfig> = {
    // Humidity uses /api/humidity directly
    Humidity: {
        endpoint: '/api/humidity',
        method: 'GET',
        transform: (data: number) => {
            if (typeof data !== 'number') return {};
            const humidity = Math.round(data);
            return {
                value: `${humidity}%`,
                label: 'Humidity',
                status: humidity < 30 ? 'warning' : humidity > 70 ? 'warning' : 'good',
                icon: 'gauge',
            };
        },
    },
    // Beef prices chart
    BeefPricesChart: {
        endpoint: '/api/beef-prices',
        method: 'GET',
        transform: (data: any[]) => {
            if (!Array.isArray(data) || !data.length) return {};
            const latest = data[data.length - 1];
            const price = latest?.lean_50 || latest?.lean_85;
            if (!price) return { value: '--', label: 'Beef' };
            return {
                value: `$${price.toFixed(2)}`,
                label: '50CL',
                icon: 'chart',
            };
        },
    },
    // Entry logs from UniFi Access
    EntryLogsWidget: {
        endpoint: '/api/access-logs',
        method: 'GET',
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            // Count recent entries (last hour)
            const hourAgo = Date.now() - 3600000;
            const recentCount = data.filter((entry) => {
                const time = entry.timestamp || entry.time || entry.access_time;
                return time && new Date(time).getTime() > hourAgo;
            }).length;
            return {
                value: String(recentCount),
                label: 'Last Hour',
                icon: 'door',
            };
        },
    },
};

const WIDGET_PREVIEW_CONFIGS: Record<string, PreviewConfig> = {
    // ════════════════════════════════════════════════════════════════
    // SALES WIDGETS
    // ════════════════════════════════════════════════════════════════
    Overview: {
        module: 'Overview',
        queryId: 'Overview',
        transform: (data: any[]) => {
            if (!data?.length) return {};
            const now = new Date();
            // Get today's sales if available
            const todayStr = now.toISOString().split('T')[0];
            const todayData = data.find((d) => d.period?.startsWith(todayStr));
            if (todayData?.total) {
                return {
                    value: formatCompact(todayData.total),
                    label: 'Today',
                    icon: 'dollar',
                };
            }
            // Fall back to YTD
            const ytdTotal = data
                .filter((d) => new Date(d.period).getFullYear() === now.getFullYear())
                .reduce((sum, d) => sum + (d.total || 0), 0);
            return {
                value: formatCompact(ytdTotal),
                label: 'YTD Sales',
                icon: 'dollar',
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
                label: "Today's Sales",
                trend: change >= 0 ? 'up' : 'down',
                trendValue: `${change >= 0 ? '+' : ''}${Math.round(change)}%`,
                icon: 'dollar',
            };
        },
    },
    SalesByMonthBar: {
        module: 'SalesByMonthBar',
        queryId: 'SalesByMonthBar',
        transform: (data: any[]) => {
            if (!data?.length) return {};
            // Data format: { period: "2025-01", total: 12345 }
            // Get the most recent month's data (last in array, sorted by period ASC)
            const currentMonth = data[data.length - 1];
            const previousMonth = data[data.length - 2];

            const currentTotal = currentMonth?.total || 0;
            const previousTotal = previousMonth?.total || 0;

            // Parse month from period (format: "2025-01")
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            let monthLabel = 'This Month';
            if (currentMonth?.period) {
                const [, monthStr] = currentMonth.period.split('-');
                const monthIndex = parseInt(monthStr, 10) - 1;
                if (monthIndex >= 0 && monthIndex < 12) {
                    monthLabel = monthNames[monthIndex];
                }
            }

            const change = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

            return {
                value: formatCompact(currentTotal),
                label: monthLabel,
                trend: change >= 0 ? 'up' : 'down',
                trendValue: previousTotal > 0 ? `${change >= 0 ? '+' : ''}${Math.round(change)}%` : undefined,
                icon: 'chart',
            };
        },
    },
    // SalesByMonthComparisonBar requires date parameters - skip for preview
    SalesYTDCumulativeLine: {
        module: 'SalesYTDCumulative',
        queryId: 'SalesYTDCumulative',
        transform: (data: any[]) => {
            if (!data?.length) return {};

            // Data is daily sales: { period: "2026-01-15", total: 12345 }
            // We need to compute cumulative sum
            const sortedData = [...data].sort((a, b) =>
                a.period.localeCompare(b.period)
            );

            // Calculate cumulative totals
            let cumulative = 0;
            const cumulativeData = sortedData.map(d => {
                cumulative += (d.total || 0);
                return cumulative;
            });

            const ytdTotal = cumulativeData[cumulativeData.length - 1] || 0;

            // Sample data points for mini chart (take ~12 evenly spaced points)
            const step = Math.max(1, Math.floor(cumulativeData.length / 12));
            const chartData = cumulativeData
                .filter((_, i) => i % step === 0 || i === cumulativeData.length - 1);

            return {
                value: formatCompact(ytdTotal),
                label: 'YTD Total',
                icon: 'chart',
                chartData,
            };
        },
    },
    // TopCustomersThisYearPie requires date parameters - skip for preview

    // ════════════════════════════════════════════════════════════════
    // PURCHASING WIDGETS
    // ════════════════════════════════════════════════════════════════
    OutstandingOrdersTable: {
        module: 'OutstandingOrdersTable',
        queryId: 'OutstandingOrdersTable',
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            return {
                value: String(data.length),
                label: 'Open POs',
                status: data.length > 20 ? 'warning' : 'neutral',
                icon: 'truck',
            };
        },
    },
    DailyDueInTable: {
        module: 'DailyDueInTable',
        queryId: 'DailyDueInTable',
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            // Filter for items due today
            const today = new Date().toISOString().split('T')[0];
            const dueToday = data.filter((item) => {
                const promDate = item.vend_prom_date;
                return promDate && promDate.startsWith(today);
            });
            return {
                value: String(dueToday.length || data.length),
                label: 'Due Today',
                status: (dueToday.length || data.length) > 0 ? 'good' : 'neutral',
                icon: 'truck',
            };
        },
    },
    DailyDueInHiddenVendTable: {
        module: 'DailyDueInHiddenVendTable',
        queryId: 'DailyDueInHiddenVendTable',
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            return {
                value: String(data.length),
                label: 'Maint. Items',
                icon: 'box',
            };
        },
    },

    // ════════════════════════════════════════════════════════════════
    // INVENTORY WIDGETS
    // ════════════════════════════════════════════════════════════════
    DailyMovesByUser: {
        module: 'DailyMovesByUser',
        queryId: 'DailyMovesByUser',
        params: () => ({ currentDate: new Date().toISOString().split('T')[0] }),
        transform: (data: any[]) => {
            if (!Array.isArray(data) || !data.length) return {};
            // Data format: { user_id: number, moves: number }
            const total = data.reduce((sum, u) => sum + (u.moves || 0), 0);
            const sorted = [...data].sort((a, b) => (b.moves || 0) - (a.moves || 0));
            const topUser = sorted[0];
            return {
                value: String(total),
                label: "Today's Moves",
                secondaryValue: topUser?.user_id ? `Top: User ${topUser.user_id}` : undefined,
                icon: 'box',
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
                label: 'Recent Moves',
                icon: 'list',
            };
        },
    },
    DailyProductionPutawaysBar: {
        module: 'DailyProductionPutawaysBar',
        queryId: 'DailyProductionPutawaysBar',
        params: () => ({ currentDate: new Date().toISOString().split('T')[0] }),
        transform: (data: any[]) => {
            if (!Array.isArray(data)) return {};
            // Data format: { part_code, lotqty, uom }
            const total = data.reduce((sum, item) => sum + (item.lotqty || 0), 0);
            return {
                value: formatNumber(total),
                label: "Today's Putaways",
                icon: 'box',
            };
        },
    },
    TopProductUnitSales: {
        module: 'TopProductUnitSales',
        queryId: 'TopProductUnitSales',
        transform: (data: any[]) => {
            if (!Array.isArray(data) || !data.length) return {};
            // Data format: { part_code, part_desc, qty_ship_unt, ... }
            const sorted = [...data].sort((a, b) => (b.qty_ship_unt || 0) - (a.qty_ship_unt || 0));
            const top = sorted[0];
            if (top) {
                const name = (top.part_desc || top.part_code || 'Product').slice(0, 12);
                return {
                    value: formatNumber(top.qty_ship_unt || 0),
                    label: `Top: ${name}`,
                    icon: 'list',
                };
            }
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
            // Data format varies - check for low stock indicators
            const lowCount = data.filter((m) =>
                m.status === 'low' ||
                (m.lotqty !== undefined && m.lotqty < 20)
            ).length;
            return {
                value: lowCount > 0 ? String(lowCount) : `${data.length}`,
                label: lowCount > 0 ? 'Low Stock' : 'Machines',
                status: lowCount > 0 ? 'warning' : 'good',
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
                label: 'Items Tracked',
                icon: 'box',
            };
        },
    },

    // ════════════════════════════════════════════════════════════════
    // AP WIDGETS
    // ════════════════════════════════════════════════════════════════
    Top5PayablesYTD: {
        module: 'Top5PayablesYTD',
        queryId: 'Top5PayablesYTD',
        transform: (data: any[]) => {
            if (!Array.isArray(data) || !data.length) return {};
            // Data format: { vend_name_group, total_pay_value }
            const total = data.reduce((sum, v) => sum + (v.total_pay_value || 0), 0);
            const top = data[0];
            return {
                value: formatCompact(total),
                label: top?.vend_name_group ? `Top: ${top.vend_name_group.slice(0, 10)}` : 'YTD Payables',
                icon: 'dollar',
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
            label: now.toLocaleDateString('en-US', { weekday: 'long' }),
            icon: 'clock',
        };
    },
    DateWidget: () => {
        const now = new Date();
        return {
            value: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            label: now.toLocaleDateString('en-US', { weekday: 'long' }),
            icon: 'calendar',
        };
    },
    DateTimeWidget: () => {
        const now = new Date();
        return {
            value: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            label: now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
            icon: 'clock',
        };
    },
};

// FanController is handled specially - uses ACInfinityContext data
const FAN_CONTROLLER_CONFIG = {
    endpoint: '/api/ac-infinity/controllers',
    method: 'GET' as const,
    transform: (result: any): WidgetPreviewData => {
        // API returns { success: true, data: [...controllers...] }
        const controllers = result?.data;
        if (!Array.isArray(controllers) || !controllers.length) return { value: '--', label: 'No Data' };
        const controller = controllers[0];
        // Show temp and humidity
        const temp = controller.temperatureF ? `${Math.round(controller.temperatureF)}°` : null;
        const humidity = controller.humidity ? `${Math.round(controller.humidity)}%` : null;
        if (temp && humidity) {
            return {
                value: temp,
                label: `${humidity} RH`,
                icon: 'gauge',
            };
        }
        return {
            value: temp || humidity || '--',
            label: 'Fan Controller',
            icon: 'gauge',
        };
    },
};

// Helper functions
function formatCompact(value: number): string {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${Math.round(value / 1000)}K`;
    return `$${Math.round(value)}`;
}

function formatNumber(value: number): string {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return String(Math.round(value));
}

// Main hook
export function useWidgetPreview(widgetId: string): {
    data: WidgetPreviewData | null;
    loading: boolean;
} {
    const [data, setData] = useState<WidgetPreviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    // Extract base widget type from instance IDs (e.g., "FanController:abc123" -> "FanController")
    const baseWidgetId = widgetId.includes(':') ? widgetId.split(':')[0] : widgetId;

    useEffect(() => {
        mountedRef.current = true;

        const fetchPreview = async () => {
            // Check for static widget first
            const staticFn = STATIC_WIDGETS[baseWidgetId];
            if (staticFn) {
                setData(staticFn());
                setLoading(false);
                return;
            }

            // Check cache (using full widgetId for instance-specific caching)
            const cached = previewCache.get(widgetId);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                setData(cached.data);
                setLoading(false);
                return;
            }

            // Check for direct endpoint config (Humidity, BeefPricesChart, etc.)
            const directConfig = DIRECT_ENDPOINT_CONFIGS[baseWidgetId];
            if (directConfig) {
                try {
                    const response = await authService.fetchWithAuth(
                        `${config.API_BASE_URL}${directConfig.endpoint}`,
                        { method: directConfig.method || 'GET' }
                    );
                    const result = await response.json();

                    if (!mountedRef.current) return;

                    // Direct endpoints may return data differently
                    const rawData = result.success !== undefined ? result.data : result;
                    const transformed = directConfig.transform(rawData);
                    previewCache.set(widgetId, { data: transformed, timestamp: Date.now() });
                    setData(transformed);
                } catch {
                    if (mountedRef.current) setData(null);
                } finally {
                    if (mountedRef.current) setLoading(false);
                }
                return;
            }

            // Check for FanController (uses separate endpoint)
            if (baseWidgetId === 'FanController') {
                try {
                    const response = await authService.fetchWithAuth(
                        `${config.API_BASE_URL}${FAN_CONTROLLER_CONFIG.endpoint}`,
                        { method: FAN_CONTROLLER_CONFIG.method }
                    );
                    const result = await response.json();

                    if (!mountedRef.current) return;

                    const transformed = FAN_CONTROLLER_CONFIG.transform(result);
                    previewCache.set(widgetId, { data: transformed, timestamp: Date.now() });
                    setData(transformed);
                } catch {
                    if (mountedRef.current) setData(null);
                } finally {
                    if (mountedRef.current) setLoading(false);
                }
                return;
            }

            // Get standard config from WIDGET_PREVIEW_CONFIGS
            const previewConfig = WIDGET_PREVIEW_CONFIGS[baseWidgetId];
            if (!previewConfig) {
                setData(null);
                setLoading(false);
                return;
            }

            // Build request body with optional params
            const requestBody: Record<string, any> = {
                module: previewConfig.module,
                queryId: previewConfig.queryId,
            };

            // Add params if config has a params generator
            if (previewConfig.params) {
                requestBody.params = previewConfig.params();
            }

            // Fetch from /api/widgets
            try {
                const response = await authService.fetchWithAuth(`${config.API_BASE_URL}/api/widgets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
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
        const staticFn = STATIC_WIDGETS[baseWidgetId];
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
    }, [widgetId, baseWidgetId]);

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
