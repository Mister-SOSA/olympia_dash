"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Bug, Copy, Trash2, RefreshCw, Download, Upload, Zap, Eye, EyeOff,
  AlertTriangle, ChevronRight, ChevronDown,
  Layout, Layers, Users, Shuffle, Grid3X3, Maximize2,
  RotateCcw, Play, LogOut,
  Wand2, TestTube, Wifi, WifiOff, 
  ArrowUpDown, Send, Settings2, Gauge, Box, Boxes
} from "lucide-react";
import { toast } from "sonner";
import { preferencesService } from "@/lib/preferences";
import { authService } from "@/lib/auth";
import { API_BASE_URL } from "@/config";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Widget, DashboardPreset } from "@/types";
import { 
  WIDGET_CONFIGS, 
  CATEGORY_ORDER 
} from "@/components/widgets/registry";
import { 
  normalizeLayout, 
  savePresetsToStorage,
} from "@/utils/layoutUtils";

// =============================================================================
// Types
// =============================================================================

interface DebugMenuProps {
  isOpen: boolean;
  onClose: () => void;
  layout?: Widget[];
  presets?: (DashboardPreset | null)[];
  user?: any;
  // Callbacks to actually modify dashboard state
  onLayoutChange?: (layout: Widget[]) => void;
  onPresetsChange?: (presets: (DashboardPreset | null)[]) => void;
  onPresetLoad?: (index: number) => void;
  onForceRefresh?: () => void;
}

interface DebugSection {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// =============================================================================
// Sections
// =============================================================================

const SECTIONS: DebugSection[] = [
  { id: 'quick-actions', label: 'Quick Actions', icon: <Zap size={16} /> },
  { id: 'layout', label: 'Layout Tools', icon: <Layout size={16} /> },
  { id: 'presets', label: 'Preset Tools', icon: <Layers size={16} /> },
  { id: 'user', label: 'User & Auth', icon: <Users size={16} /> },
  { id: 'preferences', label: 'Preferences', icon: <Settings2 size={16} /> },
  { id: 'api', label: 'API Testing', icon: <Send size={16} /> },
  { id: 'experiments', label: 'Experiments', icon: <TestTube size={16} /> },
];

// =============================================================================
// Utility Components
// =============================================================================

function ActionButton({ 
  icon, 
  label, 
  onClick, 
  variant = 'default',
  disabled = false,
  loading = false,
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success' | 'warning';
  disabled?: boolean;
  loading?: boolean;
}) {
  const variants = {
    default: "bg-ui-bg-tertiary hover:bg-ui-bg-quaternary text-ui-text-primary",
    danger: "bg-ui-danger-bg hover:bg-ui-danger-bg/80 text-ui-danger-text border-ui-danger-border",
    success: "bg-ui-success-bg hover:bg-ui-success-bg/80 text-ui-success-text border-ui-success-border",
    warning: "bg-ui-warning-bg hover:bg-ui-warning-bg/80 text-ui-warning-text border-ui-warning-border",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border border-ui-border-primary text-sm transition-all",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant]
      )}
    >
      {loading ? <RefreshCw size={14} className="animate-spin" /> : icon}
      <span>{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon, color = "blue" }: { 
  label: string; 
  value: string | number; 
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="bg-ui-bg-secondary rounded-lg p-3 border border-ui-border-primary">
      <div className="flex items-center gap-2 text-xs text-ui-text-secondary mb-1">
        {icon}
        {label}
      </div>
      <div className={cn("text-xl font-bold", `text-${color}-400`)}>{value}</div>
    </div>
  );
}

// =============================================================================
// Section Components
// =============================================================================

