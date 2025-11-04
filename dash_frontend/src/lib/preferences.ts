import { API_BASE_URL } from '@/config';
import { authService } from './auth';

/**
 * User Preferences Service
 * 
 * Provides a hybrid approach for managing user preferences:
 * - Server-side persistence for cross-device sync
 * - LocalStorage caching for offline capability and instant load
 * - Automatic debouncing to avoid excessive API calls
 * - Version-based conflict resolution
 */

interface PreferencesResponse {
    success: boolean;
    preferences: Record<string, any>;
    version: number;
    updated_at: string | null;
    error?: string;
    conflict?: boolean;
}

interface SaveResponse {
    success: boolean;
    version: number;
    message?: string;
    error?: string;
    conflict?: boolean;
}

class PreferencesService {
    private preferences: Record<string, any> = {};
    private version: number = 0;
    private saveTimers: Map<string, NodeJS.Timeout> = new Map();
    private syncInProgress: boolean = false;
    private readonly CACHE_KEY = 'user_preferences';
    private readonly VERSION_KEY = 'user_preferences_version';
    private readonly DEBOUNCE_MS = 1000; // 1 second debounce for saves

    constructor() {
        if (typeof window !== 'undefined') {
            this.loadFromCache();
        }
    }

    /**
     * Load preferences from localStorage cache
     */
    private loadFromCache(): void {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            const cachedVersion = localStorage.getItem(this.VERSION_KEY);
            
            if (cached) {
                this.preferences = JSON.parse(cached);
                this.version = cachedVersion ? parseInt(cachedVersion, 10) : 0;
            }
        } catch (e) {
            console.error('Failed to load preferences from cache', e);
        }
    }

    /**
     * Save preferences to localStorage cache
     */
    private saveToCache(): void {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.preferences));
            localStorage.setItem(this.VERSION_KEY, this.version.toString());
        } catch (e) {
            console.error('Failed to save preferences to cache', e);
        }
    }

    /**
     * Fetch preferences from the server
     */
    async fetchFromServer(): Promise<boolean> {
        if (!authService.isAuthenticated()) {
            console.warn('Cannot fetch preferences: not authenticated');
            return false;
        }

        try {
            const response = await authService.fetchWithAuth(
                `${API_BASE_URL}/api/preferences`
            );

            const data: PreferencesResponse = await response.json();

            if (data.success) {
                this.preferences = data.preferences;
                this.version = data.version;
                this.saveToCache();
                return true;
            }

            return false;
        } catch (error) {
            console.error('Failed to fetch preferences from server', error);
            return false;
        }
    }

    /**
     * Sync preferences from server on login
     * Merges server preferences with local cache intelligently
     */
    async syncOnLogin(): Promise<void> {
        if (this.syncInProgress) return;
        this.syncInProgress = true;

        try {
            const localPrefs = { ...this.preferences };
            const localVersion = this.version;

            const fetchSuccess = await this.fetchFromServer();

            if (fetchSuccess) {
                const serverVersion = this.version;

                // If local version is newer or same, we might have offline changes
                if (localVersion >= serverVersion && Object.keys(localPrefs).length > 0) {
                    // Merge local changes into server preferences
                    this.preferences = { ...this.preferences, ...localPrefs };
                    // Push merged preferences to server
                    await this.saveToServer(false); // Don't use version check for initial sync
                }
            }
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Get a specific preference value
     * Supports dot notation for nested values (e.g., 'dashboard.layout')
     */
    get<T = any>(key: string, defaultValue?: T): T | undefined {
        const keys = key.split('.');
        let value: any = this.preferences;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }

        return value as T;
    }

    /**
     * Get all preferences
     */
    getAll(): Record<string, any> {
        return { ...this.preferences };
    }

    /**
     * Set a specific preference value
     * Supports dot notation for nested values (e.g., 'dashboard.layout')
     * Automatically saves to server with debouncing
     */
    set(key: string, value: any, options: { debounce?: boolean; sync?: boolean } = {}): void {
        const { debounce = true, sync = true } = options;

        // Update the preference value
        const keys = key.split('.');
        let target: any = this.preferences;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in target) || typeof target[k] !== 'object') {
                target[k] = {};
            }
            target = target[k];
        }

        target[keys[keys.length - 1]] = value;

        // Save to cache immediately
        this.saveToCache();

        // Save to server with optional debouncing
        if (sync) {
            if (debounce) {
                this.debouncedSaveToServer(key);
            } else {
                this.saveToServer();
            }
        }
    }

    /**
     * Set multiple preferences at once
     */
    setMany(preferences: Record<string, any>, options: { sync?: boolean } = {}): void {
        const { sync = true } = options;

        // Deep merge preferences
        this.preferences = this.deepMerge(this.preferences, preferences);

        // Save to cache immediately
        this.saveToCache();

        // Save to server
        if (sync) {
            this.saveToServer();
        }
    }

    /**
     * Delete a specific preference
     */
    async delete(key: string): Promise<boolean> {
        const keys = key.split('.');
        let target: any = this.preferences;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in target)) return true; // Already doesn't exist
            target = target[k];
        }

        delete target[keys[keys.length - 1]];

        // Save to cache
        this.saveToCache();

        // Delete from server
        if (authService.isAuthenticated()) {
            try {
                const response = await authService.fetchWithAuth(
                    `${API_BASE_URL}/api/preferences/${key}`,
                    { method: 'DELETE' }
                );

                const data: SaveResponse = await response.json();
                
                if (data.success) {
                    this.version = data.version;
                    return true;
                }
            } catch (error) {
                console.error('Failed to delete preference from server', error);
            }
        }

        return false;
    }

    /**
     * Clear all preferences
     */
    async clearAll(): Promise<void> {
        this.preferences = {};
        this.version = 0;
        this.saveToCache();
        
        if (authService.isAuthenticated()) {
            await this.saveToServer();
        }
    }

    /**
     * Save preferences to server with debouncing
     */
    private debouncedSaveToServer(key: string): void {
        // Clear existing timer for this key
        const existingTimer = this.saveTimers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set new timer
        const timer = setTimeout(() => {
            this.saveToServer();
            this.saveTimers.delete(key);
        }, this.DEBOUNCE_MS);

        this.saveTimers.set(key, timer);
    }

    /**
     * Save preferences to server immediately
     */
    private async saveToServer(useVersionCheck: boolean = true): Promise<boolean> {
        if (!authService.isAuthenticated()) {
            return false;
        }

        try {
            const body: any = {
                preferences: this.preferences
            };

            if (useVersionCheck && this.version > 0) {
                body.version = this.version;
            }

            const response = await authService.fetchWithAuth(
                `${API_BASE_URL}/api/preferences`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                }
            );

            const data: SaveResponse = await response.json();

            if (data.success) {
                this.version = data.version;
                this.saveToCache();
                return true;
            } else if (data.conflict) {
                // Handle version conflict by fetching latest and retrying
                console.warn('Preference version conflict detected, syncing...');
                await this.fetchFromServer();
                return false;
            }

            return false;
        } catch (error) {
            console.error('Failed to save preferences to server', error);
            return false;
        }
    }

    /**
     * Force immediate sync to server (bypasses debouncing)
     */
    async forceSync(): Promise<boolean> {
        // Clear all pending timers
        this.saveTimers.forEach(timer => clearTimeout(timer));
        this.saveTimers.clear();

        return await this.saveToServer();
    }

    /**
     * Deep merge two objects
     */
    private deepMerge(target: any, source: any): any {
        const output = { ...target };
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }
        
        return output;
    }

    /**
     * Check if value is a plain object
     */
    private isObject(item: any): boolean {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Get current version
     */
    getVersion(): number {
        return this.version;
    }
}

