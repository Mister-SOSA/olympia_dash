import { API_BASE_URL } from '@/config';
import { authService } from './auth';
import { io, Socket } from 'socket.io-client';

/**
 * User Preferences Service - Real-time Sync Edition v2
 * 
 * ARCHITECTURE:
 * - Optimistic updates: Local state updates immediately, then syncs to server
 * - Debounced batching: Multiple rapid changes are batched into single server saves
 * - Conflict resolution: Version-based conflict detection with automatic refresh
 * - WebSocket sync: Real-time updates from other sessions
 * - Session isolation: Ignores own broadcasts to prevent feedback loops
 * 
 * KEY IMPROVEMENTS:
 * - Single debounce timer for ALL saves (no per-key timers that race)
 * - Dirty tracking to know when local changes are pending
 * - Interaction locks to prevent remote overwrites during user activity
 * - Batched subscriber notifications to reduce re-renders
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

type ChangeCallback = (isRemote: boolean, changedKeys?: string[]) => void;

class PreferencesService {
    private readonly sessionId: string = crypto.randomUUID();
    private preferences: Record<string, any> = {};
    private version: number = 0;

    // Single save timer - no more racing per-key timers
    private saveTimer: NodeJS.Timeout | null = null;
    private savePromise: Promise<boolean> | null = null;

    // Track which keys have unsaved changes
    private dirtyKeys: Set<string> = new Set();

    // Track if a save is currently in flight
    private isSaving: boolean = false;

    // Interaction lock - when true, ignore remote updates
    private interactionLock: boolean = false;
    private interactionLockTimer: NodeJS.Timeout | null = null;

    // Notification batching
    private pendingNotification: boolean = false;
    private notificationTimer: NodeJS.Timeout | null = null;
    private pendingChangedKeys: Set<string> = new Set();

    private syncInProgress: boolean = false;
    private socket: Socket | null = null;
    private changeCallbacks: Set<ChangeCallback> = new Set();
    private currentUserId: number | null = null;
    private sessionCount: number = 1;

    // Generic event emitter for custom events (permissions_updated, etc.)
    private eventListeners: Map<string, Set<() => void>> = new Map();

    // Debounce timings
    private readonly SAVE_DEBOUNCE_MS = 500;        // Wait 500ms after last change before saving
    private readonly NOTIFICATION_DEBOUNCE_MS = 50;  // Batch notifications within 50ms
    private readonly INTERACTION_LOCK_MS = 1000;     // Keep lock for 1s after last interaction

    constructor() {
        if (typeof window !== 'undefined') {
            const user = this.getCurrentUserFromAuth();
            if (user) {
                this.currentUserId = user.id;
                this.loadFromCache();
            }
            console.log(`[Prefs] Session ID: ${this.sessionId.substring(0, 8)}...`);
        }
    }

    private getCurrentUserFromAuth(): { id: number } | null {
        const { authService: auth } = require('./auth');
        return auth.getUser();
    }

    private getCacheKey(): string {
        return `user_preferences_${this.currentUserId || 'unknown'}`;
    }

    private getVersionKey(): string {
        return `user_preferences_version_${this.currentUserId || 'unknown'}`;
    }

    /**
     * Load preferences from localStorage cache
     */
    private loadFromCache(): void {
        try {
            const cacheKey = this.getCacheKey();
            const versionKey = this.getVersionKey();

            const cached = localStorage.getItem(cacheKey);
            const cachedVersion = localStorage.getItem(versionKey);

            if (cached) {
                this.preferences = JSON.parse(cached);
                this.version = cachedVersion ? parseInt(cachedVersion, 10) : 0;
                console.log(`[Prefs] Loaded from cache for user ${this.currentUserId} (v${this.version})`);
            }
        } catch (e) {
            console.error('[Prefs] Failed to load from cache', e);
        }
    }

    /**
     * Save preferences to localStorage cache
     */
    private saveToCache(): void {
        try {
            const cacheKey = this.getCacheKey();
            const versionKey = this.getVersionKey();

            localStorage.setItem(cacheKey, JSON.stringify(this.preferences));
            localStorage.setItem(versionKey, this.version.toString());
        } catch (e) {
            console.error('[Prefs] Failed to save to cache', e);
        }
    }

    /**
     * Fetch preferences from the server
     */
    async fetchFromServer(): Promise<boolean> {
        if (!authService.isAuthenticated()) {
            console.warn('[Prefs] Cannot fetch: not authenticated');
            return false;
        }

        try {
            let url = `${API_BASE_URL}/api/preferences`;
            if (authService.isImpersonating()) {
                const impersonatedId = authService.getImpersonatedUser()?.id;
                if (impersonatedId) {
                    url += `?impersonated_user_id=${impersonatedId}`;
                }
            }

            const response = await authService.fetchWithAuth(url);
            const data: PreferencesResponse = await response.json();

            if (data.success) {
                this.preferences = data.preferences;
                this.version = data.version;
                this.dirtyKeys.clear();
                this.saveToCache();
                return true;
            }

            return false;
        } catch (error) {
            console.error('[Prefs] Failed to fetch from server', error);
            return false;
        }
    }

    /**
     * Sync preferences on login
     */
    async syncOnLogin(): Promise<void> {
        if (this.syncInProgress) {
            console.log('[Prefs] Sync already in progress');
            return;
        }
        this.syncInProgress = true;

        try {
            console.log(`[Prefs] Syncing for user ${this.currentUserId}...`);
            const success = await this.fetchFromServer();
            if (success) {
                console.log(`[Prefs] Fetched preferences (v${this.version})`);
            }
            this.connectWebSocket();
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Join appropriate WebSocket rooms
     */
    private joinAppropriateRooms(): void {
        if (!this.socket?.connected) return;

        const user = authService.getUser();
        if (!user?.id) return;

        console.log(`[Prefs] Joining room for user ${user.id}`);
        this.socket.emit('join', {
            user_id: user.id,
            session_id: this.sessionId
        });

        if (authService.isImpersonating()) {
            const impersonatedUser = authService.getImpersonatedUser();
            if (impersonatedUser?.id) {
                console.log(`[Prefs] Also joining room for impersonated user ${impersonatedUser.id}`);
                this.socket.emit('join', {
                    user_id: impersonatedUser.id,
                    session_id: this.sessionId
                });
            }
        }
    }

    /**
     * Connect to WebSocket for real-time sync
     */
    private connectWebSocket(): void {
        if (this.socket?.connected) return;
        if (!authService.isAuthenticated()) return;

        const user = authService.getUser();
        if (!user?.id) return;

        const wsUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001';
        console.log(`[Prefs] Connecting WebSocket to ${wsUrl}`);

        this.socket = io(wsUrl, {
            transports: ['polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            timeout: 20000,
            path: '/api/socket.io/'
        });

        this.socket.on('connect', () => {
            console.log('[Prefs] WebSocket connected');
            this.joinAppropriateRooms();
        });

        this.socket.on('joined', (data: any) => {
            this.sessionCount = data.session_count || 1;
            console.log(`[Prefs] Joined room: ${data.room} (${this.sessionCount} sessions)`);
        });

        this.socket.on('session_count_updated', (data: any) => {
            this.sessionCount = data.session_count || 1;
            console.log(`[Prefs] Session count: ${this.sessionCount}`);
        });

        this.socket.on('connect_error', (error: any) => {
            console.error('[Prefs] WebSocket error:', error);
        });

        this.socket.on('disconnect', (reason: string) => {
            console.warn('[Prefs] WebSocket disconnected:', reason);
        });

        // Listen for permission updates from server
        this.socket.on('permissions_updated', (data: { user_id?: number }) => {
            const currentUser = authService.getUser();
            // If this update is for the current user (or broadcast to all), emit event
            if (!data.user_id || data.user_id === currentUser?.id) {
                console.log('[Prefs] Received permissions_updated event');
                this.emit('permissions_updated');
            }
        });

        this.socket.on('preferences_updated', (data: {
            preferences: Record<string, any>,
            version: number,
            origin_session_id?: string
        }) => {
            // Ignore own broadcasts
            if (data.origin_session_id === this.sessionId) {
                return;
            }

            // Ignore if version is not newer
            if (data.version <= this.version) {
                return;
            }

            // CRITICAL: Check interaction lock
            if (this.interactionLock) {
                console.log('[Prefs] Ignoring remote update - user is interacting');
                return;
            }

            // CRITICAL: Check if we have unsaved local changes
            if (this.dirtyKeys.size > 0) {
                console.log(`[Prefs] Remote update received but have ${this.dirtyKeys.size} dirty keys - deferring`);
                return;
            }

            console.log(`[Prefs] Applying remote update (v${this.version} → v${data.version})`);

            // Detect which keys changed
            const changedKeys = this.detectChangedKeys(this.preferences, data.preferences);

            this.preferences = data.preferences;
            this.version = data.version;
            this.saveToCache();

            // Notify subscribers about the remote change
            this.notifySubscribers(true, changedKeys);
        });
    }

    /**
     * Detect which top-level keys changed between two preference objects
     */
    private detectChangedKeys(oldPrefs: Record<string, any>, newPrefs: Record<string, any>): string[] {
        const changedKeys: string[] = [];
        const allKeys = new Set([...Object.keys(oldPrefs), ...Object.keys(newPrefs)]);

        for (const key of allKeys) {
            if (JSON.stringify(oldPrefs[key]) !== JSON.stringify(newPrefs[key])) {
                changedKeys.push(key);
            }
        }

        return changedKeys;
    }

    /**
     * Rejoin WebSocket rooms (for impersonation changes)
     */
    rejoinRooms(): void {
        if (this.socket?.connected) {
            this.joinAppropriateRooms();
        }
    }

    /**
     * Subscribe to preference changes
     * Callback receives (isRemote, changedKeys?)
     */
    subscribe(callback: ChangeCallback): () => void {
        this.changeCallbacks.add(callback);
        return () => this.changeCallbacks.delete(callback);
    }

    /**
     * Subscribe to a custom event (e.g., 'permissions_updated')
     */
    on(event: string, callback: () => void): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback);
    }

    /**
     * Unsubscribe from a custom event
     */
    off(event: string, callback: () => void): void {
        this.eventListeners.get(event)?.delete(callback);
    }

    /**
     * Emit a custom event to all listeners
     */
    emit(event: string): void {
        this.eventListeners.get(event)?.forEach(cb => cb());
    }

    /**
     * Notify all subscribers with batching to reduce re-renders
     */
    private notifySubscribers(isRemote: boolean, changedKeys?: string[]): void {
        // Add changed keys to pending set
        if (changedKeys) {
            changedKeys.forEach(key => this.pendingChangedKeys.add(key));
        }

        // If already pending a notification, don't schedule another
        if (this.pendingNotification) {
            return;
        }

        this.pendingNotification = true;

        // Clear existing timer if any
        if (this.notificationTimer) {
            clearTimeout(this.notificationTimer);
        }

        // Batch notifications within a short window
        this.notificationTimer = setTimeout(() => {
            const keys = Array.from(this.pendingChangedKeys);
            this.pendingChangedKeys.clear();
            this.pendingNotification = false;
            this.notificationTimer = null;

            // Notify all subscribers
            this.changeCallbacks.forEach(cb => cb(isRemote, keys));
        }, this.NOTIFICATION_DEBOUNCE_MS);
    }

    /**
     * Set interaction lock - prevents remote updates from overwriting local changes
     */
    setInteractionLock(locked: boolean): void {
        if (locked) {
            this.interactionLock = true;

            if (this.interactionLockTimer) {
                clearTimeout(this.interactionLockTimer);
                this.interactionLockTimer = null;
            }
        } else {
            if (this.interactionLockTimer) {
                clearTimeout(this.interactionLockTimer);
            }

            this.interactionLockTimer = setTimeout(() => {
                this.interactionLock = false;
                this.interactionLockTimer = null;
            }, this.INTERACTION_LOCK_MS);
        }
    }

    /**
     * Check if interaction lock is active
     */
    isInteractionLocked(): boolean {
        return this.interactionLock;
    }

    /**
     * Switch user context (for impersonation)
     */
    async switchUser(): Promise<void> {
        const oldUserId = this.currentUserId;
        const newUser = this.getCurrentUserFromAuth();
        const newUserId = newUser?.id || null;

        console.log(`[Prefs] Switching user: ${oldUserId} → ${newUserId}`);

        // Disconnect WebSocket
        if (this.socket?.connected) {
            this.socket.disconnect();
            this.socket = null;
        }

        // Clear all state
        this.preferences = {};
        this.version = 0;
        this.dirtyKeys.clear();
        this.clearAllTimers();
        this.syncInProgress = false;
        this.interactionLock = false;

        // Update user ID before loading cache
        this.currentUserId = newUserId;
        this.loadFromCache();

        // Fetch from server and reconnect
        await this.syncOnLogin();
        this.rejoinRooms();

        // Notify subscribers
        this.notifySubscribers(false);

        console.log(`[Prefs] User context switched to ${newUserId}`);
    }

    /**
     * Clear all timers
     */
    private clearAllTimers(): void {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        if (this.notificationTimer) {
            clearTimeout(this.notificationTimer);
            this.notificationTimer = null;
        }
        if (this.interactionLockTimer) {
            clearTimeout(this.interactionLockTimer);
            this.interactionLockTimer = null;
        }
    }

    /**
     * Get a specific preference value (supports dot notation)
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
     * 
     * Options:
     * - debounce: Whether to debounce the server save (default: true)
     * - sync: Whether to sync to server at all (default: true)
     * - notifyLocal: Whether to notify local subscribers (default: true)
     */
    set(key: string, value: any, options: {
        debounce?: boolean;
        sync?: boolean;
        notifyLocal?: boolean
    } = {}): void {
        const { debounce = true, sync = true, notifyLocal = true } = options;

        // Update local state immediately (optimistic update)
        const keys = key.split('.');
        let target: any = this.preferences;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in target) || typeof target[k] !== 'object') {
                target[k] = {};
            }
            target = target[k];
        }

        const finalKey = keys[keys.length - 1];
        const oldValue = target[finalKey];

        // Skip if value hasn't changed
        if (JSON.stringify(oldValue) === JSON.stringify(value)) {
            return;
        }

        target[finalKey] = value;

        // Mark as dirty and save to cache
        this.dirtyKeys.add(keys[0]);
        this.saveToCache();

        // Notify local subscribers
        if (notifyLocal) {
            this.notifySubscribers(false, [keys[0]]);
        }

        // Schedule server save
        if (sync) {
            if (debounce) {
                this.scheduleSave();
            } else {
                this.saveToServer();
            }
        }
    }

    /**
     * Set multiple preferences at once
     */
    setMany(preferences: Record<string, any>, options: {
        sync?: boolean;
        notifyLocal?: boolean
    } = {}): void {
        const { sync = true, notifyLocal = true } = options;

        const changedKeys: string[] = [];

        // Update each preference
        for (const [key, value] of Object.entries(preferences)) {
            const keys = key.split('.');
            let target: any = this.preferences;

            for (let i = 0; i < keys.length - 1; i++) {
                const k = keys[i];
                if (!(k in target) || typeof target[k] !== 'object') {
                    target[k] = {};
                }
                target = target[k];
            }

            const finalKey = keys[keys.length - 1];
            const oldValue = target[finalKey];

            if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
                target[finalKey] = value;
                this.dirtyKeys.add(keys[0]);
                changedKeys.push(keys[0]);
            }
        }

        if (changedKeys.length === 0) {
            return;
        }

        this.saveToCache();

        if (notifyLocal) {
            this.notifySubscribers(false, changedKeys);
        }

        if (sync) {
            this.scheduleSave();
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
            if (!(k in target)) return true;
            target = target[k];
        }

        delete target[keys[keys.length - 1]];
        this.saveToCache();

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
                console.error('[Prefs] Failed to delete from server', error);
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
        this.dirtyKeys.clear();
        this.saveToCache();

        if (authService.isAuthenticated()) {
            await this.saveToServer();
        }
    }

    /**
     * Schedule a save with debouncing
     */
    private scheduleSave(): void {
        // Clear existing timer
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }

        // Schedule new save
        this.saveTimer = setTimeout(() => {
            this.saveTimer = null;
            this.saveToServer();
        }, this.SAVE_DEBOUNCE_MS);
    }

    /**
     * Save preferences to server
     */
    private async saveToServer(useVersionCheck: boolean = true): Promise<boolean> {
        if (!authService.isAuthenticated()) {
            return false;
        }

        // If already saving, wait for current save to complete then retry
        if (this.isSaving) {
            console.log('[Prefs] Save already in progress, will retry after');
            if (this.savePromise) {
                await this.savePromise;
                if (this.dirtyKeys.size > 0) {
                    return this.saveToServer(useVersionCheck);
                }
            }
            return true;
        }

        this.isSaving = true;
        const keysBeingSaved = new Set(this.dirtyKeys);

        this.savePromise = (async () => {
            try {
                console.log(`[Prefs] Saving to server (${keysBeingSaved.size} dirty keys)...`);

                const body: any = {
                    preferences: this.preferences,
                    session_id: this.sessionId
                };

                if (useVersionCheck && this.version > 0) {
                    body.version = this.version;
                }

                if (authService.isImpersonating()) {
                    const impersonatedId = authService.getImpersonatedUser()?.id;
                    if (impersonatedId) {
                        body.impersonated_user_id = impersonatedId;
                    }
                }

                const response = await authService.fetchWithAuth(
                    `${API_BASE_URL}/api/preferences`,
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    }
                );

                const data: SaveResponse = await response.json();

                if (data.success) {
                    this.version = data.version;

                    // Clear the dirty keys we just saved
                    keysBeingSaved.forEach(key => this.dirtyKeys.delete(key));

                    this.saveToCache();
                    console.log(`[Prefs] Saved successfully (v${this.version})`);

                    // Broadcast to other sessions
                    if (this.socket?.connected && this.sessionCount > 1) {
                        const targetUserId = authService.isImpersonating()
                            ? authService.getImpersonatedUser()?.id
                            : authService.getUser()?.id;

                        this.socket.emit('broadcast_preferences', {
                            user_id: targetUserId,
                            preferences: this.preferences,
                            version: this.version,
                            origin_session_id: this.sessionId
                        });
                        console.log(`[Prefs] Broadcasting to ${this.sessionCount} sessions`);
                    }

                    return true;
                } else if (data.conflict) {
                    console.warn('[Prefs] Version conflict, refreshing...');
                    await this.fetchFromServer();
                    this.notifySubscribers(true);
                    return false;
                }

                return false;
            } catch (error) {
                console.error('[Prefs] Failed to save to server', error);
                return false;
            } finally {
                this.isSaving = false;
                this.savePromise = null;
            }
        })();

        return this.savePromise;
    }

    /**
     * Force immediate sync to server (bypasses debouncing)
     */
    async forceSync(): Promise<boolean> {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }

        return await this.saveToServer();
    }

    /**
     * Check if there are unsaved changes
     */
    hasPendingChanges(): boolean {
        return this.dirtyKeys.size > 0 || this.saveTimer !== null;
    }

    /**
     * Get current version
     */
    getVersion(): number {
        return this.version;
    }

    /**
     * Get current user ID
     */
    getCurrentUserId(): number | null {
        return this.currentUserId;
    }

    /**
     * Debug info
     */
    getDebugInfo() {
        return {
            sessionId: this.sessionId,
            currentUserId: this.currentUserId,
            version: this.version,
            cacheKey: this.getCacheKey(),
            preferencesKeys: Object.keys(this.preferences),
            socketConnected: this.socket?.connected || false,
            sessionCount: this.sessionCount,
            dirtyKeys: Array.from(this.dirtyKeys),
            hasPendingSave: this.saveTimer !== null,
            isSaving: this.isSaving,
            interactionLock: this.interactionLock
        };
    }
}

