"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Widget, DashboardPreset, PresetType } from "@/types";
import { authService } from "@/lib/auth";
import { preferencesService, migrateFromLocalStorage } from "@/lib/preferences";
import { useWidgetPermissions } from "@/hooks/useWidgetPermissions";
import {
  readLayoutFromStorage,
  saveLayoutToStorage,
  readPresetsFromStorage,
  readCurrentPresetType,
  readActivePresetIndex,
  normalizeLayout,
  detectStructuralChanges,
  describeSource,
  type LayoutUpdateSource,
} from "@/utils/layoutUtils";

interface UseDashboardPreferencesOptions {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Current user for logging */
  user: { email?: string; id?: number | string } | null;
  /** Current layout for detecting remote changes */
  layout: Widget[];
  /** Callback when layout updates from remote */
  onLayoutUpdate: (layout: Widget[]) => void;
  /** Callback when presets update from remote */
  onPresetsUpdate: (presets: Array<DashboardPreset | null>) => void;
  /** Callback when preset type updates from remote */
  onPresetTypeUpdate: (type: PresetType) => void;
  /** Callback when active preset index updates from remote */
  onActivePresetIndexUpdate: (index: number | null) => void;
  /** Callback when user/impersonation state changes */
  onUserStateUpdate: (user: ReturnType<typeof authService.getUser>, isImpersonating: boolean) => void;
}

interface UseDashboardPreferencesReturn {
  /** Whether preferences are fully loaded and ready */
  preferencesReady: boolean;
  /** Whether to show onboarding flow */
  showOnboarding: boolean;
  /** Set onboarding visibility */
  setShowOnboarding: (show: boolean) => void;
  /** Widget permissions loading state */
  permissionsLoading: boolean;
  /** Check if user has access to a widget */
  hasAccess: (widgetId: string, permission: 'view' | 'edit' | 'admin') => boolean;
  /** Full widget access info */
  widgetAccess: { all_access: boolean; permissions: Record<string, 'view' | 'edit' | 'admin'> };
  /** Refresh widget permissions */
  refreshWidgetPermissions: () => Promise<void>;
}

/**
 * Hook to manage dashboard preferences initialization and synchronization
 * 
 * Handles:
 * - Initial preferences load and migration
 * - Server sync with retry logic
 * - Real-time preference updates from other sessions
 * - Widget permissions management
 * - Onboarding state
 */
