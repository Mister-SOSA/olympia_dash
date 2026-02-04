"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import GridDashboard, { GridDashboardHandle } from "./GridDashboard";
import MobileDashboard from "./MobileDashboard";
import DashboardDock from "./DashboardDock";
import DashboardTaskbar, { TASKBAR_HEIGHTS } from "./DashboardTaskbar";
import WidgetPicker from "./WidgetPicker";
import PresetDialog from "./PresetDialog";
import PresetManagerMenu from "./PresetManagerMenu";
import SettingsMenu from "./SettingsMenu";
import OnboardingFlow from "./OnboardingFlow";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { Loader } from "./ui/loader";

// Dashboard extracted components and hooks
import {
  FullscreenWidget,
  useDashboardAuth,
  useDashboardPreferences,
  useDashboardPresets,
  useDashboardLayout,
  useDashboardKeyboard,
  deepClone,
} from "./dashboard-utils";

import type {
  SettingsViewType,
  PresetDialogType,
} from "./dashboard-utils";

// Hooks
import { useIsMobile } from "@/hooks/useMediaQuery";
import { usePresetAutoCycle } from "@/hooks/usePresetAutoCycle";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useSettings } from "@/hooks/useSettings";

// Utils
import {
  savePresetsToStorage,
  saveLayoutToStorage,
  normalizeLayout,
  generatePresetName,
} from "@/utils/layoutUtils";
import { PresetType, DashboardPreset, Widget } from "@/types";