export const preferencesService = new PreferencesService();

// Type-safe helper methods
export const preferenceHelpers = {
    getTheme(): string | undefined {
        return preferencesService.get<string>('theme', 'slate');
    },
    setTheme(theme: string): void {
        preferencesService.set('theme', theme);
    },
    getPreference(key: string): any {
        return preferencesService.get(key);
    },
    setPreference(key: string, value: any): void {
        preferencesService.set(key, value);
    }
};

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
    (window as any).testSync = () => {
        console.log('[Test] Setting test value...');
        preferencesService.set('test', Date.now());
    };
    (window as any).testBroadcast = () => {
        const user = authService.getUser();
        if (!user?.id) {
            console.error('Not logged in!');
            return;
        }
        console.log('[Test] Sending test broadcast...');
        (preferencesService as any).socket?.emit('test_broadcast', { user_id: user.id });
    };
    (window as any).debugPrefs = () => {
        console.log('[Debug] Preferences Info:');
        const info = preferencesService.getDebugInfo();
        console.table(info);
        console.log('Current preferences:', preferencesService.getAll());
    };
    (window as any).prefs = preferencesService;
}

// Export helper functions for backward compatibility with existing localStorage code
export const migrateFromLocalStorage = async () => {
    if (typeof window === 'undefined') return;

    const keysToMigrate = [
        { localStorage: 'dashboard_layout', preference: 'dashboard.layout' },
        { localStorage: 'dashboard_presets', preference: 'dashboard.presets' },
        { localStorage: 'dashboard_current_preset_type', preference: 'dashboard.currentPresetType' },
    ];

    let hasChanges = false;

    keysToMigrate.forEach(({ localStorage: lsKey, preference: prefKey }) => {
        const value = localStorage.getItem(lsKey);
        // Only migrate if the old localStorage key exists AND the new preference doesn't exist
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
        try {
            await preferencesService.forceSync();
            keysToMigrate.forEach(({ localStorage: lsKey }) => {
                localStorage.removeItem(lsKey);
            });
            console.log('Successfully migrated preferences from localStorage to server');
        } catch (error) {
            console.error('Failed to migrate preferences:', error);
        }
    }
};