export function useDashboardPreferences({
  isAuthenticated,
  user,
  layout,
  onLayoutUpdate,
  onPresetsUpdate,
  onPresetTypeUpdate,
  onActivePresetIndexUpdate,
  onUserStateUpdate,
}: UseDashboardPreferencesOptions): UseDashboardPreferencesReturn {
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Widget permissions
  const {
    hasAccess,
    widgetAccess,
    loading: permissionsLoading,
    refresh: refreshWidgetPermissions
  } = useWidgetPermissions();

  // Track if preferences have been initialized to prevent duplicate loads
  const preferencesInitialized = useRef(false);

  // Ensure widget permissions are refreshed once authentication succeeds
  useEffect(() => {
    if (!isAuthenticated) return;

    refreshWidgetPermissions().catch((error) => {
      console.error('Failed to refresh widget permissions after auth:', error);
    });
  }, [isAuthenticated, refreshWidgetPermissions]);

  // Clean up unauthorized widgets from layout when permissions change
  useEffect(() => {
    // Skip if permissions not loaded yet or user has all access
    if (permissionsLoading || widgetAccess.all_access) return;
    // Skip if layout is empty
    if (layout.length === 0) return;

    // Find enabled widgets that user no longer has access to
    const unauthorizedWidgets = layout.filter(
      w => w.enabled && !hasAccess(w.id, 'view')
    );

    if (unauthorizedWidgets.length > 0) {
      console.log('[Dashboard] Removing unauthorized widgets:', unauthorizedWidgets.map(w => w.id));

      // Disable (remove) unauthorized widgets from layout
      const cleanedLayout = layout.map(w => {
        if (unauthorizedWidgets.some(uw => uw.id === w.id)) {
          return { ...w, enabled: false };
        }
        return w;
      });

      // Update layout state
      onLayoutUpdate(cleanedLayout);

      // Save to preferences
      saveLayoutToStorage(cleanedLayout, { source: 'widget-remove', sync: true });
    }
  }, [widgetAccess, permissionsLoading, layout, hasAccess, onLayoutUpdate]);

  // Sync preferences from server and migrate old localStorage data
  useEffect(() => {
    // Only initialize once
    if (!isAuthenticated || permissionsLoading || preferencesInitialized.current) return;

    const initPreferences = async () => {
      preferencesInitialized.current = true;

      console.log('🚀 Initializing dashboard preferences...');
      console.log(`   User: ${user?.email} (ID: ${user?.id})`);
      console.log(`   Impersonating: ${authService.isImpersonating()}`);
      if (authService.isImpersonating()) {
        console.log(`   Admin: ${authService.getAdminUser()?.email}`);
        console.log(`   Target: ${authService.getImpersonatedUser()?.email}`);
      }

      // Migrate old localStorage preferences to new system
      await migrateFromLocalStorage();

      // Sync preferences from server - retry up to 3 times if it fails
      let syncSuccess = false;
      for (let attempt = 1; attempt <= 3 && !syncSuccess; attempt++) {
        try {
          await preferencesService.syncOnLogin();
          // Verify data was actually loaded
          syncSuccess = preferencesService.isLoaded();
          if (!syncSuccess && attempt < 3) {
            console.warn(`[Dashboard] Sync attempt ${attempt} completed but data not loaded, retrying...`);
          }
        } catch (error) {
          console.error(`[Dashboard] Preferences sync attempt ${attempt} failed:`, error);
        }
        if (!syncSuccess && attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Exponential backoff
        }
      }

      if (!syncSuccess) {
        console.warn('[Dashboard] All sync attempts failed, using cached/default preferences');
      } else {
        console.log('[Dashboard] Preferences synced successfully');
      }

      // Check if user has completed onboarding
      const onboardingCompleted = preferencesService.get<boolean>('onboarding.completed', false);
      console.log(`📋 Onboarding check: completed=${onboardingCompleted}, isImpersonating=${authService.isImpersonating()}`);
      console.log(`   All onboarding prefs:`, {
        completed: preferencesService.get('onboarding.completed'),
        skipped: preferencesService.get('onboarding.skipped'),
        completedAt: preferencesService.get('onboarding.completedAt'),
      });
      if (!onboardingCompleted && !authService.isImpersonating()) {
        console.log('📋 New user detected - showing onboarding flow');
        setShowOnboarding(true);
      }

      console.log('📊 Loading dashboard state from preferences...');

      // Load preferences into state
      const storedLayout = readLayoutFromStorage();
      const normalizedLayout = normalizeLayout(storedLayout);
      onLayoutUpdate(normalizedLayout);
      console.log(`   Layout: ${normalizedLayout.filter(w => w.enabled).length} enabled widgets`);

      const loadedPresets = readPresetsFromStorage();
      onPresetsUpdate(loadedPresets);
      const presetCount = loadedPresets.filter(p => p !== null).length;
      console.log(`   Presets: ${presetCount}/9 slots filled`);

      // Restore the last used preset type
      const storedPresetType = readCurrentPresetType();
      onPresetTypeUpdate(storedPresetType as PresetType);

      // Restore the active preset index
      const storedActiveIndex = readActivePresetIndex();
      onActivePresetIndexUpdate(storedActiveIndex);

      // Mark preferences as ready AFTER all data is loaded
      setPreferencesReady(true);
      console.log('✅ Dashboard initialization complete');
    };

    initPreferences();
  }, [isAuthenticated, permissionsLoading, user, onLayoutUpdate, onPresetsUpdate, onPresetTypeUpdate, onActivePresetIndexUpdate]);

  // Subscribe to real-time preference changes from other sessions AND user switches
  useEffect(() => {
    if (!isAuthenticated) return;

    // Track initial grid settings to detect changes
    const initialGridColumns = preferencesService.get('grid.columns', 11) as number;
    const initialGridCellHeight = preferencesService.get('grid.cellHeight', 80) as number;

    const unsubscribe = preferencesService.subscribe((isRemote: boolean, changedKeys?: string[]) => {
      // IGNORE local changes - state is already updated directly by the caller
      // Only react to REMOTE changes from other sessions
      if (!isRemote) {
        return;
      }

      console.log('[Dashboard] Remote preferences change detected...', changedKeys);

      // Check for grid setting changes that require reload
      const newGridColumns = preferencesService.get('grid.columns', 11) as number;
      const newGridCellHeight = preferencesService.get('grid.cellHeight', 80) as number;

      if (newGridColumns !== initialGridColumns || newGridCellHeight !== initialGridCellHeight) {
        console.log('[Dashboard] Grid settings changed from another session, reloading...');
        window.location.reload();
        return;
      }

      // Only update state for keys that changed
      if (!changedKeys || changedKeys.length === 0 || changedKeys.includes('dashboard')) {
        const storedLayout = readLayoutFromStorage();
        const normalizedLayout = normalizeLayout(storedLayout);

        // Check if this is a structural change (widgets added/removed) for logging
        const structuralChanges = detectStructuralChanges(layout, normalizedLayout);

        // Check the source metadata to understand WHY the originating session made this change
        const layoutMeta = preferencesService.get<{ source?: LayoutUpdateSource, sessionId?: string }>('dashboard.layoutMeta');
        const originalSource: LayoutUpdateSource = layoutMeta?.source || 'remote-sync';

        console.log(`[Dashboard] Remote layout update: originalSource=${describeSource(originalSource)}, structural=${structuralChanges.widgetsAdded || structuralChanges.widgetsRemoved}`);

        if (structuralChanges.addedIds.length > 0) {
          console.log(`[Dashboard] Widgets added remotely: ${structuralChanges.addedIds.join(', ')}`);
        }
        if (structuralChanges.removedIds.length > 0) {
          console.log(`[Dashboard] Widgets removed remotely: ${structuralChanges.removedIds.join(', ')}`);
        }

        // Apply the remote layout
        onLayoutUpdate(normalizedLayout);

        // Sync presets and other metadata
        onPresetsUpdate(readPresetsFromStorage());
        onPresetTypeUpdate(readCurrentPresetType() as PresetType);
        onActivePresetIndexUpdate(readActivePresetIndex());
      }

      // Update user state to reflect impersonation changes
      onUserStateUpdate(authService.getUser(), authService.isImpersonating());

      console.log('[Dashboard] State updated from remote');
    });

    return unsubscribe;
  }, [isAuthenticated, layout, onLayoutUpdate, onPresetsUpdate, onPresetTypeUpdate, onActivePresetIndexUpdate, onUserStateUpdate]);

  return {
    preferencesReady,
    showOnboarding,
    setShowOnboarding,
    permissionsLoading,
    hasAccess,
    widgetAccess,
    refreshWidgetPermissions,
  };
}

export default useDashboardPreferences;