export default function Dashboard() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const gridDashboardRef = useRef<GridDashboardHandle>(null);
  const layoutRef = useRef<Widget[]>([]);

  // ==========================================================================
  // Authentication
  // ==========================================================================
  const {
    checkingAuth,
    isAuthenticated,
    user,
    isImpersonating,
    setUser,
    setIsImpersonating,
    handleLogout,
    handleEndImpersonation,
  } = useDashboardAuth();

  // ==========================================================================
  // UI State
  // ==========================================================================
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsViewType>('account');
  const [presetManagerOpen, setPresetManagerOpen] = useState(false);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [presetDialogType, setPresetDialogType] = useState<PresetDialogType>("create");
  const [presetDialogIndex, setPresetDialogIndex] = useState<number>(0);
  const [isDockVisible, setIsDockVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track whether the user is actively editing (to defer remote updates safely)
  const isEditingRef = useRef(false);
  useEffect(() => {
    isEditingRef.current = menuOpen || settingsOpen || presetManagerOpen || presetDialogOpen || isTransitioning;
  }, [menuOpen, settingsOpen, presetManagerOpen, presetDialogOpen, isTransitioning]);

  // Privacy mode
  const { toggle: togglePrivacy, isPrivate } = usePrivacy();

  // Navigation settings
  const { settings: navSettings } = useSettings();
  const navigationMode = navSettings.navigationMode;
  const taskbarPosition = navSettings.taskbarPosition;
  const taskbarSize = navSettings.taskbarSize;
  const taskbarAutoHide = navSettings.taskbarAutoHide;

  // ==========================================================================
  // Presets Management (declared first - provides state to layout hook)
  // ==========================================================================
  const {
    presets,
    setPresets,
    presetIndex,
    setPresetIndex,
    activePresetIndex,
    setActivePresetIndex,
    currentPresetType,
    setCurrentPresetType,
    presetsRef,
    presetIndexRef,
    loadPresetRef,
    loadPreset,
    handlePresetClick: presetClickHandler,
    handlePresetSave: presetSaveHandler,
    handleCreateBlank,
    handleSaveToPreset,
    quickSavePreset,
    // Layout state is co-located with presets to avoid sync issues
    layout,
    setLayout,
    tempLayout,
    setTempLayout,
    updateTempLayout,
  } = useDashboardPresets({
    setIsTransitioning,
  });

  // ==========================================================================
  // Layout Management (uses preset state from above)
  // ==========================================================================
  const {
    handleExternalLayoutChange,
    handleMenuSave,
  } = useDashboardLayout({
    activePresetIndex,
    presets,
    setPresets,
    setCurrentPresetType,
    setActivePresetIndex,
    layout,
    setLayout,
    tempLayout,
    setTempLayout,
  });

  // ==========================================================================
  // Preferences & Permissions
  // ==========================================================================
  const {
    preferencesReady,
    loadingStage,
    showOnboarding,
    setShowOnboarding,
    permissionsLoading,
    refreshPreferences,
  } = useDashboardPreferences({
    isAuthenticated,
    user,
    layout,
    onLayoutUpdate: setLayout,
    onPresetsUpdate: setPresets,
    onPresetTypeUpdate: setCurrentPresetType,
    onActivePresetIndexUpdate: setActivePresetIndex,
    onUserStateUpdate: (newUser, impersonating) => {
      setUser(newUser);
      setIsImpersonating(impersonating);
    },
    isEditingRef,
  });

  // ==========================================================================
  // Preset Auto-Cycle
  // ==========================================================================
  usePresetAutoCycle({
    presets,
    currentPresetIndex: activePresetIndex,
    onLoadPreset: (index) => loadPresetRef.current?.(index),
    isAnyModalOpen: menuOpen || settingsOpen || presetManagerOpen || presetDialogOpen,
  });

  // ==========================================================================
  // Keyboard Shortcuts
  // ==========================================================================
  useDashboardKeyboard({
    gridDashboardRef,
    presetsRef,
    presetIndexRef,
    layoutRef,
    menuOpen,
    settingsOpen,
    presetManagerOpen,
    presetDialogOpen,
    onToggleMenu: () => {
      if (!menuOpen) {
        updateTempLayout();
      }
      setMenuOpen(prev => !prev);
    },
    onTogglePresetManager: () => setPresetManagerOpen(prev => !prev),
    onToggleSettings: () => {
      setSettingsView('account');
      setSettingsOpen(prev => !prev);
    },
    onLoadPreset: loadPreset,
    onSavePreset: quickSavePreset,
    onUpdateTempLayout: updateTempLayout,
    onTogglePrivacy: togglePrivacy,
    isPrivate,
  });

  // Keep a live ref of layout for keyboard quick-saves
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  // Handle preset click with intelligent dialog
  const handlePresetClick = useCallback((index: number) => {
    const result = presetClickHandler(index);
    if (result.action === 'empty') {
      setPresetDialogType("create");
      setPresetDialogIndex(index);
      setPresetDialogOpen(true);
    }
  }, [presetClickHandler]);

  // Handle preset save (right-click)
  const handlePresetSave = useCallback((index: number) => {
    const result = presetSaveHandler(index);
    // If slot is empty, show create dialog instead of save
    if (result.action === 'save') {
      // Check if current layout has widgets to save
      const hasWidgets = layout.filter(w => w.enabled).length > 0;
      if (!hasWidgets) {
        // No widgets to save, show create dialog
        setPresetDialogType("create");
      } else {
        setPresetDialogType("save");
      }
    } else {
      setPresetDialogType("overwrite");
    }
    setPresetDialogIndex(index);
    setPresetDialogOpen(true);
  }, [presetSaveHandler, layout]);

  // Handle preset create (+ button on dock)
  const handlePresetCreate = useCallback((index: number) => {
    setPresetDialogType("create");
    setPresetDialogIndex(index);
    setPresetDialogOpen(true);
  }, []);

  // Handle creating a preset from current layout (used by Create dialog)
  const handleCreateFromCurrent = useCallback((index: number, type: PresetType) => {
    handleSaveToPreset(index, layout, type);
  }, [handleSaveToPreset, layout]);

  // Handle save from widget menu
  const handleSave = useCallback(() => {
    handleMenuSave();
    setMenuOpen(false);

    // Show toast if preset was updated
    if (activePresetIndex !== null && presets[activePresetIndex]) {
      toast.success(`Saved Preset ${activePresetIndex + 1}`);
    }
  }, [handleMenuSave, activePresetIndex, presets]);

  const handleCancel = useCallback(() => {
    setMenuOpen(false);
  }, []);

  // ==========================================================================
  // Render
  // ==========================================================================

  // Loading state
  if (checkingAuth || !preferencesReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-ui-bg-primary text-ui-text-primary">
        <Loader />
        <div className="text-sm opacity-80">{loadingStage || 'Loading your dashboard...'}</div>
        {!checkingAuth && !permissionsLoading && (
          <button
            className="px-3 py-1 text-sm rounded bg-ui-surface-2 border border-ui-border hover:bg-ui-surface-3"
            onClick={refreshPreferences}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Mobile Experience - Independent layout management
  if (isMobile) {
    return (
      <>
        {/* Onboarding Flow for new users */}
        <OnboardingFlow
          isOpen={showOnboarding}
          user={user}
          onComplete={() => setShowOnboarding(false)}
        />

        {isImpersonating && <ImpersonationBanner onEndImpersonation={handleEndImpersonation} />}
        <div className="dashboard-container mobile" style={isImpersonating ? { paddingTop: '60px' } : {}}>
          {/* Mobile Dashboard - Self-contained with its own layout management */}
          <MobileDashboard
            onSettingsClick={() => {
              setSettingsView('account');
              setSettingsOpen(true);
            }}
          />

          {/* Settings Menu - Unified responsive component */}
          <SettingsMenu
            isOpen={settingsOpen}
            user={user}
            onLogout={handleLogout}
            onClose={() => setSettingsOpen(false)}
            onAdminClick={user?.role === 'admin' ? () => router.push('/admin') : undefined}
            presets={presets}
            initialView={settingsView}
          />
        </div>
      </>
    );
  }

  // Desktop Experience - Original Grid Layout
  return (
    <>
      {/* Onboarding Flow for new users */}
      <OnboardingFlow
        isOpen={showOnboarding}
        user={user}
        onComplete={() => setShowOnboarding(false)}
      />

      {isImpersonating && <ImpersonationBanner onEndImpersonation={handleEndImpersonation} />}
      <div
        className="dashboard-container"
        style={{
          ...(isImpersonating ? { paddingTop: '60px' } : {}),
          ...(navigationMode === 'taskbar' && taskbarPosition === 'top' && !taskbarAutoHide
            ? { paddingTop: isImpersonating ? `${60 + TASKBAR_HEIGHTS[taskbarSize]}px` : `${TASKBAR_HEIGHTS[taskbarSize]}px` }
            : {}),
          ...(navigationMode === 'taskbar' && taskbarPosition === 'bottom' && !taskbarAutoHide
            ? { paddingBottom: `${TASKBAR_HEIGHTS[taskbarSize]}px` }
            : {}),
        }}
      >
        {/* Navigation - Dock or Taskbar based on user preference */}
        {navigationMode === 'dock' ? (
          <DashboardDock
            presets={presets}
            activePresetIndex={activePresetIndex}
            onWidgetsClick={() => {
              setMenuOpen(true);
              updateTempLayout();
            }}
            onPresetManagerClick={() => setPresetManagerOpen(true)}
            onPresetClick={handlePresetClick}
            onPresetSave={handlePresetSave}
            onPresetCreate={handlePresetCreate}
            onSettingsClick={(view?: SettingsViewType) => {
              setSettingsView(view || 'account');
              setSettingsOpen(true);
            }}
            onVisibilityChange={setIsDockVisible}
          />
        ) : (
          <DashboardTaskbar
            presets={presets}
            activePresetIndex={activePresetIndex}
            onWidgetsClick={() => {
              setMenuOpen(true);
              updateTempLayout();
            }}
            onPresetManagerClick={() => setPresetManagerOpen(true)}
            onPresetClick={handlePresetClick}
            onPresetSave={handlePresetSave}
            onPresetCreate={handlePresetCreate}
            onSettingsClick={(view?: SettingsViewType) => {
              setSettingsView(view || 'account');
              setSettingsOpen(true);
            }}
            onVisibilityChange={setIsDockVisible}
          />
        )}

        {/* Preset Manager */}
        <PresetManagerMenu
          isOpen={presetManagerOpen}
          onClose={() => setPresetManagerOpen(false)}
          presets={presets}
          activePresetIndex={activePresetIndex}
          onLoadPreset={loadPreset}
          onSavePreset={(index, layoutToSave, presetType, name, description) => {
            const newPresets = [...presets];
            const existingPreset = newPresets[index];
            const now = new Date().toISOString();
            const normalizedLayout = normalizeLayout(layoutToSave);

            newPresets[index] = {
              type: presetType,
              layout: deepClone(normalizedLayout),
              name: name || generatePresetName(normalizedLayout),
              description: description || "",
              createdAt: existingPreset?.createdAt || now,
              updatedAt: now
            };
            setPresets(newPresets);
            savePresetsToStorage(newPresets);
            setActivePresetIndex(index);
            setPresetIndex(index);
            setLayout(normalizedLayout);
            saveLayoutToStorage(normalizedLayout, { source: 'preset-load' });
            toast.success(`Saved ${presetType === "fullscreen" ? "Fullscreen" : "Grid"} Preset ${index + 1}`);
          }}
          onUpdatePreset={(index, updates) => {
            const newPresets = [...presets];
            if (newPresets[index]) {
              newPresets[index] = {
                ...newPresets[index]!,
                ...updates,
                updatedAt: new Date().toISOString()
              };
              setPresets(newPresets);
              savePresetsToStorage(newPresets);
              toast.success(`Updated Preset ${index + 1}`);
            }
          }}
          onClearPreset={(index) => {
            const newPresets = [...presets];
            newPresets[index] = null;
            setPresets(newPresets);
            savePresetsToStorage(newPresets);
            if (activePresetIndex === index) {
              setActivePresetIndex(null);
            }
            toast.warning(`Cleared Preset ${index + 1}`);
          }}
          onCreateBlank={handleCreateBlank}
          onOpenWidgetMenu={() => {
            setMenuOpen(true);
            updateTempLayout();
          }}
          currentLayout={layout}
        />

        {/* Intelligent Preset Dialog */}
        <PresetDialog
          isOpen={presetDialogOpen}
          onClose={() => setPresetDialogOpen(false)}
          dialogType={presetDialogType}
          presetIndex={presetDialogIndex}
          currentLayout={layout}
          onCreateBlank={handleCreateBlank}
          onCreateFromCurrent={handleCreateFromCurrent}
          onSavePreset={handleSaveToPreset}
          onLoadPreset={loadPreset}
          onOpenWidgetMenu={() => {
            setMenuOpen(true);
            updateTempLayout();
          }}
        />

        {/* Widget Menu Modal */}
        <WidgetPicker
          isOpen={menuOpen}
          tempLayout={tempLayout}
          setTempLayout={setTempLayout}
          handleSave={handleSave}
          handleCancel={handleCancel}
          activePresetName={
            activePresetIndex !== null && presets[activePresetIndex]
              ? presets[activePresetIndex]!.name || `Preset ${activePresetIndex + 1}`
              : undefined
          }
        />

        {/* Settings Menu Modal */}
        <SettingsMenu
          isOpen={settingsOpen}
          user={user}
          onLogout={handleLogout}
          onClose={() => setSettingsOpen(false)}
          onAdminClick={user?.role === 'admin' ? () => router.push('/admin') : undefined}
          presets={presets}
          initialView={settingsView}
        />

        <motion.div
          animate={{ opacity: isTransitioning ? 0 : 1 }}
          transition={{
            duration: 0.2,
            ease: [0.4, 0.0, 0.2, 1] // Apple-like ease curve
          }}
          style={{
            width: '100%',
            height: '100%',
          }}
          className={isTransitioning ? 'transitioning-preset' : ''}
        >
          <GridDashboard
            ref={gridDashboardRef}
            layout={layout.filter((widget) => widget.enabled)}
            onExternalLayoutChange={handleExternalLayoutChange}
            onAddWidget={() => {
              setMenuOpen(true);
              updateTempLayout();
            }}
            onOpenSettings={() => {
              setSettingsView('account');
              setSettingsOpen(true);
            }}
            isDockVisible={isDockVisible}
          />

          {/* Fullscreen Widget Overlay */}
          {currentPresetType === "fullscreen" && layout.filter(w => w.enabled).length === 1 && (
            <FullscreenWidget layout={layout} />
          )}
        </motion.div>
      </div>
    </>
  );
}
