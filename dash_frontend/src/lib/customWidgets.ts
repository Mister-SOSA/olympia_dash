/**
 * Custom Widget Service
 * 
 * Handles API communication for custom widget CRUD operations.
 * Integrates with the preferences system for real-time sync.
 */

import { API_BASE_URL } from '@/config';
import { authService } from './auth';
import { preferencesService } from './preferences';
import type {
    CustomWidgetDefinition,
    CreateCustomWidgetRequest,
    UpdateCustomWidgetRequest,
    CustomWidgetResponse,
} from '@/types';

const CUSTOM_WIDGETS_ENDPOINT = '/api/custom-widgets';

class CustomWidgetService {
    private cache: Map<string, CustomWidgetDefinition> = new Map();
    private listCache: CustomWidgetDefinition[] | null = null;
    private listCacheTimestamp: number = 0;
    private readonly CACHE_TTL_MS = 30000; // 30 seconds

    /**
     * Get all custom widgets accessible to the current user
     */
    async getAll(ownOnly: boolean = false): Promise<CustomWidgetDefinition[]> {
        // Check cache freshness
        const now = Date.now();
        if (!ownOnly && this.listCache && (now - this.listCacheTimestamp) < this.CACHE_TTL_MS) {
            return this.listCache;
        }

        const params = ownOnly ? '?own_only=true' : '';
        const response = await authService.fetchWithAuth(
            `${API_BASE_URL}${CUSTOM_WIDGETS_ENDPOINT}${params}`
        );

        const data: CustomWidgetResponse = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch custom widgets');
        }

        const widgets = data.widgets || [];

        // Update caches
        if (!ownOnly) {
            this.listCache = widgets;
            this.listCacheTimestamp = now;
        }

        widgets.forEach(w => this.cache.set(w.id, w));

        return widgets;
    }

    /**
     * Get a single custom widget by ID
     */
    async getById(widgetId: string): Promise<CustomWidgetDefinition | null> {
        // Check cache first
        const cached = this.cache.get(widgetId);
        if (cached) {
            return cached;
        }

        const response = await authService.fetchWithAuth(
            `${API_BASE_URL}${CUSTOM_WIDGETS_ENDPOINT}/${widgetId}`
        );

        const data: CustomWidgetResponse = await response.json();

        if (!data.success) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(data.error || 'Failed to fetch custom widget');
        }

        const widget = data.widget!;
        this.cache.set(widget.id, widget);

        return widget;
    }

    /**
     * Create a new custom widget
     */
    async create(request: CreateCustomWidgetRequest): Promise<CustomWidgetDefinition> {
        const response = await authService.fetchWithAuth(
            `${API_BASE_URL}${CUSTOM_WIDGETS_ENDPOINT}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            }
        );

        const data: CustomWidgetResponse = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to create custom widget');
        }

        const widget = data.widget!;

        // Update cache
        this.cache.set(widget.id, widget);
        this.invalidateListCache();

        // Store in preferences for real-time sync
        this.syncToPreferences(widget);

        return widget;
    }

    /**
     * Update an existing custom widget
     */
    async update(widgetId: string, updates: UpdateCustomWidgetRequest): Promise<CustomWidgetDefinition> {
        const response = await authService.fetchWithAuth(
            `${API_BASE_URL}${CUSTOM_WIDGETS_ENDPOINT}/${widgetId}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            }
        );

        const data: CustomWidgetResponse = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to update custom widget');
        }

        const widget = data.widget!;

        // Update cache
        this.cache.set(widget.id, widget);
        this.invalidateListCache();

        // Sync to preferences
        this.syncToPreferences(widget);

        return widget;
    }

    /**
     * Delete a custom widget
     */
    async delete(widgetId: string): Promise<void> {
        const response = await authService.fetchWithAuth(
            `${API_BASE_URL}${CUSTOM_WIDGETS_ENDPOINT}/${widgetId}`,
            { method: 'DELETE' }
        );

        const data: CustomWidgetResponse = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to delete custom widget');
        }

        // Clear from caches
        this.cache.delete(widgetId);
        this.invalidateListCache();

        // Remove from preferences
        this.removeFromPreferences(widgetId);
    }

    /**
     * Toggle sharing status of a widget
     */
    async toggleShare(widgetId: string, isShared: boolean): Promise<void> {
        const response = await authService.fetchWithAuth(
            `${API_BASE_URL}${CUSTOM_WIDGETS_ENDPOINT}/${widgetId}/share`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_shared: isShared }),
            }
        );

        const data: CustomWidgetResponse = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to update sharing status');
        }

        // Update cache
        const cached = this.cache.get(widgetId);
        if (cached) {
            cached.is_shared = isShared;
        }
        this.invalidateListCache();
    }

    /**
     * Duplicate a widget (create a copy)
     */
    async duplicate(widgetId: string, newTitle?: string): Promise<CustomWidgetDefinition> {
        const response = await authService.fetchWithAuth(
            `${API_BASE_URL}${CUSTOM_WIDGETS_ENDPOINT}/${widgetId}/duplicate`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle }),
            }
        );

        const data: CustomWidgetResponse = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to duplicate widget');
        }

        const widget = data.widget!;

        // Update cache
        this.cache.set(widget.id, widget);
        this.invalidateListCache();

        // Sync to preferences
        this.syncToPreferences(widget);

        return widget;
    }

    /**
     * Get widget templates (admin-created public widgets)
     */
    async getTemplates(): Promise<CustomWidgetDefinition[]> {
        const response = await authService.fetchWithAuth(
            `${API_BASE_URL}${CUSTOM_WIDGETS_ENDPOINT}/templates`
        );

        const data: CustomWidgetResponse = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch templates');
        }

        return data.templates || [];
    }

    // ============ Preferences Integration ============

    /**
     * Sync a widget definition to preferences for real-time sync
     */
    private syncToPreferences(widget: CustomWidgetDefinition): void {
        const key = `customWidgets.${widget.id}`;
        preferencesService.set(key, {
            id: widget.id,
            title: widget.title,
            description: widget.description,
            category: widget.category,
            visualization_type: widget.visualization_type,
            data_source: widget.data_source,
            config: widget.config,
            default_size: widget.default_size,
            min_size: widget.min_size,
            max_size: widget.max_size,
            version: widget.version,
            updated_at: widget.updated_at,
        });
    }

    /**
     * Remove a widget from preferences
     */
    private removeFromPreferences(widgetId: string): void {
        const key = `customWidgets.${widgetId}`;
        preferencesService.delete(key);
    }

    /**
     * Get custom widgets from preferences (for offline/fast access)
     */
    getFromPreferences(): Record<string, Partial<CustomWidgetDefinition>> {
        return preferencesService.get<Record<string, Partial<CustomWidgetDefinition>>>('customWidgets', {});
    }

    /**
     * Check if a widget exists in preferences
     */
    hasInPreferences(widgetId: string): boolean {
        const widgets = this.getFromPreferences();
        return widgetId in widgets;
    }

    // ============ Cache Management ============

    /**
     * Invalidate the list cache (after mutations)
     */
    private invalidateListCache(): void {
        this.listCache = null;
        this.listCacheTimestamp = 0;
    }

    /**
     * Clear all caches
     */
    clearCache(): void {
        this.cache.clear();
        this.invalidateListCache();
    }

    /**
     * Refresh cache from server
     */
    async refreshCache(): Promise<void> {
        this.clearCache();
        await this.getAll();
    }
}

// Export singleton instance
export const customWidgetService = new CustomWidgetService();