export const preferencesService = new PreferencesService();

// Export helper functions for backward compatibility with existing localStorage code
export const migrateFromLocalStorage = () => {
    if (typeof window === 'undefined') return;

    const keysToMigrate = [
        { localStorage: 'dashboard_layout', preference: 'dashboard.layout' },
        { localStorage: 'dashboard_presets', preference: 'dashboard.presets' },
        { localStorage: 'dashboard_current_preset_type', preference: 'dashboard.currentPresetType' },
    ];

    let hasChanges = false;

    keysToMigrate.forEach(({ localStorage: lsKey, preference: prefKey }) => {
        const value = localStorage.getItem(lsKey);
        if (value && !preferencesService.get(prefKey)) {
            try {
                const parsed = JSON.parse(value);
                preferencesService.set(prefKey, parsed, { sync: false, debounce: false });
                hasChanges = true;
            } catch (e) {
                // Not JSON, store as string
                preferencesService.set(prefKey, value, { sync: false, debounce: false });
                hasChanges = true;
            }
        }
    });

    // If we migrated anything, sync to server and clean up old localStorage keys
    if (hasChanges) {
        preferencesService.forceSync().then(() => {
            keysToMigrate.forEach(({ localStorage: lsKey }) => {
                localStorage.removeItem(lsKey);
            });
            console.log('Successfully migrated preferences from localStorage to server');
        });
    }
};

