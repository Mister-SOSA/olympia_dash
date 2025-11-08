import { useWidgetPermissions as useWidgetPermissionsContext } from '@/contexts/WidgetPermissionsContext';

/**
 * Hook to check if the current user has access to specific widgets.
 * Admins automatically have access to all widgets.
 * 
 * @deprecated Use the context directly via import from @/contexts/WidgetPermissionsContext
 */
export function useWidgetPermissions() {
  return useWidgetPermissionsContext();
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
    const { hasAccess, loading } = useWidgetPermissionsContext();

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
  const { hasAccess, loading } = useWidgetPermissionsContext();

  if (loading) {
    return <>{fallback}</>;
  }

  if (!hasAccess(widgetId, requiredLevel)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
