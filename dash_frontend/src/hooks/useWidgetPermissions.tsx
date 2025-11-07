import { useEffect, useState } from 'react';
import { adminService } from '@/lib/admin';
import { authService } from '@/lib/auth';
import type { WidgetAccessControl } from '@/types';

/**
 * Hook to check if the current user has access to specific widgets.
 * Admins automatically have access to all widgets.
 */
export function useWidgetPermissions() {
  const [widgetAccess, setWidgetAccess] = useState<WidgetAccessControl>({
    permissions: {},
    all_access: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        setWidgetAccess({ permissions: {}, all_access: false });
        return;
      }

      // Check if user is admin
      if (authService.isAdmin()) {
        setWidgetAccess({ permissions: {}, all_access: true });
        return;
      }

      // Fetch user's widget permissions
      const access = await adminService.getAvailableWidgets();
      setWidgetAccess(access);
    } catch (err) {
      console.error('Failed to load widget permissions:', err);
      setError('Failed to load widget permissions');
      // Default to no access on error
      setWidgetAccess({ permissions: {}, all_access: false });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if user has access to a specific widget
   */
  const hasAccess = (widgetId: string, requiredLevel: 'view' | 'edit' | 'admin' = 'view'): boolean => {
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
  };

  /**
   * Filter a list of widgets to only those the user has access to
   */
  const filterAccessibleWidgets = <T extends { id: string }>(
    widgets: T[],
    requiredLevel: 'view' | 'edit' | 'admin' = 'view'
  ): T[] => {
    // Admins see everything
    if (widgetAccess.all_access) {
      return widgets;
    }

    return widgets.filter(widget => hasAccess(widget.id, requiredLevel));
  };

  /**
   * Get the user's access level for a specific widget
   */
  const getAccessLevel = (widgetId: string): 'view' | 'edit' | 'admin' | null => {
    if (widgetAccess.all_access) {
      return 'admin';
    }
    return widgetAccess.permissions[widgetId] || null;
  };

  /**
   * Refresh permissions (useful after permission changes)
   */
  const refresh = () => {
    loadPermissions();
  };

  return {
    widgetAccess,
    loading,
    error,
    hasAccess,
    filterAccessibleWidgets,
    getAccessLevel,
    refresh,
  };
}

/**
 * Higher-order function to wrap a component with widget access control.
 * Only renders the component if the user has the required access level.
 */
export function withWidgetAccess<P extends object>(
  Component: React.ComponentType<P>,
  widgetId: string,
  requiredLevel: 'view' | 'edit' | 'admin' = 'view'
) {
  return function WidgetWithAccess(props: P) {
    const { hasAccess, loading } = useWidgetPermissions();

    if (loading) {
      return null; // Or a loading spinner
    }

    if (!hasAccess(widgetId, requiredLevel)) {
      return null; // Or an access denied message
    }

    return <Component {...props} />;
  };
}

/**
 * Component to conditionally render children based on widget access
 */
interface WidgetAccessGateProps {
  widgetId: string;
  requiredLevel?: 'view' | 'edit' | 'admin';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function WidgetAccessGate({
  widgetId,
  requiredLevel = 'view',
  children,
  fallback = null,
}: WidgetAccessGateProps) {
  const { hasAccess, loading } = useWidgetPermissions();

  if (loading) {
    return <>{fallback}</>;
  }

  if (!hasAccess(widgetId, requiredLevel)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
