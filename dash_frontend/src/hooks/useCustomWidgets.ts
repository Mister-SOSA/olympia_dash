/**
 * useCustomWidgets Hook
 * 
 * React hook for managing custom widgets with real-time sync support.
 * Provides CRUD operations and automatic updates when widgets change
 * (locally or from other sessions via WebSocket).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { customWidgetService } from '@/lib/customWidgets';
import { preferencesService } from '@/lib/preferences';
import type {
    CustomWidgetDefinition,
    CreateCustomWidgetRequest,
    UpdateCustomWidgetRequest,
} from '@/types';

interface UseCustomWidgetsOptions {
    /** Only load widgets created by the current user */
    ownOnly?: boolean;
    /** Auto-refresh interval in milliseconds (0 = disabled) */
    autoRefreshInterval?: number;
}

interface UseCustomWidgetsReturn {
    /** List of custom widgets */
    widgets: CustomWidgetDefinition[];
    /** Loading state */
    loading: boolean;
    /** Error message if any */
    error: string | null;
    /** Create a new custom widget */
    createWidget: (request: CreateCustomWidgetRequest) => Promise<CustomWidgetDefinition>;
    /** Update an existing widget */
    updateWidget: (widgetId: string, updates: UpdateCustomWidgetRequest) => Promise<CustomWidgetDefinition>;
    /** Delete a widget */
    deleteWidget: (widgetId: string) => Promise<void>;
    /** Toggle sharing status */
    toggleShare: (widgetId: string, isShared: boolean) => Promise<void>;
    /** Duplicate a widget */
    duplicateWidget: (widgetId: string, newTitle?: string) => Promise<CustomWidgetDefinition>;
    /** Refresh the widget list */
    refresh: () => Promise<void>;
    /** Get a specific widget by ID */
    getWidget: (widgetId: string) => CustomWidgetDefinition | undefined;
}

export function useCustomWidgets(options: UseCustomWidgetsOptions = {}): UseCustomWidgetsReturn {
    const { ownOnly = false, autoRefreshInterval = 0 } = options;

    const [widgets, setWidgets] = useState<CustomWidgetDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const mountedRef = useRef(true);

    // Fetch widgets from server
    const fetchWidgets = useCallback(async () => {
        try {
            setError(null);
            const data = await customWidgetService.getAll(ownOnly);
            if (mountedRef.current) {
                setWidgets(data);
            }
        } catch (err: any) {
            if (mountedRef.current) {
                setError(err.message || 'Failed to load custom widgets');
                console.error('[useCustomWidgets] Fetch error:', err);
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, [ownOnly]);

    // Initial fetch
    useEffect(() => {
        mountedRef.current = true;
        fetchWidgets();

        return () => {
            mountedRef.current = false;
        };
    }, [fetchWidgets]);

    // Subscribe to preference changes for real-time sync
    useEffect(() => {
        const unsubscribe = preferencesService.subscribe((isRemote, changedKeys) => {
            // Only react to remote changes that affect custom widgets
            if (!isRemote) return;

            const hasCustomWidgetChanges = changedKeys?.some(key =>
                key === 'customWidgets' || key.startsWith('customWidgets.')
            );

            if (hasCustomWidgetChanges || !changedKeys) {
                console.log('[useCustomWidgets] Remote custom widget change detected, refreshing...');
                fetchWidgets();
            }
        });

        return unsubscribe;
    }, [fetchWidgets]);

    // Auto-refresh interval
    useEffect(() => {
        if (autoRefreshInterval <= 0) return;

        const interval = setInterval(fetchWidgets, autoRefreshInterval);
        return () => clearInterval(interval);
    }, [autoRefreshInterval, fetchWidgets]);

    // CRUD operations
    const createWidget = useCallback(async (request: CreateCustomWidgetRequest) => {
        const widget = await customWidgetService.create(request);
        setWidgets(prev => [widget, ...prev]);
        return widget;
    }, []);

    const updateWidget = useCallback(async (widgetId: string, updates: UpdateCustomWidgetRequest) => {
        const widget = await customWidgetService.update(widgetId, updates);
        setWidgets(prev => prev.map(w => w.id === widgetId ? widget : w));
        return widget;
    }, []);

    const deleteWidget = useCallback(async (widgetId: string) => {
        await customWidgetService.delete(widgetId);
        setWidgets(prev => prev.filter(w => w.id !== widgetId));
    }, []);

    const toggleShare = useCallback(async (widgetId: string, isShared: boolean) => {
        await customWidgetService.toggleShare(widgetId, isShared);
        setWidgets(prev => prev.map(w =>
            w.id === widgetId ? { ...w, is_shared: isShared } : w
        ));
    }, []);

    const duplicateWidget = useCallback(async (widgetId: string, newTitle?: string) => {
        const widget = await customWidgetService.duplicate(widgetId, newTitle);
        setWidgets(prev => [widget, ...prev]);
        return widget;
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        customWidgetService.clearCache();
        await fetchWidgets();
    }, [fetchWidgets]);

    const getWidget = useCallback((widgetId: string) => {
        return widgets.find(w => w.id === widgetId);
    }, [widgets]);

    return {
        widgets,
        loading,
        error,
        createWidget,
        updateWidget,
        deleteWidget,
        toggleShare,
        duplicateWidget,
        refresh,
        getWidget,
    };
}

/**
 * Hook to get a single custom widget by ID
 */
export function useCustomWidget(widgetId: string | null) {
    const [widget, setWidget] = useState<CustomWidgetDefinition | null>(null);
    const [loading, setLoading] = useState(!!widgetId);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!widgetId) {
            setWidget(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        customWidgetService.getById(widgetId)
            .then(data => {
                if (!cancelled) {
                    setWidget(data);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (!cancelled) {
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [widgetId]);

    // Subscribe to changes for this specific widget
    useEffect(() => {
        if (!widgetId) return;

        const unsubscribe = preferencesService.subscribe((isRemote, changedKeys) => {
            if (!isRemote) return;

            const widgetKey = `customWidgets.${widgetId}`;
            if (changedKeys?.includes(widgetKey) || changedKeys?.includes('customWidgets')) {
                // Refresh the widget
                customWidgetService.getById(widgetId).then(setWidget);
            }
        });

        return unsubscribe;
    }, [widgetId]);

    return { widget, loading, error };
}

/**
 * Hook to get custom widget templates
 */
export function useCustomWidgetTemplates() {
    const [templates, setTemplates] = useState<CustomWidgetDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        customWidgetService.getTemplates()
            .then(setTemplates)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return { templates, loading, error };
}
