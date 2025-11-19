import { API_BASE_URL } from '@/config';
import { authService } from './auth';
import { io, Socket } from 'socket.io-client';

/**
 * User Preferences Service - Real-time Sync Edition
 * 
 * - WebSocket for instant cross-session sync
 * - Session-aware: ignores own broadcasts
 * - LocalStorage caching
 * - Automatic debouncing
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
    private readonly sessionId: string = crypto.randomUUID();
    private preferences: Record<string, any> = {};
    private version: number = 0;
    private saveTimers: Map<string, NodeJS.Timeout> = new Map();
    private syncInProgress: boolean = false;
    private socket: Socket | null = null;
    private changeCallbacks: Set<() => void> = new Set();
    private currentUserId: number | null = null;
    private readonly DEBOUNCE_MS = 500;

    constructor() {
        if (typeof window !== 'undefined') {
            // Get current user to set cache keys
            const user = this.getCurrentUserFromAuth();
            if (user) {
                this.currentUserId = user.id;
                this.loadFromCache();
            }
            console.log(`Session ID: ${this.sessionId.substring(0, 8)}...`);
        }
    }

    private getCurrentUserFromAuth(): { id: number } | null {
        // Import auth service to get current user
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
     * Load preferences from localStorage cache (user-specific)
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
                console.log(`📦 Loaded from cache for user ${this.currentUserId} (v${this.version})`);
            } else {
                console.log(`📦 No cache found for user ${this.currentUserId}`);
            }
        } catch (e) {
            console.error('Failed to load preferences from cache', e);
        }
    }

    /**
     * Save preferences to localStorage cache (user-specific)
     */
    private saveToCache(): void {
        try {
            const cacheKey = this.getCacheKey();
            const versionKey = this.getVersionKey();
            
            localStorage.setItem(cacheKey, JSON.stringify(this.preferences));
            localStorage.setItem(versionKey, this.version.toString());
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
            // Add impersonation parameter if active
            let url = `${API_BASE_URL}/api/preferences`;
            if (authService.isImpersonating()) {
                const impersonatedId = authService.getImpersonatedUser()?.id;
                if (impersonatedId) {
                    url += `?impersonated_user_id=${impersonatedId}`;
                    console.log(`🎭 Fetching preferences for impersonated user ${impersonatedId}`);
                }
            }
            
            const response = await authService.fetchWithAuth(url);

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
     * Sync preferences from server on login and connect WebSocket
     */
    async syncOnLogin(): Promise<void> {
        if (this.syncInProgress) {
            console.log('⏸️ Sync already in progress, waiting...');
            return;
        }
        this.syncInProgress = true;

        try {
            console.log(`📡 Syncing preferences for user ${this.currentUserId}...`);
            const success = await this.fetchFromServer();
            if (success) {
                console.log(`✅ Fetched preferences for user ${this.currentUserId} (v${this.version})`);
            } else {
                console.warn(`⚠️ Failed to fetch preferences for user ${this.currentUserId}`);
            }
            
            this.connectWebSocket();
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Join the appropriate WebSocket rooms based on impersonation state
     */
    private joinAppropriateRooms(): void {
        if (!this.socket?.connected) return;
        
        const user = authService.getUser();
        if (!user?.id) return;

        // Always join own room (admin's room)
        console.log(`Joining room for user ${user.id} with session ${this.sessionId.substring(0, 8)}...`);
        this.socket.emit('join', { 
            user_id: user.id,
            session_id: this.sessionId
        });

        // If impersonating, also join the impersonated user's room
        if (authService.isImpersonating()) {
            const impersonatedUser = authService.getImpersonatedUser();
            if (impersonatedUser?.id) {
                console.log(`🎭 Also joining room for impersonated user ${impersonatedUser.id}`);
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

        const wsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        this.socket = io(wsUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true
        });

        this.socket.on('connect', () => {
            console.log('✅ WebSocket connected');
            this.joinAppropriateRooms();
        });

        this.socket.on('joined', (data: any) => {
            const sessionCount = data.session_count || 1;
            console.log(`✅ Joined room: ${data.room} (${sessionCount} session${sessionCount > 1 ? 's' : ''} active)`);
            
            if (sessionCount === 1) {
                console.log('ℹ️ You are the only session - broadcasts disabled for efficiency');
            }
        });

        this.socket.on('session_count_updated', (data: any) => {
            const sessionCount = data.session_count || 1;
            console.log(`📊 Session count updated: ${sessionCount} session${sessionCount > 1 ? 's' : ''} active`);
            
            if (sessionCount === 1) {
                console.log('ℹ️ You are now alone - broadcasts will be disabled');
            } else if (sessionCount === 2) {
                console.log('ℹ️ Another session joined - broadcasts now active');
            }
        });

        this.socket.on('connect_error', (error: any) => {
            console.error('❌ WebSocket connection error:', error);
        });

        this.socket.on('disconnect', (reason: string) => {
            console.warn('⚠️ WebSocket disconnected:', reason);
        });

        this.socket.on('test_received', (data: any) => {
            console.log('🧪 TEST BROADCAST RECEIVED:', data);
            alert('Test broadcast received! Check console.');
        });

        this.socket.on('preferences_updated', (data: {
            preferences: Record<string, any>,
            version: number,
            origin_session_id?: string
        }) => {
            console.log(`📥 Broadcast received`);
            console.log(`   From session: ${data.origin_session_id?.substring(0, 8) || 'unknown'}...`);
            console.log(`   My session: ${this.sessionId.substring(0, 8)}...`);
            console.log(`   Version: ${data.version} (my version: ${this.version})`);
            console.log(`   Is own broadcast: ${data.origin_session_id === this.sessionId}`);
            
            // Ignore our own broadcasts
            if (data.origin_session_id === this.sessionId) {
                console.log('⏭️ Ignoring own broadcast');
                return;
            }

            // Only apply if version is newer
            if (data.version <= this.version) {
                console.log('⏭️ Version not newer, ignoring');
                return;
            }

            console.log(`✅ Applying update from another session (v${this.version} → v${data.version})`);
            this.preferences = data.preferences;
            this.version = data.version;
            this.saveToCache();
            
            // Notify all subscribers
            this.changeCallbacks.forEach(cb => cb());
        });
    }

    /**
     * Rejoin WebSocket rooms (called when impersonation state changes)
     */
    rejoinRooms(): void {
        if (this.socket?.connected) {
            console.log('🔄 Rejoining WebSocket rooms due to impersonation change...');
            this.joinAppropriateRooms();
        }
    }

    /**
     * Subscribe to preference changes
     */
    subscribe(callback: () => void): () => void {
        this.changeCallbacks.add(callback);
        return () => this.changeCallbacks.delete(callback);
    }

    /**
     * Switch to a different user (for impersonation)
     * Disconnects, clears state, fetches new user's preferences, reconnects
     */
    async switchUser(): Promise<void> {
        const oldUserId = this.currentUserId;
        const newUser = this.getCurrentUserFromAuth();
        const newUserId = newUser?.id || null;
        
        console.log(`🔄 Switching user context: ${oldUserId} → ${newUserId}`);
        
        // Disconnect current WebSocket
        if (this.socket?.connected) {
            console.log('Disconnecting WebSocket...');
            this.socket.disconnect();
            this.socket = null;
        }

        // Clear local state
        this.preferences = {};
        this.version = 0;
        this.saveTimers.forEach(timer => clearTimeout(timer));
        this.saveTimers.clear();
        this.syncInProgress = false;
        
        // Update user ID BEFORE loading cache (changes cache keys)
        this.currentUserId = newUserId;

        // Load new user's cached preferences (if any)
        this.loadFromCache();

        // Fetch fresh from server and reconnect WebSocket
        console.log(`Fetching preferences for user ${newUserId}...`);
        await this.syncOnLogin();
        
        // Rejoin rooms with new impersonation state
        this.rejoinRooms();
        
        // Notify subscribers
        this.changeCallbacks.forEach(cb => cb());
        
        console.log(`✅ User context switched to user ${newUserId}`);
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
        // Clear ALL existing timers (not just for this key)
        this.saveTimers.forEach(timer => clearTimeout(timer));
        this.saveTimers.clear();

        // Set single new timer
        const timer = setTimeout(() => {
            this.saveToServer();
            this.saveTimers.clear();
        }, this.DEBOUNCE_MS);

        this.saveTimers.set('save', timer);
    }

    /**
     * Save preferences to server immediately
     */
    private async saveToServer(useVersionCheck: boolean = true): Promise<boolean> {
        if (!authService.isAuthenticated()) {
            return false;
        }

        try {
            console.log('💾 Saving to server...');

            const body: any = {
                preferences: this.preferences,
                session_id: this.sessionId
            };

            if (useVersionCheck && this.version > 0) {
                body.version = this.version;
            }

            // Add impersonation info if active
            if (authService.isImpersonating()) {
                const impersonatedId = authService.getImpersonatedUser()?.id;
                if (impersonatedId) {
                    body.impersonated_user_id = impersonatedId;
                    console.log(`🎭 Saving preferences for impersonated user ${impersonatedId}`);
                }
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
                console.log(`✅ Saved (v${this.version})`);
                
                // Trigger broadcast via WebSocket event (works reliably!)
                if (this.socket?.connected) {
                    // Use impersonated user ID if impersonating, otherwise use admin's ID
                    const targetUserId = authService.isImpersonating() 
                        ? authService.getImpersonatedUser()?.id 
                        : authService.getUser()?.id;
                    
                    this.socket.emit('broadcast_preferences', {
                        user_id: targetUserId,
                        preferences: this.preferences,
                        version: this.version,
                        origin_session_id: this.sessionId
                    });
                    
                    console.log(`📡 Broadcasting to room user_${targetUserId}${authService.isImpersonating() ? ' (impersonated)' : ''}`);
                }
                
                return true;
            } else if (data.conflict) {
                console.warn('⚠️ Version conflict, syncing...');
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

    /**
     * Get current user ID (for debugging)
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
            socketConnected: this.socket?.connected || false
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
        console.log('🧪 Testing sync by setting test value...');
        preferencesService.set('test', Date.now());
    };
    (window as any).testBroadcast = () => {
        const user = authService.getUser();
        if (!user?.id) {
            console.error('Not logged in!');
            return;
        }
        console.log('🧪 Sending test broadcast request...');
        (preferencesService as any).socket?.emit('test_broadcast', { user_id: user.id });
    };
    (window as any).debugPrefs = () => {
        console.log('🔍 Preferences Debug Info:');
        const info = preferencesService.getDebugInfo();
        console.table(info);
        console.log('Current preferences:', preferencesService.getAll());
        console.log('Dashboard layout:', preferencesService.get('dashboard.layout'));
        console.log('Dashboard presets:', preferencesService.get('dashboard.presets'));
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

