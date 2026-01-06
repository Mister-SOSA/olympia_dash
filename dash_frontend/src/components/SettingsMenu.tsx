'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useMemo } from "react";
import { User } from "@/lib/auth";
import { useTheme, THEMES, Theme } from "@/contexts/ThemeContext";
import { DashboardPreset } from "@/types";
import { useSettings } from "@/hooks/useSettings";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { ConfirmModal } from "@/components/ui/modal";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { MdClose, MdSettings, MdChevronLeft } from "react-icons/md";

// Extracted settings components
import {
  NAVIGATION_ITEMS,
  getBadgeColors,
  MobileMainMenu,
  NuclearModal,
  SettingsContent,
} from "./settings";
import type { SettingsView } from "./settings";

// =============================================================================
// Props
// =============================================================================

interface SettingsMenuProps {
  user: User | null;
  onLogout: () => void;
  onClose: () => void;
  onAdminClick?: () => void;
  presets?: Array<DashboardPreset | null>;
  initialView?: SettingsView;
}

// =============================================================================
// Main Component
// =============================================================================

export default function SettingsMenu({ 
  user, 
  onLogout, 
  onClose, 
  onAdminClick, 
  presets = [], 
  initialView = 'account' 
}: SettingsMenuProps) {
  const { theme, setTheme } = useTheme();
  const { settings, updateSetting, isLoaded } = useSettings();
  const { settings: privacySettings, updateSetting: updatePrivacySetting, toggle: togglePrivacy } = usePrivacy();
  const [activeView, setActiveView] = useState<SettingsView>(initialView);
  const [themeCategory, setThemeCategory] = useState<'dark' | 'light'>(
    THEMES.find(t => t.id === theme)?.category as 'dark' | 'light' || 'dark'
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Local state for grid settings
  const [localGridColumns, setLocalGridColumns] = useState(settings.gridColumns);
  const [localGridCellHeight, setLocalGridCellHeight] = useState(settings.gridCellHeight);

  // State for Advanced section modals
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'warning' | 'danger' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'warning' });
  const [nuclearInput, setNuclearInput] = useState('');
  const [showNuclearModal, setShowNuclearModal] = useState(false);

  // Calculate available presets
  const availablePresets = useMemo(() => {
    return presets.map((preset, index) => ({
      index,
      preset,
      isValid: preset !== null && preset.layout.some(w => w.enabled),
      name: preset?.name || `Preset ${index + 1}`,
      widgetCount: preset?.layout.filter(w => w.enabled).length || 0,
    })).filter(p => p.isValid);
  }, [presets]);

  useEffect(() => {
    setLocalGridColumns(settings.gridColumns);
    setLocalGridCellHeight(settings.gridCellHeight);
  }, [settings.gridColumns, settings.gridCellHeight]);

  // Scroll to top when view changes
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeView]);

  // Handle back navigation on mobile
  const handleMobileBack = () => {
    setActiveView('account');
  };

  if (!isLoaded) {
    return null;
  }

  // ==========================================================================
  // Mobile Layout
  // ==========================================================================
  if (isMobile) {
    return (
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "tween", duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        className="fixed inset-0 z-50 bg-ui-bg-primary flex flex-col"
        style={{ willChange: 'transform' }}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ui-border-primary bg-ui-bg-secondary/50 safe-top">
          {activeView !== 'account' ? (
            <button
              onClick={handleMobileBack}
              className="flex items-center gap-1 text-ui-accent-primary"
            >
              <MdChevronLeft className="w-6 h-6" />
              <span className="text-sm font-medium">Settings</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <MdSettings className="w-5 h-5 text-ui-accent-primary" />
              <h2 className="text-lg font-semibold text-ui-text-primary">Settings</h2>
            </div>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-ui-bg-tertiary transition-colors"
            aria-label="Close"
          >
            <MdClose className="w-5 h-5 text-ui-text-secondary" />
          </button>
        </div>

        {/* Mobile Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          {activeView === 'account' ? (
            <MobileMainMenu
              key="main"
              user={user}
              onNavigate={setActiveView}
              onLogout={onLogout}
              onAdminClick={onAdminClick}
              privacyEnabled={privacySettings.enabled}
            />
          ) : (
            <div className="p-4 pb-8">
              <SettingsContent
                activeView={activeView}
                user={user}
                onLogout={onLogout}
                onAdminClick={onAdminClick}
                theme={theme}
                setTheme={setTheme}
                themeCategory={themeCategory}
                setThemeCategory={setThemeCategory}
                settings={settings}
                updateSetting={updateSetting}
                privacySettings={privacySettings}
                updatePrivacySetting={updatePrivacySetting}
                togglePrivacy={togglePrivacy}
                localGridColumns={localGridColumns}
                setLocalGridColumns={setLocalGridColumns}
                localGridCellHeight={localGridCellHeight}
                setLocalGridCellHeight={setLocalGridCellHeight}
                availablePresets={availablePresets}
                presets={presets}
                confirmModal={confirmModal}
                setConfirmModal={setConfirmModal}
                nuclearInput={nuclearInput}
                setNuclearInput={setNuclearInput}
                showNuclearModal={showNuclearModal}
                setShowNuclearModal={setShowNuclearModal}
                isMobile={true}
              />
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          confirmText="Confirm"
          cancelText="Cancel"
        />

        {/* Nuclear Modal */}
        <NuclearModal
          isOpen={showNuclearModal}
          onClose={() => {
            setShowNuclearModal(false);
            setNuclearInput('');
          }}
          nuclearInput={nuclearInput}
          setNuclearInput={setNuclearInput}
        />
      </motion.div>
    );
  }

  // ==========================================================================
  // Desktop Layout
  // ==========================================================================
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl h-[85vh] max-h-[700px] flex"
      >
        <div className="bg-ui-bg-primary rounded-2xl shadow-2xl border border-ui-border-primary overflow-hidden flex w-full">
          {/* Sidebar Navigation */}
          <div className="w-56 bg-ui-bg-secondary/30 border-r border-ui-border-primary flex flex-col flex-shrink-0">
            {/* Header */}
            <div className="px-5 py-5 border-b border-ui-border-primary">
              <h2 className="text-lg font-bold text-ui-text-primary">Settings</h2>
              <p className="text-xs text-ui-text-tertiary mt-0.5">Customize dashboard</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-3">
              <div className="space-y-1">
                {NAVIGATION_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  const showBadge = item.id === 'privacy' && privacySettings.enabled;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-ui-accent-primary text-white shadow-sm'
                          : 'text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-secondary'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge && !showBadge && (
                        <span
                          className="inline-flex items-center px-1 py-0 rounded text-[9px] font-medium border"
                          style={isActive
                            ? { backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.2)' }
                            : getBadgeColors(item.badge)
                          }
                        >
                          {item.badge}
                        </span>
                      )}
                      {showBadge && (
                        <div className="w-2 h-2 rounded-full bg-ui-accent-secondary flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Close Button */}
            <div className="p-3 border-t border-ui-border-primary">
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-secondary transition-all"
              >
                <MdClose className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={contentRef} className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="p-6"
                >
                  <SettingsContent
                    activeView={activeView}
                    user={user}
                    onLogout={onLogout}
                    onAdminClick={onAdminClick}
                    theme={theme}
                    setTheme={setTheme}
                    themeCategory={themeCategory}
                    setThemeCategory={setThemeCategory}
                    settings={settings}
                    updateSetting={updateSetting}
                    privacySettings={privacySettings}
                    updatePrivacySetting={updatePrivacySetting}
                    togglePrivacy={togglePrivacy}
                    localGridColumns={localGridColumns}
                    setLocalGridColumns={setLocalGridColumns}
                    localGridCellHeight={localGridCellHeight}
                    setLocalGridCellHeight={setLocalGridCellHeight}
                    availablePresets={availablePresets}
                    presets={presets}
                    confirmModal={confirmModal}
                    setConfirmModal={setConfirmModal}
                    nuclearInput={nuclearInput}
                    setNuclearInput={setNuclearInput}
                    showNuclearModal={showNuclearModal}
                    setShowNuclearModal={setShowNuclearModal}
                    isMobile={false}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Confirm"
        cancelText="Cancel"
      />

      {/* Nuclear Modal */}
      <NuclearModal
        isOpen={showNuclearModal}
        onClose={() => {
          setShowNuclearModal(false);
          setNuclearInput('');
        }}
        nuclearInput={nuclearInput}
        setNuclearInput={setNuclearInput}
      />
    </motion.div>
  );
}
