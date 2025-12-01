"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { adminService } from '@/lib/admin';
import { authService } from '@/lib/auth';
import { preferencesService } from '@/lib/preferences';
import type { WidgetAccessControl } from '@/types';

// How often to poll for permission changes (in milliseconds)
const PERMISSION_POLL_INTERVAL = 30000; // 30 seconds

interface WidgetPermissionsContextType {
    widgetAccess: WidgetAccessControl;
    loading: boolean;
    error: string | null;
    hasAccess: (widgetId: string, requiredLevel?: 'view' | 'edit' | 'admin') => boolean;
    filterAccessibleWidgets: <T extends { id: string }>(
        widgets: T[],
        requiredLevel?: 'view' | 'edit' | 'admin'
    ) => T[];
    getAccessLevel: (widgetId: string) => 'view' | 'edit' | 'admin' | null;
    refresh: () => Promise<void>;
}

const WidgetPermissionsContext = createContext<WidgetPermissionsContextType | null>(null);

export function WidgetPermissionsProvider({ children }: { children: React.ReactNode }) {
    const [widgetAccess, setWidgetAccess] = useState<WidgetAccessControl>({
        permissions: {},
        all_access: false,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track previous permissions to detect changes
    const previousPermissionsRef = useRef<string>('');
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const loadPermissions = useCallback(async (silent = false) => {
        try {
            if (!silent) {
                setLoading(true);
            }
            setError(null);

            // Check if user is authenticated
            if (!authService.isAuthenticated()) {
                console.log('[WidgetPermissions] Not authenticated, no access');
                setWidgetAccess({ permissions: {}, all_access: false });
                if (!silent) setLoading(false);
                return;
            }

            const user = authService.getUser();
            const isImpersonating = authService.isImpersonating();
            console.log('[WidgetPermissions] Loading permissions for user:', user?.email, 'role:', user?.role, 'impersonating:', isImpersonating);

            // Check if effective user is admin
            // When impersonating, use the impersonated user's role, not the real admin's role
            const effectiveRole = user?.role;
            if (effectiveRole === 'admin' && !isImpersonating) {
                // Real admin (not impersonating) - grant all access client-side
                console.log('[WidgetPermissions] User is admin (not impersonating), granting all_access');
                setWidgetAccess({ permissions: {}, all_access: true });
                if (!silent) setLoading(false);
                return;
            }

            // Fetch user's widget permissions from server
            // This handles: non-admins, admins impersonating non-admins, and admins impersonating admins
            console.log('[WidgetPermissions] Fetching permissions from server...');
            const access = await adminService.getAvailableWidgets();
            console.log('[WidgetPermissions] Server response:', access);

            // Check if permissions have changed
            const newPermissionsJson = JSON.stringify(access);
            if (previousPermissionsRef.current !== newPermissionsJson) {
                console.log('[WidgetPermissions] Permissions changed, updating state');
                previousPermissionsRef.current = newPermissionsJson;
                setWidgetAccess(access);
            } else {
                console.log('[WidgetPermissions] Permissions unchanged');
            }
        } catch (err) {
            console.error('[WidgetPermissions] Failed to load permissions:', err);
            if (!silent) {
                setError('Failed to load widget permissions');
            }
            // Default to no access on error
            setWidgetAccess({ permissions: {}, all_access: false });
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadPermissions();
    }, [loadPermissions]);

    // Periodic polling for permission changes
    useEffect(() => {
        // Start polling after initial load
        pollIntervalRef.current = setInterval(() => {
            loadPermissions(true); // Silent refresh
        }, PERMISSION_POLL_INTERVAL);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [loadPermissions]);

    // Listen for WebSocket permission updates via preferences service
    useEffect(() => {
        const handlePermissionUpdate = () => {
            console.log('[WidgetPermissions] Received permission update notification');
            loadPermissions(true);
        };

        // Subscribe to permission update events
        preferencesService.on('permissions_updated', handlePermissionUpdate);

        return () => {
            preferencesService.off('permissions_updated', handlePermissionUpdate);
        };
    }, [loadPermissions]);

    const hasAccess = useCallback(
        (widgetId: string, requiredLevel: 'view' | 'edit' | 'admin' = 'view'): boolean => {
            // Admins have access to everything
            if (widgetAccess.all_access) {
                return true;
            }

            const userLevel = widgetAccess.permissions[widgetId];
            if (!userLevel) {
                return false;
            }

            // Define access level hierarchy
            const levels = { view: 1, edit: 2, admin: 3 };
            return levels[userLevel] >= levels[requiredLevel];
        },
        [widgetAccess]
    );

    const filterAccessibleWidgets = useCallback(
        <T extends { id: string }>(
            widgets: T[],
            requiredLevel: 'view' | 'edit' | 'admin' = 'view'
        ): T[] => {
            // Admins see everything
            if (widgetAccess.all_access) {
                return widgets;
            }

            return widgets.filter(widget => hasAccess(widget.id, requiredLevel));
        },
        [widgetAccess.all_access, hasAccess]
    );

    const getAccessLevel = useCallback(
        (widgetId: string): 'view' | 'edit' | 'admin' | null => {
            if (widgetAccess.all_access) {
                return 'admin';
            }
            return widgetAccess.permissions[widgetId] || null;
        },
        [widgetAccess]
    );

    const value = useMemo(
        () => ({
            widgetAccess,
            loading,
            error,
            hasAccess,
            filterAccessibleWidgets,
            getAccessLevel,
            refresh: loadPermissions,
        }),
        [widgetAccess, loading, error, hasAccess, filterAccessibleWidgets, getAccessLevel, loadPermissions]
    );

    return (
        <WidgetPermissionsContext.Provider value={value}>
            {children}
        </WidgetPermissionsContext.Provider>
    );
}

export function useWidgetPermissions() {
    const context = useContext(WidgetPermissionsContext);
    if (!context) {
        throw new Error('useWidgetPermissions must be used within a WidgetPermissionsProvider');
    }
    return context;
}