function QuickActionsSection({ 
  layout, 
  presets, 
  onLayoutChange,
  onPresetsChange,
  onForceRefresh,
}: {
  layout?: Widget[];
  presets?: (DashboardPreset | null)[];
  onLayoutChange?: (layout: Widget[]) => void;
  onPresetsChange?: (presets: (DashboardPreset | null)[]) => void;
  onForceRefresh?: () => void;
}) {
  const enabledCount = layout?.filter(w => w.enabled).length || 0;
  const totalWidgets = WIDGET_CONFIGS.length;
  const activePresets = presets?.filter(p => p !== null).length || 0;

  const handleEnableAllWidgets = () => {
    if (!layout || !onLayoutChange) return;
    const newLayout = layout.map(w => ({ ...w, enabled: true }));
    onLayoutChange(newLayout);
    toast.success(`Enabled all ${totalWidgets} widgets`);
  };

  const handleDisableAllWidgets = () => {
    if (!layout || !onLayoutChange) return;
    const newLayout = layout.map(w => ({ ...w, enabled: false }));
    onLayoutChange(newLayout);
    toast.success('Disabled all widgets');
  };

  const handleRandomLayout = () => {
    if (!layout || !onLayoutChange) return;
    // Randomly enable 5-10 widgets
    const count = Math.floor(Math.random() * 6) + 5;
    const shuffled = [...WIDGET_CONFIGS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count).map(w => w.id);
    
    const newLayout = layout.map(w => ({
      ...w,
      enabled: selected.includes(w.id),
      x: Math.floor(Math.random() * 8),
      y: Math.floor(Math.random() * 10),
    }));
    onLayoutChange(newLayout);
    toast.success(`Randomized layout with ${count} widgets`);
  };

  const handleClearAllPresets = () => {
    if (!onPresetsChange) return;
    const emptyPresets = Array(9).fill(null);
    onPresetsChange(emptyPresets);
    savePresetsToStorage(emptyPresets);
    toast.warning('Cleared all presets');
  };

  const handleResetToDefaults = async () => {
    // Clear all local storage related to dashboard
    const keysToRemove = Object.keys(localStorage).filter(k => 
      k.includes('layout') || k.includes('preset') || k.includes('preferences')
    );
    keysToRemove.forEach(k => localStorage.removeItem(k));
    toast.success('Reset to defaults - refreshing...');
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard 
          label="Enabled Widgets" 
          value={`${enabledCount}/${totalWidgets}`} 
          icon={<Box size={12} />}
          color="blue"
        />
        <StatCard 
          label="Active Presets" 
          value={`${activePresets}/9`} 
          icon={<Layers size={12} />}
          color="purple"
        />
        <StatCard 
          label="Widget Types" 
          value={WIDGET_CONFIGS.length} 
          icon={<Boxes size={12} />}
          color="green"
        />
      </div>

      {/* Quick Toggle Actions */}
      <div className="grid grid-cols-2 gap-2">
        <ActionButton
          icon={<Eye size={14} />}
          label="Enable All Widgets"
          onClick={handleEnableAllWidgets}
          variant="success"
        />
        <ActionButton
          icon={<EyeOff size={14} />}
          label="Disable All Widgets"
          onClick={handleDisableAllWidgets}
          variant="warning"
        />
        <ActionButton
          icon={<Shuffle size={14} />}
          label="Random Layout"
          onClick={handleRandomLayout}
        />
        <ActionButton
          icon={<RefreshCw size={14} />}
          label="Force Refresh"
          onClick={() => {
            onForceRefresh?.();
            window.location.reload();
          }}
        />
      </div>

      {/* Danger Zone */}
      <div className="border border-red-500/30 rounded-lg p-3 bg-red-500/5">
        <div className="text-xs text-red-400 font-medium mb-2 flex items-center gap-1">
          <AlertTriangle size={12} />
          Danger Zone
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            icon={<Trash2 size={14} />}
            label="Clear All Presets"
            onClick={handleClearAllPresets}
            variant="danger"
          />
          <ActionButton
            icon={<RotateCcw size={14} />}
            label="Factory Reset"
            onClick={handleResetToDefaults}
            variant="danger"
          />
        </div>
      </div>
    </div>
  );
}

