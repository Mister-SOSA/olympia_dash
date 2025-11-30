"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { adminService } from '@/lib/admin';
import { authService } from '@/lib/auth';
import type { WidgetAccessControl } from '@/types';

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

    const loadPermissions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Check if user is authenticated
            if (!authService.isAuthenticated()) {
                setWidgetAccess({ permissions: {}, all_access: false });
                setLoading(false);
                return;
            }

            // Check if user is admin
            if (authService.isAdmin()) {
                setWidgetAccess({ permissions: {}, all_access: true });
                setLoading(false);
                return;
            }

            // Fetch user's widget permissions
            const access = await adminService.getAvailableWidgets();

            // Apply the permissions as returned by the server
            // If user has no explicit permissions and is not admin, they will see no widgets
            // Admins are automatically granted all_access: true from the server
            setWidgetAccess(access);
        } catch (err) {
            console.error('Failed to load widget permissions:', err);
            setError('Failed to load widget permissions');
            // Default to no access on error
            setWidgetAccess({ permissions: {}, all_access: false });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPermissions();
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