function LayoutToolsSection({ 
  layout, 
  onLayoutChange 
}: {
  layout?: Widget[];
  onLayoutChange?: (layout: Widget[]) => void;
}) {
  const handleAddByCategory = (category: string) => {
    if (!layout || !onLayoutChange) return;
    const categoryWidgets = WIDGET_CONFIGS.filter(w => w.category === category);
    const newLayout = layout.map(w => {
      const isInCategory = categoryWidgets.some(cw => cw.id === w.id);
      return isInCategory ? { ...w, enabled: true } : w;
    });
    onLayoutChange(newLayout);
    toast.success(`Enabled all ${category} widgets`);
  };

  const handleCompactLayout = () => {
    if (!layout || !onLayoutChange) return;
    const enabledWidgets = layout.filter(w => w.enabled);
    
    const compacted = layout.map(w => {
      if (!w.enabled) return w;
      const idx = enabledWidgets.findIndex(ew => ew.id === w.id);
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      return {
        ...w,
        x: col * 4,
        y: row * 3,
        w: 4,
        h: 3,
      };
    });
    
    onLayoutChange(compacted);
    toast.success('Compacted layout into grid');
  };

  const handleExpandToFill = () => {
    if (!layout || !onLayoutChange) return;
    const enabledWidgets = layout.filter(w => w.enabled);
    if (enabledWidgets.length !== 1) {
      toast.error('Select exactly 1 widget to expand');
      return;
    }
    
    const newLayout = layout.map(w => 
      w.enabled ? { ...w, x: 0, y: 0, w: 12, h: 8 } : w
    );
    onLayoutChange(newLayout);
    toast.success('Expanded widget to fill screen');
  };

  const handleStackVertically = () => {
    if (!layout || !onLayoutChange) return;
    let currentY = 0;
    const newLayout = layout.map(w => {
      if (!w.enabled) return w;
      const widget = { ...w, x: 0, y: currentY, w: 12 };
      currentY += w.h;
      return widget;
    });
    onLayoutChange(newLayout);
    toast.success('Stacked widgets vertically');
  };

  const handleUniformSize = (size: 'small' | 'medium' | 'large') => {
    if (!layout || !onLayoutChange) return;
    const sizes = { small: { w: 3, h: 2 }, medium: { w: 4, h: 4 }, large: { w: 6, h: 5 } };
    const { w, h } = sizes[size];
    
    const newLayout = layout.map(widget => 
      widget.enabled ? { ...widget, w, h } : widget
    );
    onLayoutChange(newLayout);
    toast.success(`Set all widgets to ${size} size`);
  };

  return (
    <div className="space-y-4">
      {/* Add by Category */}
      <div>
        <div className="text-xs text-ui-text-secondary mb-2">Add Widgets by Category</div>
        <div className="flex flex-wrap gap-1">
          {CATEGORY_ORDER.map(cat => (
            <button
              key={cat}
              onClick={() => handleAddByCategory(cat)}
              className="px-2 py-1 text-xs bg-ui-bg-tertiary hover:bg-ui-bg-quaternary rounded border border-ui-border-primary"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Layout Manipulation */}
      <div className="grid grid-cols-2 gap-2">
        <ActionButton
          icon={<Grid3X3 size={14} />}
          label="Compact Grid"
          onClick={handleCompactLayout}
        />
        <ActionButton
          icon={<Maximize2 size={14} />}
          label="Expand Single"
          onClick={handleExpandToFill}
        />
        <ActionButton
          icon={<ArrowUpDown size={14} />}
          label="Stack Vertical"
          onClick={handleStackVertically}
        />
      </div>

      {/* Uniform Sizing */}
      <div>
        <div className="text-xs text-ui-text-secondary mb-2">Set Uniform Size</div>
        <div className="flex gap-2">
          <button
            onClick={() => handleUniformSize('small')}
            className="flex-1 px-2 py-1 text-xs bg-ui-bg-tertiary hover:bg-ui-bg-quaternary rounded border border-ui-border-primary"
          >
            Small (3×2)
          </button>
          <button
            onClick={() => handleUniformSize('medium')}
            className="flex-1 px-2 py-1 text-xs bg-ui-bg-tertiary hover:bg-ui-bg-quaternary rounded border border-ui-border-primary"
          >
            Medium (4×4)
          </button>
          <button
            onClick={() => handleUniformSize('large')}
            className="flex-1 px-2 py-1 text-xs bg-ui-bg-tertiary hover:bg-ui-bg-quaternary rounded border border-ui-border-primary"
          >
            Large (6×5)
          </button>
        </div>
      </div>
    </div>
  );
}

function PresetToolsSection({ 
  layout,
  presets, 
  onPresetsChange,
  onPresetLoad,
}: {
  layout?: Widget[];
  presets?: (DashboardPreset | null)[];
  onPresetsChange?: (presets: (DashboardPreset | null)[]) => void;
  onPresetLoad?: (index: number) => void;
}) {
  const handleExportPresets = () => {
    if (!presets) return;
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      presets: presets,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `olympia-presets-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Presets exported');
  };

  const handleImportPresets = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.presets && Array.isArray(data.presets)) {
          onPresetsChange?.(data.presets);
          savePresetsToStorage(data.presets);
          toast.success('Presets imported');
        } else {
          toast.error('Invalid preset file format');
        }
      } catch {
        toast.error('Failed to parse preset file');
      }
    };
    input.click();
  };

  const handleGenerateTestPresets = () => {
    if (!onPresetsChange) return;
    const testPresets: (DashboardPreset | null)[] = CATEGORY_ORDER.slice(0, 9).map((category) => {
      const categoryWidgets = WIDGET_CONFIGS.filter(w => w.category === category);
      const widgetLayout: Widget[] = categoryWidgets.slice(0, 4).map((config, i) => ({
        id: config.id,
        x: (i % 2) * 6,
        y: Math.floor(i / 2) * 4,
        w: 6,
        h: 4,
        enabled: true,
        displayName: config.title,
        category: config.category,
      }));
      
      return {
        type: 'grid' as const,
        layout: normalizeLayout(widgetLayout),
        name: `${category} Dashboard`,
        description: `Auto-generated ${category} preset`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    
    onPresetsChange(testPresets);
    savePresetsToStorage(testPresets);
    toast.success('Generated 9 test presets by category');
  };

  return (
    <div className="space-y-4">
      {/* Preset Overview */}
      <div className="grid grid-cols-3 gap-1">
        {presets?.map((preset, i) => (
          <button
            key={i}
            onClick={() => onPresetLoad?.(i)}
            className={cn(
              "p-2 text-xs rounded border text-center transition-colors",
              preset 
                ? "bg-ui-bg-tertiary hover:bg-ui-bg-quaternary border-ui-border-primary" 
                : "bg-ui-bg-primary border-dashed border-ui-border-primary/50 text-ui-text-secondary"
            )}
          >
            {preset ? (
              <>
                <div className="font-medium truncate">{preset.name || `Preset ${i + 1}`}</div>
                <div className="text-[10px] text-ui-text-secondary">
                  {preset.layout.filter(w => w.enabled).length} widgets
                </div>
              </>
            ) : (
              <span className="text-ui-text-secondary">Empty</span>
            )}
          </button>
        ))}
      </div>

      {/* Preset Actions */}
      <div className="grid grid-cols-2 gap-2">
        <ActionButton
          icon={<Download size={14} />}
          label="Export All"
          onClick={handleExportPresets}
        />
        <ActionButton
          icon={<Upload size={14} />}
          label="Import"
          onClick={handleImportPresets}
        />
        <ActionButton
          icon={<Wand2 size={14} />}
          label="Generate Test Presets"
          onClick={handleGenerateTestPresets}
          variant="success"
        />
        <ActionButton
          icon={<Trash2 size={14} />}
          label="Clear All"
          onClick={() => {
            const empty = Array(9).fill(null);
            onPresetsChange?.(empty);
            savePresetsToStorage(empty);
            toast.warning('Cleared all presets');
          }}
          variant="danger"
        />
      </div>
    </div>
  );
}

function UserAuthSection({ user }: { user?: any }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleForceLogout = () => {
    authService.clearTokens();
    // Preferences service will auto-disconnect when auth is cleared
    window.location.href = '/login';
  };

  const handleRefreshTokens = async () => {
    setIsLoading(true);
    try {
      const success = await authService.refreshAccessToken();
      if (success) {
        toast.success('Tokens refreshed');
      } else {
        toast.error('Failed to refresh tokens');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerOnboarding = () => {
    preferencesService.set('onboarding.completed', false);
    preferencesService.set('onboarding.step', 0);
    toast.success('Onboarding reset - refresh to see');
  };

  const handleCopyAuthInfo = () => {
    const info = {
      user: authService.getUser(),
      realUser: authService.getRealUser(),
      isImpersonating: authService.isImpersonating(),
      isAdmin: authService.isAdmin(),
      hasToken: !!authService.getAccessToken(),
      hasRefreshToken: authService.hasRefreshToken(),
    };
    navigator.clipboard.writeText(JSON.stringify(info, null, 2));
    toast.success('Auth info copied');
  };

  return (
    <div className="space-y-4">
      {/* Current User Info */}
      <div className="bg-ui-bg-secondary rounded-lg p-3 border border-ui-border-primary">
        <div className="text-xs text-ui-text-secondary mb-2">Current Session</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-ui-text-secondary">User</span>
            <span className="font-mono">{user?.name || user?.email || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ui-text-secondary">Role</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded text-xs",
              user?.role === 'admin' ? "bg-purple-500/20 text-purple-400" : "bg-gray-500/20"
            )}>
              {user?.role || 'user'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ui-text-secondary">ID</span>
            <span className="font-mono text-xs">{user?.id || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ui-text-secondary">Impersonating</span>
            <span>{authService.isImpersonating() ? '✅ Yes' : '❌ No'}</span>
          </div>
        </div>
      </div>

      {/* Auth Actions */}
      <div className="grid grid-cols-2 gap-2">
        <ActionButton
          icon={<RefreshCw size={14} />}
          label="Refresh Tokens"
          onClick={handleRefreshTokens}
          loading={isLoading}
        />
        <ActionButton
          icon={<Copy size={14} />}
          label="Copy Auth Info"
          onClick={handleCopyAuthInfo}
        />
        <ActionButton
          icon={<Play size={14} />}
          label="Trigger Onboarding"
          onClick={handleTriggerOnboarding}
          variant="warning"
        />
        <ActionButton
          icon={<LogOut size={14} />}
          label="Force Logout"
          onClick={handleForceLogout}
          variant="danger"
        />
      </div>
    </div>
  );
}

function PreferencesSection() {
  const [prefs, setPrefs] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setPrefs(preferencesService.getAll());
  }, []);

  const filteredPrefs = useMemo(() => {
    const entries = Object.entries(prefs);
    if (!searchQuery) return entries;
    return entries.filter(([key]) => 
      key.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [prefs, searchQuery]);

  const handleClearPreference = async (key: string) => {
    await preferencesService.delete(key);
    setPrefs(preferencesService.getAll());
    toast.success(`Removed ${key}`);
  };

  const handleForceSyncPrefs = async () => {
    await preferencesService.fetchFromServer();
    setPrefs(preferencesService.getAll());
    toast.success('Preferences synced from server');
  };

  const handleClearAllPrefs = async () => {
    const keys = Object.keys(prefs);
    for (const k of keys) {
      await preferencesService.delete(k);
    }
    setPrefs({});
    toast.warning('Cleared all preferences');
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search preferences..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 h-8 text-sm"
        />
        <button
          onClick={handleForceSyncPrefs}
          className="p-2 bg-ui-bg-tertiary hover:bg-ui-bg-quaternary rounded border border-ui-border-primary"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Preferences List */}
      <div className="max-h-60 overflow-auto space-y-1 bg-ui-bg-primary rounded-lg border border-ui-border-primary p-2">
        {filteredPrefs.length === 0 ? (
          <div className="text-xs text-ui-text-secondary text-center py-4">
            No preferences found
          </div>
        ) : filteredPrefs.map(([key, value]) => (
          <div 
            key={key}
            className="flex items-center justify-between gap-2 text-xs bg-ui-bg-tertiary rounded px-2 py-1 group"
          >
            <span className="font-mono text-cyan-400 truncate flex-1">{key}</span>
            <span className="text-ui-text-secondary truncate max-w-[100px]">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
            <button
              onClick={() => handleClearPreference(key)}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Bulk Actions */}
      <div className="flex gap-2">
        <ActionButton
          icon={<Download size={14} />}
          label="Export"
          onClick={() => {
            const blob = new Blob([JSON.stringify(prefs, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `olympia-prefs-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        />
        <ActionButton
          icon={<Trash2 size={14} />}
          label="Clear All"
          onClick={handleClearAllPrefs}
          variant="danger"
        />
      </div>
    </div>
  );
}

function APITestingSection() {
  const [endpoint, setEndpoint] = useState('/api/health');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  const commonEndpoints = [
    { label: 'Health', endpoint: '/api/health', method: 'GET' as const },
    { label: 'Auth Status', endpoint: '/api/auth/me', method: 'GET' as const },
    { label: 'Preferences', endpoint: '/api/preferences', method: 'GET' as const },
    { label: 'Widgets', endpoint: '/api/widgets', method: 'POST' as const },
  ];

  const handleTestEndpoint = async () => {
    setIsLoading(true);
    const start = performance.now();
    
    try {
      const res = await authService.fetchWithAuth(`${API_BASE_URL}${endpoint}`, {
        method,
      });
      const data = await res.json();
      setLatency(Math.round(performance.now() - start));
      setResponse(data);
    } catch (err: any) {
      setLatency(Math.round(performance.now() - start));
      setResponse({ error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Endpoints */}
      <div className="flex flex-wrap gap-1">
        {commonEndpoints.map(ep => (
          <button
            key={ep.endpoint}
            onClick={() => {
              setEndpoint(ep.endpoint);
              setMethod(ep.method);
            }}
            className={cn(
              "px-2 py-1 text-xs rounded border",
              endpoint === ep.endpoint 
                ? "bg-ui-accent-primary-bg border-ui-accent-primary-border text-ui-accent-primary-text" 
                : "bg-ui-bg-tertiary border-ui-border-primary hover:bg-ui-bg-quaternary"
            )}
          >
            {ep.label}
          </button>
        ))}
      </div>

      {/* Custom Endpoint */}
      <div className="flex gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')}
          className="bg-ui-bg-tertiary border border-ui-border-primary rounded px-2 py-1 text-sm text-ui-text-primary focus:outline-none focus:ring-2 focus:ring-ui-accent-primary"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>
        <Input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          className="flex-1 h-8 text-sm font-mono"
        />
        <button
          onClick={handleTestEndpoint}
          disabled={isLoading}
          className="px-3 py-1 bg-ui-accent-primary-bg hover:bg-ui-accent-primary-bg/80 text-ui-accent-primary-text rounded border border-ui-accent-primary-border text-sm"
        >
          {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>

      {/* Response */}
      {response && (
        <div className="bg-ui-bg-primary rounded-lg border border-ui-border-primary p-2">
          <div className="flex justify-between text-xs text-ui-text-secondary mb-2">
            <span>Response</span>
            {latency && <span className="text-green-400">{latency}ms</span>}
          </div>
          <pre className="text-xs font-mono max-h-40 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function ExperimentsSection({ 
  layout, 
  onLayoutChange 
}: {
  layout?: Widget[];
  onLayoutChange?: (layout: Widget[]) => void;
}) {
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  const handleToggleAnimations = () => {
    const newValue = !animationsEnabled;
    setAnimationsEnabled(newValue);
    preferencesService.set('appearance.animations', newValue);
    toast.info(`Animations ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleSimulateLargeLayout = () => {
    if (!layout || !onLayoutChange) return;
    // Enable all widgets and spread them out
    const newLayout = layout.map((w, i) => ({
      ...w,
      enabled: true,
      x: (i % 4) * 3,
      y: Math.floor(i / 4) * 3,
      w: 3,
      h: 3,
    }));
    onLayoutChange(newLayout);
    toast.success(`Enabled all ${newLayout.length} widgets for stress test`);
  };

  const handleSimulateSlowNetwork = () => {
    toast.info('Network throttling only available in Chrome DevTools');
  };

  const handleLogWidgetRenderTimes = () => {
    console.log('=== Widget Render Analysis ===');
    console.log('Use React DevTools Profiler for detailed render times');
    console.log('Current layout:', layout?.filter(w => w.enabled).map(w => w.id));
    toast.success('Widget info logged to console');
  };

  const handleTestWebSocket = () => {
    // @ts-ignore - emit is private but useful for debugging
    preferencesService.emit?.('debug_ping', { timestamp: Date.now() });
    toast.info('WebSocket ping sent - check console');
  };

  return (
    <div className="space-y-4">
      {/* Feature Toggles */}
      <div className="space-y-2">
        <div className="text-xs text-ui-text-secondary">Feature Toggles</div>
        <div className="flex items-center justify-between p-2 bg-ui-bg-secondary rounded-lg border border-ui-border-primary">
          <span className="text-sm">Animations</span>
          <button
            onClick={handleToggleAnimations}
            className={cn(
              "w-10 h-5 rounded-full transition-colors relative",
              animationsEnabled ? "bg-green-500" : "bg-gray-600"
            )}
          >
            <div className={cn(
              "absolute w-4 h-4 bg-white rounded-full top-0.5 transition-transform",
              animationsEnabled ? "translate-x-5" : "translate-x-0.5"
            )} />
          </button>
        </div>
      </div>

      {/* Stress Tests */}
      <div className="grid grid-cols-2 gap-2">
        <ActionButton
          icon={<Boxes size={14} />}
          label="Stress Test (All Widgets)"
          onClick={handleSimulateLargeLayout}
          variant="warning"
        />
        <ActionButton
          icon={<Gauge size={14} />}
          label="Log Render Times"
          onClick={handleLogWidgetRenderTimes}
        />
        <ActionButton
          icon={<Wifi size={14} />}
          label="Test WebSocket"
          onClick={handleTestWebSocket}
        />
        <ActionButton
          icon={<WifiOff size={14} />}
          label="Simulate Slow Network"
          onClick={handleSimulateSlowNetwork}
        />
      </div>

      {/* Debug Info */}
      <div className="bg-ui-bg-secondary rounded-lg p-3 border border-ui-border-primary text-xs">
        <div className="text-ui-text-secondary mb-2">Environment</div>
        <div className="space-y-1 font-mono">
          <div className="flex justify-between">
            <span>API URL</span>
            <span className="text-cyan-400">{API_BASE_URL || '(relative)'}</span>
          </div>
          <div className="flex justify-between">
            <span>Node ENV</span>
            <span className="text-green-400">{process.env.NODE_ENV}</span>
          </div>
          <div className="flex justify-between">
            <span>Build</span>
            <span className="text-yellow-400">{process.env.NEXT_PUBLIC_BUILD_ID || 'dev'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function DebugMenu({ 
  isOpen, 
  onClose, 
  layout, 
  presets, 
  user,
  onLayoutChange,
  onPresetsChange,
  onPresetLoad,
  onForceRefresh,
}: DebugMenuProps) {
  const [activeSection, setActiveSection] = useState('quick-actions');
  
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[440px] max-w-[95vw] bg-ui-bg-primary border-l border-ui-border-primary z-[10000] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-ui-border-primary bg-ui-bg-secondary">
              <div className="flex items-center gap-2">
                <Bug size={20} className="text-orange-400" />
                <span className="font-semibold">Debug Console</span>
                <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                  DEV
                </span>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-ui-bg-quaternary rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Section Tabs */}
            <div className="flex gap-1 p-2 border-b border-ui-border-primary overflow-x-auto bg-ui-bg-primary">
              {SECTIONS.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors",
                    activeSection === section.id 
                      ? "bg-orange-500/20 text-orange-400" 
                      : "text-ui-text-secondary hover:bg-ui-bg-tertiary"
                  )}
                >
                  {section.icon}
                  {section.label}
                </button>
              ))}
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeSection === 'quick-actions' && (
                <QuickActionsSection 
                  layout={layout}
                  presets={presets}
                  onLayoutChange={onLayoutChange}
                  onPresetsChange={onPresetsChange}
                  onForceRefresh={onForceRefresh}
                />
              )}
              {activeSection === 'layout' && (
                <LayoutToolsSection 
                  layout={layout}
                  onLayoutChange={onLayoutChange}
                />
              )}
              {activeSection === 'presets' && (
                <PresetToolsSection 
                  layout={layout}
                  presets={presets}
                  onPresetsChange={onPresetsChange}
                  onPresetLoad={onPresetLoad}
                />
              )}
              {activeSection === 'user' && (
                <UserAuthSection user={user} />
              )}
              {activeSection === 'preferences' && (
                <PreferencesSection />
              )}
              {activeSection === 'api' && (
                <APITestingSection />
              )}
              {activeSection === 'experiments' && (
                <ExperimentsSection 
                  layout={layout}
                  onLayoutChange={onLayoutChange}
                />
              )}
            </div>
            
            {/* Footer */}
            <div className="p-3 border-t border-ui-border-primary text-[10px] text-ui-text-secondary text-center bg-ui-bg-secondary">
              <kbd className="px-1 py-0.5 bg-ui-bg-quaternary rounded">Alt</kbd>+<kbd className="px-1 py-0.5 bg-ui-bg-quaternary rounded">J</kbd> to toggle • 10 background clicks
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
