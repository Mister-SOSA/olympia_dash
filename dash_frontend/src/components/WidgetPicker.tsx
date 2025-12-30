"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Widget } from "@/types";
import {
    WIDGET_CONFIGS,
    WidgetConfig,
    WidgetCategory,
    CATEGORY_ORDER,
    CATEGORY_METADATA,
    searchWidgets,
    groupWidgetsByCategory,
    getAvailableCategories,
} from "@/components/widgets/registry";
import { Loader } from "@/components/ui/loader";
import {
    X,
    Search,
    Check,
    Package,
    DollarSign,
    ShoppingCart,
    Wrench,
    Receipt,
    BarChart3,
    FileText,
    Settings2,
    Sparkles,
    LayoutGrid,
    Minus,
    Plus,
    Loader2,
    RotateCcw,
    CheckCheck,
    XCircle,
    Shuffle,
    List,
    Grid3X3,
    LayoutDashboard,
    ChevronLeft,
    ChevronRight,
    Grid3x3,
    Copy,
    Trash2,
} from "lucide-react";
import { useWidgetPermissions } from "@/hooks/useWidgetPermissions";
import { useIsMobile } from "@/hooks/useMediaQuery";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    getWidgetType,
    countEnabledWidgetInstances,
    canAddInstance,
    createWidgetInstance,
    getWidgetInstances,
    isMultiInstanceWidget,
} from "@/utils/widgetInstanceUtils";
import { widgetSettingsService } from "@/lib/widgetSettings";

// ============================================
// Category Icons
// ============================================

const CATEGORY_ICONS: Record<WidgetCategory, React.ComponentType<{ className?: string }>> = {
    Sales: DollarSign,
    Purchasing: ShoppingCart,
    Inventory: Package,
    AP: Receipt,
    Analytics: BarChart3,
    Reports: FileText,
    Operations: Settings2,
    Utilities: Wrench,
};

// ============================================
// Types
// ============================================

interface WidgetPickerProps {
    tempLayout: Widget[];
    setTempLayout: React.Dispatch<React.SetStateAction<Widget[]>>;
    handleSave: () => void;
    handleCancel: () => void;
    activePresetName?: string;
}

// ============================================
// Widget Row Component
// ============================================

interface WidgetRowProps {
    widget: WidgetConfig;
    isEnabled: boolean;
    onToggle: () => void;
    showCategory?: boolean;
}

const WidgetRow = React.memo(({ widget, isEnabled, onToggle, showCategory }: WidgetRowProps) => {
    return (
        <TooltipProvider delayDuration={400}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left mb-1"
                        style={isEnabled ? {
                            backgroundColor: 'var(--ui-accent-primary-bg)',
                            borderColor: 'var(--ui-accent-primary-border)'
                        } : undefined}
                        onClick={onToggle}
                        onMouseEnter={(e) => {
                            if (!isEnabled) {
                                e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isEnabled) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        {/* Checkbox */}
                        <div
                            className="flex-shrink-0 w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-colors"
                            style={isEnabled ? {
                                backgroundColor: 'var(--ui-accent-primary)',
                                borderColor: 'var(--ui-accent-primary)'
                            } : {
                                borderColor: 'var(--ui-border-secondary)'
                            }}
                        >
                            {isEnabled && (
                                <Check className="w-2.5 h-2.5" style={{ color: '#ffffff' }} strokeWidth={3} />
                            )}
                        </div>

                        {/* Title */}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span
                                className="text-sm font-medium truncate"
                                style={{ color: isEnabled ? 'var(--ui-accent-primary)' : 'var(--ui-text-primary)' }}
                            >
                                {widget.title}
                            </span>
                            {widget.beta && (
                                <span
                                    className="px-1.5 py-0.5 text-[9px] font-semibold rounded uppercase border"
                                    style={{
                                        backgroundColor: 'var(--ui-warning-bg)',
                                        color: 'var(--ui-warning-text)',
                                        borderColor: 'var(--ui-warning-border)'
                                    }}
                                >
                                    Beta
                                </span>
                            )}
                            {showCategory && (
                                <span
                                    className="px-1.5 py-0.5 text-[10px] rounded border"
                                    style={{
                                        backgroundColor: 'var(--ui-bg-tertiary)',
                                        color: 'var(--ui-text-muted)',
                                        borderColor: 'var(--ui-border-primary)'
                                    }}
                                >
                                    {widget.category}
                                </span>
                            )}
                        </div>

                        {/* Size */}
                        <span
                            className="flex-shrink-0 text-[11px] font-mono tabular-nums"
                            style={{ color: 'var(--ui-text-muted)' }}
                        >
                            {widget.defaultSize.w}×{widget.defaultSize.h}
                        </span>
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                    <p className="font-medium">{widget.title}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--ui-text-muted)' }}>{widget.description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});

WidgetRow.displayName = "WidgetRow";

// ============================================
// Multi-Instance Widget Row
// ============================================

interface MultiInstanceWidgetRowProps {
    widget: WidgetConfig;
    instances: Widget[];
    onAddInstance: () => void;
    onRemoveInstance: (widgetId: string) => void;
    canAddMore: boolean;
    showCategory?: boolean;
}

const MultiInstanceWidgetRow = React.memo(({
    widget,
    instances,
    onAddInstance,
    onRemoveInstance,
    canAddMore,
    showCategory,
}: MultiInstanceWidgetRowProps) => {
    const enabledInstances = instances.filter(i => i.enabled);
    const hasInstances = enabledInstances.length > 0;
    const maxInstances = widget.maxInstances;
    const remainingSlots = maxInstances ? maxInstances - enabledInstances.length : undefined;

    return (
        <div className="mb-2">
            {/* Main row for the widget type */}
            <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border"
                style={hasInstances ? {
                    backgroundColor: 'var(--ui-accent-primary-bg)',
                    borderColor: 'var(--ui-accent-primary-border)'
                } : {
                    backgroundColor: 'transparent',
                    borderColor: 'transparent'
                }}
            >
                {/* Stacked copies icon to indicate multi-instance */}
                <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center relative"
                    style={{
                        backgroundColor: hasInstances ? 'var(--ui-accent-primary)' : 'var(--ui-bg-tertiary)'
                    }}
                >
                    <Copy
                        className="w-4 h-4"
                        style={{ color: hasInstances ? '#ffffff' : 'var(--ui-text-muted)' }}
                    />
                    {hasInstances && (
                        <span
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{
                                backgroundColor: 'var(--ui-bg-primary)',
                                color: 'var(--ui-accent-primary)',
                                border: '2px solid var(--ui-accent-primary)'
                            }}
                        >
                            {enabledInstances.length}
                        </span>
                    )}
                </div>

                {/* Title and badges */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <span
                            className="text-sm font-medium truncate"
                            style={{ color: hasInstances ? 'var(--ui-accent-primary)' : 'var(--ui-text-primary)' }}
                        >
                            {widget.title}
                        </span>
                        {widget.beta && (
                            <span
                                className="px-1.5 py-0.5 text-[9px] font-semibold rounded uppercase border"
                                style={{
                                    backgroundColor: 'var(--ui-warning-bg)',
                                    color: 'var(--ui-warning-text)',
                                    borderColor: 'var(--ui-warning-border)'
                                }}
                            >
                                Beta
                            </span>
                        )}
                        {showCategory && (
                            <span
                                className="px-1.5 py-0.5 text-[10px] rounded border"
                                style={{
                                    backgroundColor: 'var(--ui-bg-tertiary)',
                                    color: 'var(--ui-text-muted)',
                                    borderColor: 'var(--ui-border-primary)'
                                }}
                            >
                                {widget.category}
                            </span>
                        )}
                    </div>
                    <span
                        className="text-[11px]"
                        style={{ color: 'var(--ui-text-muted)' }}
                    >
                        {hasInstances
                            ? `${enabledInstances.length} instance${enabledInstances.length !== 1 ? 's' : ''} active${remainingSlots !== undefined ? ` • ${remainingSlots} more available` : ''}`
                            : `Add multiple instances${maxInstances ? ` (max ${maxInstances})` : ''}`
                        }
                    </span>
                </div>

                {/* Size indicator */}
                <span
                    className="flex-shrink-0 text-[11px] font-mono tabular-nums"
                    style={{ color: 'var(--ui-text-muted)' }}
                >
                    {widget.defaultSize.w}×{widget.defaultSize.h}
                </span>

                {/* Add instance button */}
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={onAddInstance}
                                disabled={!canAddMore}
                                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
                                style={{
                                    backgroundColor: canAddMore ? 'var(--ui-accent-primary)' : 'var(--ui-bg-tertiary)',
                                    color: canAddMore ? '#ffffff' : 'var(--ui-text-muted)'
                                }}
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {canAddMore
                                ? `Add ${widget.title} instance`
                                : maxInstances
                                    ? `Maximum ${maxInstances} instances reached`
                                    : 'Cannot add more instances'
                            }
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* List of instances */}
            {enabledInstances.length > 0 && (
                <div className="ml-10 mt-1.5 space-y-1 border-l-2 pl-3" style={{ borderColor: 'var(--ui-accent-primary-border)' }}>
                    {enabledInstances.map((instance, index) => (
                        <div
                            key={instance.id}
                            className="group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                            style={{ backgroundColor: 'var(--ui-bg-secondary)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
                            }}
                        >
                            <span
                                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                style={{
                                    backgroundColor: 'var(--ui-accent-primary-bg)',
                                    color: 'var(--ui-accent-primary)'
                                }}
                            >
                                {index + 1}
                            </span>
                            <span
                                className="text-sm flex-1 truncate"
                                style={{ color: 'var(--ui-text-primary)' }}
                            >
                                {instance.displayName || `${widget.title} ${index + 1}`}
                            </span>
                            <span
                                className="text-[10px] font-mono tabular-nums opacity-60 group-hover:opacity-100 transition-opacity"
                                style={{ color: 'var(--ui-text-muted)' }}
                            >
                                {instance.w}×{instance.h}
                            </span>
                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => onRemoveInstance(instance.id)}
                                            className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                            style={{
                                                color: 'var(--ui-text-muted)',
                                                backgroundColor: 'transparent'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.color = 'var(--ui-danger)';
                                                e.currentTarget.style.backgroundColor = 'var(--ui-danger-bg)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.color = 'var(--ui-text-muted)';
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Remove this instance</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

MultiInstanceWidgetRow.displayName = "MultiInstanceWidgetRow";

// ============================================
// Widget Card (Visual card view)
// ============================================

const WidgetCard = React.memo(({ widget, isEnabled, onToggle }: WidgetRowProps) => {
    const IconComponent = CATEGORY_ICONS[widget.category];

    return (
        <button
            className="relative flex flex-col p-4 rounded-xl border transition-all text-left group"
            style={isEnabled ? {
                backgroundColor: 'var(--ui-accent-primary-bg)',
                borderColor: 'var(--ui-accent-primary-border)'
            } : {
                backgroundColor: 'var(--ui-bg-secondary)',
                borderColor: 'var(--ui-border-primary)'
            }}
            onClick={onToggle}
            onMouseEnter={(e) => {
                if (!isEnabled) {
                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                    e.currentTarget.style.borderColor = 'var(--ui-border-secondary)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isEnabled) {
                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
                    e.currentTarget.style.borderColor = 'var(--ui-border-primary)';
                }
            }}
        >
            {/* Checkbox top right */}
            <div
                className="absolute top-3 right-3 w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all"
                style={isEnabled ? {
                    backgroundColor: 'var(--ui-accent-primary)',
                    borderColor: 'var(--ui-accent-primary)'
                } : {
                    borderColor: 'var(--ui-border-secondary)'
                }}
            >
                {isEnabled && <Check className="w-3 h-3" style={{ color: '#ffffff' }} strokeWidth={3} />}
            </div>

            {/* Category icon */}
            <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: isEnabled ? 'var(--ui-accent-primary-bg)' : 'var(--ui-bg-tertiary)' }}
            >
                {IconComponent && (
                    <div style={{ color: isEnabled ? 'var(--ui-accent-primary)' : 'var(--ui-text-muted)' }}>
                        <IconComponent className="w-5 h-5" />
                    </div>
                )}
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold mb-1 pr-6" style={{ color: 'var(--ui-text-primary)' }}>
                {widget.title}
            </h3>

            {/* Description */}
            <p className="text-xs line-clamp-2 mb-3 flex-1" style={{ color: 'var(--ui-text-muted)' }}>
                {widget.description}
            </p>

            {/* Footer: size + badges */}
            <div className="flex items-center gap-2 mt-auto">
                <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded" style={{
                    color: 'var(--ui-text-muted)',
                    backgroundColor: 'var(--ui-bg-tertiary)'
                }}>
                    {widget.defaultSize.w}×{widget.defaultSize.h}
                </span>
                {widget.beta && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase" style={{
                        backgroundColor: 'var(--ui-warning-bg)',
                        color: 'var(--ui-warning-text)'
                    }}>
                        Beta
                    </span>
                )}
            </div>
        </button>
    );
});

WidgetCard.displayName = "WidgetCard";

// ============================================
// Multi-Instance Widget Card (for Card view)
// ============================================

interface MultiInstanceWidgetCardProps {
    widget: WidgetConfig;
    instances: Widget[];
    onAddInstance: () => void;
    onRemoveInstance: (widgetId: string) => void;
    canAddMore: boolean;
}

const MultiInstanceWidgetCard = React.memo(({
    widget,
    instances,
    onAddInstance,
    onRemoveInstance,
    canAddMore,
}: MultiInstanceWidgetCardProps) => {
    const IconComponent = CATEGORY_ICONS[widget.category];
    const enabledInstances = instances.filter(i => i.enabled);
    const hasInstances = enabledInstances.length > 0;
    const maxInstances = widget.maxInstances;
    const remainingSlots = maxInstances ? maxInstances - enabledInstances.length : undefined;

    return (
        <div
            className="relative flex flex-col p-4 rounded-xl border transition-all group"
            style={hasInstances ? {
                backgroundColor: 'var(--ui-accent-primary-bg)',
                borderColor: 'var(--ui-accent-primary-border)'
            } : {
                backgroundColor: 'var(--ui-bg-secondary)',
                borderColor: 'var(--ui-border-primary)'
            }}
        >
            {/* Multi-instance indicator top right */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                {/* Instance count with visual slots */}
                <div className="flex items-center">
                    {hasInstances && (
                        <span
                            className="px-2 py-1 rounded-l-md text-xs font-bold flex items-center gap-1"
                            style={{
                                backgroundColor: 'var(--ui-accent-primary)',
                                color: '#ffffff'
                            }}
                        >
                            <Copy className="w-3 h-3" />
                            {enabledInstances.length}
                        </span>
                    )}
                    <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onAddInstance}
                                    disabled={!canAddMore}
                                    className={`w-7 h-7 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 ${hasInstances ? 'rounded-r-md' : 'rounded-md'}`}
                                    style={{
                                        backgroundColor: canAddMore ? 'var(--ui-accent-primary)' : 'var(--ui-bg-tertiary)',
                                        color: canAddMore ? '#ffffff' : 'var(--ui-text-muted)'
                                    }}
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {canAddMore
                                    ? `Add ${widget.title}${remainingSlots !== undefined ? ` (${remainingSlots} more available)` : ''}`
                                    : `Maximum ${maxInstances} instances reached`
                                }
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Category icon with multi-instance indicator */}
            <div className="relative w-10 h-10 mb-3">
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: hasInstances ? 'var(--ui-accent-primary-bg)' : 'var(--ui-bg-tertiary)' }}
                >
                    {IconComponent && (
                        <div style={{ color: hasInstances ? 'var(--ui-accent-primary)' : 'var(--ui-text-muted)' }}>
                            <IconComponent className="w-5 h-5" />
                        </div>
                    )}
                </div>
                {/* Small stacked indicator */}
                <div
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded flex items-center justify-center"
                    style={{
                        backgroundColor: 'var(--ui-bg-primary)',
                        border: '1px solid var(--ui-border-secondary)'
                    }}
                >
                    <Copy className="w-2.5 h-2.5" style={{ color: 'var(--ui-text-muted)' }} />
                </div>
            </div>

            {/* Title */}
            <div className="flex items-center gap-2 mb-1 pr-20">
                <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--ui-text-primary)' }}>
                    {widget.title}
                </h3>
            </div>

            {/* Description + instance info */}
            <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--ui-text-muted)' }}>
                {widget.description}
            </p>
            <p className="text-[10px] mb-3" style={{ color: hasInstances ? 'var(--ui-accent-primary)' : 'var(--ui-text-muted)' }}>
                {hasInstances
                    ? `${enabledInstances.length} active${remainingSlots !== undefined && remainingSlots > 0 ? ` • ${remainingSlots} more available` : ''}`
                    : `Multiple instances${maxInstances ? ` (max ${maxInstances})` : ''}`
                }
            </p>

            {/* Instances list - collapsible style */}
            {enabledInstances.length > 0 && (
                <div className="space-y-1 mb-3 -mx-1">
                    {enabledInstances.slice(0, 3).map((instance, index) => (
                        <div
                            key={instance.id}
                            className="group/item flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors"
                            style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}
                        >
                            <span
                                className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                                style={{
                                    backgroundColor: 'var(--ui-accent-primary-bg)',
                                    color: 'var(--ui-accent-primary)'
                                }}
                            >
                                {index + 1}
                            </span>
                            <span className="flex-1 truncate" style={{ color: 'var(--ui-text-secondary)' }}>
                                {instance.displayName || `${widget.title} ${index + 1}`}
                            </span>
                            <button
                                onClick={() => onRemoveInstance(instance.id)}
                                className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all opacity-0 group-hover/item:opacity-100"
                                style={{ color: 'var(--ui-text-muted)' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = 'var(--ui-danger)';
                                    e.currentTarget.style.backgroundColor = 'var(--ui-danger-bg)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {enabledInstances.length > 3 && (
                        <p className="text-[10px] px-2 py-1" style={{ color: 'var(--ui-text-muted)' }}>
                            +{enabledInstances.length - 3} more instance{enabledInstances.length - 3 !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
            )}

            {/* Footer: size + badges */}
            <div className="flex items-center gap-2 mt-auto">
                <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded" style={{
                    color: 'var(--ui-text-muted)',
                    backgroundColor: 'var(--ui-bg-tertiary)'
                }}>
                    {widget.defaultSize.w}×{widget.defaultSize.h}
                </span>
                {widget.beta && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase" style={{
                        backgroundColor: 'var(--ui-warning-bg)',
                        color: 'var(--ui-warning-text)'
                    }}>
                        Beta
                    </span>
                )}
            </div>
        </div>
    );
});

MultiInstanceWidgetCard.displayName = "MultiInstanceWidgetCard";

// ============================================
// Mobile Widget Card (Touch-friendly)
// ============================================

const MobileWidgetCard = React.memo(({ widget, isEnabled, onToggle, showCategory }: WidgetRowProps) => {
    const IconComponent = CATEGORY_ICONS[widget.category];

    return (
        <button
            className="w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left active:scale-[0.98]"
            style={isEnabled ? {
                backgroundColor: 'var(--ui-accent-primary-bg)',
                borderColor: 'var(--ui-accent-primary-border)'
            } : {
                backgroundColor: 'var(--ui-bg-secondary)',
                borderColor: 'var(--ui-border-primary)'
            }}
            onClick={onToggle}
        >
            {/* Checkbox */}
            <div
                className="flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center mt-0.5 transition-all"
                style={isEnabled ? {
                    backgroundColor: 'var(--ui-accent-primary)',
                    borderColor: 'var(--ui-accent-primary)'
                } : {
                    borderColor: 'var(--ui-border-secondary)'
                }}
            >
                {isEnabled && <Check className="w-4 h-4" style={{ color: '#ffffff' }} strokeWidth={3} />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3
                        className="font-semibold truncate"
                        style={{ color: isEnabled ? 'var(--ui-accent-primary)' : 'var(--ui-text-primary)' }}
                    >
                        {widget.title}
                    </h3>
                    {widget.beta && (
                        <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase flex-shrink-0"
                            style={{
                                backgroundColor: 'var(--ui-warning-bg)',
                                color: 'var(--ui-warning-text)'
                            }}
                        >
                            Beta
                        </span>
                    )}
                </div>
                <p
                    className="text-sm line-clamp-2 mb-2"
                    style={{ color: 'var(--ui-text-muted)' }}
                >
                    {widget.description || "No description"}
                </p>
                <div className="flex items-center gap-2">
                    <span
                        className="text-xs font-mono px-2 py-0.5 rounded"
                        style={{
                            backgroundColor: 'var(--ui-bg-tertiary)',
                            color: 'var(--ui-text-muted)'
                        }}
                    >
                        {widget.defaultSize.w}×{widget.defaultSize.h}
                    </span>
                    {showCategory && (
                        <span
                            className="text-xs px-2 py-0.5 rounded capitalize"
                            style={{
                                backgroundColor: 'var(--ui-bg-tertiary)',
                                color: 'var(--ui-text-muted)'
                            }}
                        >
                            {widget.category}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
});

MobileWidgetCard.displayName = "MobileWidgetCard";

// ============================================
// Mobile Multi-Instance Widget Card (Touch-friendly)
// ============================================

interface MobileMultiInstanceWidgetCardProps {
    widget: WidgetConfig;
    instances: Widget[];
    onAddInstance: () => void;
    onRemoveInstance: (widgetId: string) => void;
    canAddMore: boolean;
    showCategory?: boolean;
}

const MobileMultiInstanceWidgetCard = React.memo(({
    widget,
    instances,
    onAddInstance,
    onRemoveInstance,
    canAddMore,
    showCategory,
}: MobileMultiInstanceWidgetCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const enabledInstances = instances.filter(i => i.enabled);
    const hasInstances = enabledInstances.length > 0;
    const maxInstances = widget.maxInstances;
    const remainingSlots = maxInstances ? maxInstances - enabledInstances.length : undefined;

    return (
        <div
            className="w-full rounded-xl border transition-all"
            style={hasInstances ? {
                backgroundColor: 'var(--ui-accent-primary-bg)',
                borderColor: 'var(--ui-accent-primary-border)'
            } : {
                backgroundColor: 'var(--ui-bg-secondary)',
                borderColor: 'var(--ui-border-primary)'
            }}
        >
            {/* Main card area */}
            <div className="p-4">
                <div className="flex items-start gap-3">
                    {/* Multi-instance icon indicator */}
                    <div
                        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center relative mt-0.5"
                        style={{
                            backgroundColor: hasInstances ? 'var(--ui-accent-primary)' : 'var(--ui-bg-tertiary)'
                        }}
                    >
                        <Copy
                            className="w-5 h-5"
                            style={{ color: hasInstances ? '#ffffff' : 'var(--ui-text-muted)' }}
                        />
                        {hasInstances && (
                            <span
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                                style={{
                                    backgroundColor: 'var(--ui-bg-primary)',
                                    color: 'var(--ui-accent-primary)',
                                    border: '2px solid var(--ui-accent-primary)'
                                }}
                            >
                                {enabledInstances.length}
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3
                                className="font-semibold truncate"
                                style={{ color: hasInstances ? 'var(--ui-accent-primary)' : 'var(--ui-text-primary)' }}
                            >
                                {widget.title}
                            </h3>
                            {widget.beta && (
                                <span
                                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase flex-shrink-0"
                                    style={{
                                        backgroundColor: 'var(--ui-warning-bg)',
                                        color: 'var(--ui-warning-text)'
                                    }}
                                >
                                    Beta
                                </span>
                            )}
                        </div>
                        <p
                            className="text-sm line-clamp-2 mb-2"
                            style={{ color: 'var(--ui-text-muted)' }}
                        >
                            {widget.description || "No description"}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span
                                className="text-xs font-mono px-2 py-0.5 rounded"
                                style={{
                                    backgroundColor: 'var(--ui-bg-tertiary)',
                                    color: 'var(--ui-text-muted)'
                                }}
                            >
                                {widget.defaultSize.w}×{widget.defaultSize.h}
                            </span>
                            {showCategory && (
                                <span
                                    className="text-xs px-2 py-0.5 rounded capitalize"
                                    style={{
                                        backgroundColor: 'var(--ui-bg-tertiary)',
                                        color: 'var(--ui-text-muted)'
                                    }}
                                >
                                    {widget.category}
                                </span>
                            )}
                            <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{
                                    backgroundColor: hasInstances ? 'var(--ui-accent-primary-bg)' : 'var(--ui-bg-tertiary)',
                                    color: hasInstances ? 'var(--ui-accent-primary)' : 'var(--ui-text-muted)'
                                }}
                            >
                                {hasInstances
                                    ? `${enabledInstances.length} active${remainingSlots !== undefined && remainingSlots > 0 ? ` • ${remainingSlots} left` : ''}`
                                    : `Multi${maxInstances ? ` (max ${maxInstances})` : ''}`
                                }
                            </span>
                        </div>
                    </div>

                    {/* Add button */}
                    <button
                        onClick={onAddInstance}
                        disabled={!canAddMore}
                        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
                        style={{
                            backgroundColor: canAddMore ? 'var(--ui-accent-primary)' : 'var(--ui-bg-tertiary)',
                            color: canAddMore ? '#ffffff' : 'var(--ui-text-muted)'
                        }}
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Instance list - expandable */}
            {enabledInstances.length > 0 && (
                <>
                    {/* Toggle button */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full px-4 py-2 flex items-center justify-between border-t transition-colors"
                        style={{
                            borderColor: 'var(--ui-accent-primary-border)',
                            backgroundColor: 'transparent'
                        }}
                    >
                        <span className="text-xs font-medium" style={{ color: 'var(--ui-accent-primary)' }}>
                            {enabledInstances.length} instance{enabledInstances.length !== 1 ? 's' : ''}
                        </span>
                        <ChevronRight
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            style={{ color: 'var(--ui-accent-primary)' }}
                        />
                    </button>

                    {/* Expanded instance list */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-3 space-y-2">
                                    {enabledInstances.map((instance, index) => (
                                        <div
                                            key={instance.id}
                                            className="flex items-center gap-3 p-3 rounded-lg"
                                            style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}
                                        >
                                            <span
                                                className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                                style={{
                                                    backgroundColor: 'var(--ui-accent-primary-bg)',
                                                    color: 'var(--ui-accent-primary)'
                                                }}
                                            >
                                                {index + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <span
                                                    className="text-sm font-medium truncate block"
                                                    style={{ color: 'var(--ui-text-primary)' }}
                                                >
                                                    {instance.displayName || `${widget.title} ${index + 1}`}
                                                </span>
                                                <span
                                                    className="text-[11px] font-mono"
                                                    style={{ color: 'var(--ui-text-muted)' }}
                                                >
                                                    {instance.w}×{instance.h}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => onRemoveInstance(instance.id)}
                                                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors active:scale-95"
                                                style={{
                                                    backgroundColor: 'var(--ui-danger-bg)',
                                                    color: 'var(--ui-danger)'
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    );
});

MobileMultiInstanceWidgetCard.displayName = "MobileMultiInstanceWidgetCard";

// ============================================
// Widget Compact (Dense grid for power users)
// ============================================

const WidgetCompact = React.memo(({ widget, isEnabled, onToggle }: WidgetRowProps) => {
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-left transition-all"
                        style={isEnabled ? {
                            backgroundColor: 'var(--ui-accent-primary-bg)',
                            borderColor: 'var(--ui-accent-primary-border)',
                            color: 'var(--ui-text-primary)'
                        } : {
                            backgroundColor: 'var(--ui-bg-secondary)',
                            borderColor: 'var(--ui-border-primary)',
                            color: 'var(--ui-text-secondary)'
                        }}
                        onClick={onToggle}
                        onMouseEnter={(e) => {
                            if (!isEnabled) {
                                e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                e.currentTarget.style.color = 'var(--ui-text-primary)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isEnabled) {
                                e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
                                e.currentTarget.style.color = 'var(--ui-text-secondary)';
                            }
                        }}
                    >
                        <div
                            className="w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0"
                            style={isEnabled ? {
                                backgroundColor: 'var(--ui-accent-primary)',
                                borderColor: 'var(--ui-accent-primary)'
                            } : {
                                borderColor: 'var(--ui-border-secondary)'
                            }}
                        >
                            {isEnabled && <Check className="w-2 h-2" style={{ color: '#ffffff' }} strokeWidth={3} />}
                        </div>
                        <span className="text-xs font-medium truncate">{widget.title}</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p className="font-medium text-sm">{widget.title}</p>
                    <p className="text-xs mt-1 max-w-[200px]" style={{ color: 'var(--ui-text-muted)' }}>{widget.description}</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--ui-text-muted)' }}>Size: {widget.defaultSize.w}×{widget.defaultSize.h}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});

WidgetCompact.displayName = "WidgetCompact";

// ============================================
// Multi-Instance Widget Compact
// ============================================

interface MultiInstanceWidgetCompactProps {
    widget: WidgetConfig;
    instances: Widget[];
    onAddInstance: () => void;
    onRemoveInstance: (widgetId: string) => void;
    canAddMore: boolean;
}

const MultiInstanceWidgetCompact = React.memo(({
    widget,
    instances,
    onAddInstance,
    onRemoveInstance,
    canAddMore,
}: MultiInstanceWidgetCompactProps) => {
    const enabledInstances = instances.filter(i => i.enabled);
    const hasInstances = enabledInstances.length > 0;
    const maxInstances = widget.maxInstances;
    const remainingSlots = maxInstances ? maxInstances - enabledInstances.length : undefined;

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all group"
                        style={hasInstances ? {
                            backgroundColor: 'var(--ui-accent-primary-bg)',
                            borderColor: 'var(--ui-accent-primary-border)',
                        } : {
                            backgroundColor: 'var(--ui-bg-secondary)',
                            borderColor: 'var(--ui-border-primary)',
                        }}
                        onMouseEnter={(e) => {
                            if (!hasInstances) {
                                e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                e.currentTarget.style.borderColor = 'var(--ui-border-secondary)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!hasInstances) {
                                e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
                                e.currentTarget.style.borderColor = 'var(--ui-border-primary)';
                            }
                        }}
                    >
                        {/* Stacked icon indicator */}
                        <div className="relative flex-shrink-0">
                            <Copy
                                className="w-3.5 h-3.5"
                                style={{ color: hasInstances ? 'var(--ui-accent-primary)' : 'var(--ui-text-muted)' }}
                            />
                            {hasInstances && (
                                <span
                                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
                                    style={{
                                        backgroundColor: 'var(--ui-accent-primary)',
                                        color: '#ffffff'
                                    }}
                                >
                                    {enabledInstances.length}
                                </span>
                            )}
                        </div>
                        <span
                            className="text-xs font-medium truncate"
                            style={{ color: hasInstances ? 'var(--ui-text-primary)' : 'var(--ui-text-secondary)' }}
                        >
                            {widget.title}
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddInstance(); }}
                            disabled={!canAddMore}
                            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-110"
                            style={{
                                backgroundColor: canAddMore ? 'var(--ui-accent-primary)' : 'var(--ui-bg-tertiary)',
                                color: canAddMore ? '#ffffff' : 'var(--ui-text-muted)'
                            }}
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px]">
                    <div className="flex items-start gap-2">
                        <Copy className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--ui-accent-primary)' }} />
                        <div className="flex-1">
                            <p className="font-semibold text-sm">{widget.title}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
                                Multi-instance widget{maxInstances ? ` (max ${maxInstances})` : ''}
                            </p>
                        </div>
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--ui-text-secondary)' }}>{widget.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>
                        <span>Size: {widget.defaultSize.w}×{widget.defaultSize.h}</span>
                        {remainingSlots !== undefined && (
                            <span>{remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} available</span>
                        )}
                    </div>
                    {enabledInstances.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t space-y-1.5" style={{ borderColor: 'var(--ui-border-primary)' }}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ui-text-muted)' }}>
                                Active Instances ({enabledInstances.length})
                            </p>
                            {enabledInstances.map((instance, i) => (
                                <div key={instance.id} className="flex items-center gap-2 text-xs py-1 px-1.5 rounded" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>
                                    <span
                                        className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                                        style={{
                                            backgroundColor: 'var(--ui-accent-primary-bg)',
                                            color: 'var(--ui-accent-primary)'
                                        }}
                                    >
                                        {i + 1}
                                    </span>
                                    <span className="flex-1 truncate" style={{ color: 'var(--ui-text-primary)' }}>
                                        {instance.displayName || `${widget.title} ${i + 1}`}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRemoveInstance(instance.id); }}
                                        className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
                                        style={{ color: 'var(--ui-danger)' }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--ui-danger-bg)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});

MultiInstanceWidgetCompact.displayName = "MultiInstanceWidgetCompact";

// ============================================
// Category Sidebar Item
// ============================================

interface CategorySidebarItemProps {
    category: WidgetCategory;
    count: number;
    enabledCount: number;
    isSelected: boolean;
    onClick: () => void;
}

const CategorySidebarItem = React.memo(({
    category,
    count,
    enabledCount,
    isSelected,
    onClick,
}: CategorySidebarItemProps) => {
    const IconComponent = CATEGORY_ICONS[category];
    const metadata = CATEGORY_METADATA[category];

    return (
        <button
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
            style={isSelected ? {
                backgroundColor: 'var(--ui-accent-primary)',
                color: '#ffffff'
            } : {
                color: 'var(--ui-text-secondary)'
            }}
            onClick={onClick}
            onMouseEnter={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                    e.currentTarget.style.color = 'var(--ui-text-primary)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--ui-text-secondary)';
                }
            }}
        >
            {IconComponent && <IconComponent className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1 text-sm font-semibold">{metadata.label}</span>
            <span className="text-xs tabular-nums" style={{
                color: isSelected ? 'rgba(255, 255, 255, 0.8)' : 'var(--ui-text-muted)'
            }}>
                {enabledCount > 0 ? (
                    <><span style={{ color: isSelected ? '#ffffff' : 'var(--ui-accent-primary)', fontWeight: isSelected ? 600 : 500 }}>{enabledCount}</span>/{count}</>
                ) : (
                    count
                )}
            </span>
        </button>
    );
});

CategorySidebarItem.displayName = "CategorySidebarItem";

// ============================================
// Quick Actions
// ============================================

interface QuickActionsProps {
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onInvert: () => void;
    onReset: () => void;
    enabledCount: number;
    totalCount: number;
    hasChanges: boolean;
}

const QuickActions = React.memo(({
    onSelectAll,
    onDeselectAll,
    onInvert,
    onReset,
    enabledCount,
    totalCount,
    hasChanges,
}: QuickActionsProps) => {
    const allSelected = enabledCount === totalCount;
    const noneSelected = enabledCount === 0;

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={onSelectAll}
                            disabled={allSelected}
                            className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ color: 'var(--ui-text-muted)' }}
                            onMouseEnter={(e) => {
                                if (!allSelected) {
                                    e.currentTarget.style.color = 'var(--ui-success)';
                                    e.currentTarget.style.backgroundColor = 'var(--ui-success-bg)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!allSelected) {
                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            <CheckCheck className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Select all visible</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={onDeselectAll}
                            disabled={noneSelected}
                            className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ color: 'var(--ui-text-muted)' }}
                            onMouseEnter={(e) => {
                                if (!noneSelected) {
                                    e.currentTarget.style.color = 'var(--ui-danger)';
                                    e.currentTarget.style.backgroundColor = 'var(--ui-danger-bg)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!noneSelected) {
                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Clear all</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={onInvert}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: 'var(--ui-text-muted)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--ui-accent-secondary)';
                                e.currentTarget.style.backgroundColor = 'var(--ui-accent-secondary-bg)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--ui-text-muted)';
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <Shuffle className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Invert selection</TooltipContent>
                </Tooltip>

                <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--ui-border-primary)' }} />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={onReset}
                            disabled={!hasChanges}
                            className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ color: 'var(--ui-text-muted)' }}
                            onMouseEnter={(e) => {
                                if (hasChanges) {
                                    e.currentTarget.style.color = 'var(--ui-warning)';
                                    e.currentTarget.style.backgroundColor = 'var(--ui-warning-bg)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (hasChanges) {
                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Reset changes</TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
});

QuickActions.displayName = "QuickActions";

// ============================================
// Main Component
// ============================================

export default function WidgetPicker({
    tempLayout,
    setTempLayout,
    handleSave,
    handleCancel,
    activePresetName,
}: WidgetPickerProps) {
    const isMobile = useIsMobile();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | "all">("all");
    const [viewMode, setViewMode] = useState<"list" | "cards" | "compact">("list");
    const [initialLayout] = useState(() => JSON.parse(JSON.stringify(tempLayout)));
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Track changes made this session for the "changes" pill
    const [sessionChanges, setSessionChanges] = useState<Set<string>>(new Set());

    const { filterAccessibleWidgets, loading: permissionsLoading } = useWidgetPermissions();

    // Get accessible widgets
    const accessibleWidgets = useMemo(() => {
        return filterAccessibleWidgets(WIDGET_CONFIGS, "view") as WidgetConfig[];
    }, [filterAccessibleWidgets]);

    // Filter widgets
    const filteredWidgets = useMemo(() => {
        let widgets = accessibleWidgets;
        if (selectedCategory !== "all") {
            widgets = widgets.filter((w) => w.category === selectedCategory);
        }
        if (searchTerm) {
            widgets = searchWidgets(searchTerm, widgets);
        }
        return widgets;
    }, [accessibleWidgets, searchTerm, selectedCategory]);

    // Group widgets by category
    const groupedWidgets = useMemo(() => groupWidgetsByCategory(filteredWidgets), [filteredWidgets]);

    // Enabled widget IDs (for singleton widgets)
    const enabledWidgets = useMemo(() => {
        return new Set(tempLayout.filter((w) => w.enabled).map((w) => w.id));
    }, [tempLayout]);

    // Enabled widget types (includes multi-instance widgets by their base type)
    const enabledWidgetTypes = useMemo(() => {
        return new Set(tempLayout.filter((w) => w.enabled).map((w) => getWidgetType(w.id)));
    }, [tempLayout]);

    // Check if a widget is enabled (works for both singleton and multi-instance widgets)
    const isWidgetEnabled = useCallback((widgetId: string) => {
        const config = WIDGET_CONFIGS.find(w => w.id === widgetId);
        if (config?.allowMultiple) {
            // For multi-instance widgets, check if any instance of this type is enabled
            return countEnabledWidgetInstances(tempLayout, widgetId) > 0;
        }
        // For singleton widgets, check exact ID match
        return enabledWidgets.has(widgetId);
    }, [tempLayout, enabledWidgets]);

    // Category stats
    const categoryStats = useMemo(() => {
        const stats: Record<string, { total: number; enabled: number }> = {};
        accessibleWidgets.forEach((w) => {
            if (!stats[w.category]) stats[w.category] = { total: 0, enabled: 0 };
            stats[w.category].total++;
            // For multi-instance widgets, count number of enabled instances
            if (w.allowMultiple) {
                stats[w.category].enabled += countEnabledWidgetInstances(tempLayout, w.id);
            } else if (enabledWidgets.has(w.id)) {
                stats[w.category].enabled++;
            }
        });
        return stats;
    }, [accessibleWidgets, tempLayout, enabledWidgets]);

    // Check for unsaved changes
    const hasChanges = useMemo(() => {
        const initialEnabled = new Set<string>(initialLayout.filter((w: Widget) => w.enabled).map((w: Widget) => w.id));
        if (initialEnabled.size !== enabledWidgets.size) return true;
        for (const id of Array.from(initialEnabled)) {
            if (!enabledWidgets.has(id)) return true;
        }
        return false;
    }, [initialLayout, enabledWidgets]);

    // Toggle widget (for singleton widgets)
    const toggleWidget = useCallback((widgetId: string) => {
        const widgetDef = WIDGET_CONFIGS.find((w) => w.id === widgetId);
        if (!widgetDef) return;

        // For multi-instance widgets, toggle should add first instance
        if (widgetDef.allowMultiple) {
            const existingInstances = getWidgetInstances(tempLayout, widgetId);
            const enabledInstances = existingInstances.filter(w => w.enabled);

            if (enabledInstances.length === 0) {
                // No enabled instances - add one
                addWidgetInstance(widgetId);
            } else {
                // Has instances - disable all
                setTempLayout(prev => prev.map(w =>
                    getWidgetType(w.id) === widgetId ? { ...w, enabled: false } : w
                ));
            }
            return;
        }

        const existingWidget = tempLayout.find((w) => w.id === widgetId);
        const isCurrentlyEnabled = existingWidget?.enabled || false;

        // Track this change
        setSessionChanges(prev => new Set(prev).add(widgetId));

        if (existingWidget) {
            // Reset to default size when re-enabling a previously disabled widget
            setTempLayout((prev) =>
                prev.map((w) => w.id === widgetId ? {
                    ...w,
                    enabled: !isCurrentlyEnabled,
                    w: widgetDef.defaultSize.w,
                    h: widgetDef.defaultSize.h,
                } : w)
            );
        } else {
            const newWidget: Widget = {
                id: widgetId,
                x: 0, y: 0,
                w: widgetDef.defaultSize.w,
                h: widgetDef.defaultSize.h,
                enabled: true,
                displayName: widgetDef.title,
                category: widgetDef.category,
                description: widgetDef.description,
            };
            setTempLayout((prev) => [...prev, newWidget]);
        }
    }, [tempLayout, setTempLayout]);

    // Add a new instance of a multi-instance widget
    const addWidgetInstance = useCallback((widgetType: string) => {
        if (!canAddInstance(tempLayout, widgetType)) {
            console.warn(`Cannot add more instances of ${widgetType}`);
            return;
        }

        const newWidget = createWidgetInstance(widgetType, tempLayout);
        if (newWidget) {
            setSessionChanges(prev => new Set(prev).add(newWidget.id));
            setTempLayout(prev => [...prev, newWidget]);
        }
    }, [tempLayout, setTempLayout]);

    // Remove a specific widget instance
    const removeWidgetInstance = useCallback((widgetId: string) => {
        setSessionChanges(prev => new Set(prev).add(widgetId));
        // Clean up settings for this instance
        if (isMultiInstanceWidget(widgetId)) {
            widgetSettingsService.deleteInstanceSettings(widgetId);
        }
        setTempLayout(prev => prev.filter(w => w.id !== widgetId));
    }, [setTempLayout]);

    // Get instance count for a multi-instance widget type
    const getInstanceCount = useCallback((widgetType: string) => {
        return countEnabledWidgetInstances(tempLayout, widgetType);
    }, [tempLayout]);

    // Bulk toggle category
    const toggleAllInCategory = useCallback((category: WidgetCategory, enable: boolean) => {
        const categoryWidgets = accessibleWidgets.filter((w) => w.category === category);
        const widgetIds = categoryWidgets.map((w) => w.id);

        setTempLayout((prev) => {
            const updated = [...prev];
            widgetIds.forEach((widgetId) => {
                const existingIndex = updated.findIndex((w) => w.id === widgetId);
                if (existingIndex >= 0) {
                    updated[existingIndex] = { ...updated[existingIndex], enabled: enable };
                } else if (enable) {
                    const widgetDef = WIDGET_CONFIGS.find((w) => w.id === widgetId);
                    if (widgetDef) {
                        updated.push({
                            id: widgetId, x: 0, y: 0,
                            w: widgetDef.defaultSize.w, h: widgetDef.defaultSize.h,
                            enabled: true,
                            displayName: widgetDef.title,
                            category: widgetDef.category,
                            description: widgetDef.description,
                        });
                    }
                }
            });
            return updated;
        });
    }, [accessibleWidgets, setTempLayout]);

    // Global bulk actions
    const selectAllVisible = useCallback(() => {
        const visibleIds = filteredWidgets.map((w) => w.id);
        setTempLayout((prev) => {
            const updated = [...prev];
            visibleIds.forEach((widgetId) => {
                const existingIndex = updated.findIndex((w) => w.id === widgetId);
                if (existingIndex >= 0) {
                    updated[existingIndex] = { ...updated[existingIndex], enabled: true };
                } else {
                    const widgetDef = WIDGET_CONFIGS.find((w) => w.id === widgetId);
                    if (widgetDef) {
                        updated.push({
                            id: widgetId, x: 0, y: 0,
                            w: widgetDef.defaultSize.w, h: widgetDef.defaultSize.h,
                            enabled: true,
                            displayName: widgetDef.title,
                            category: widgetDef.category,
                            description: widgetDef.description,
                        });
                    }
                }
            });
            return updated;
        });
    }, [filteredWidgets, setTempLayout]);

    const deselectAllVisible = useCallback(() => {
        const visibleIds = new Set(filteredWidgets.map((w) => w.id));
        setTempLayout((prev) => prev.map((w) => visibleIds.has(w.id) ? { ...w, enabled: false } : w));
    }, [filteredWidgets, setTempLayout]);

    const invertSelection = useCallback(() => {
        const visibleIds = new Set(filteredWidgets.map((w) => w.id));
        setTempLayout((prev) => {
            const updated = [...prev];
            visibleIds.forEach((widgetId) => {
                const existingIndex = updated.findIndex((w) => w.id === widgetId);
                if (existingIndex >= 0) {
                    updated[existingIndex] = { ...updated[existingIndex], enabled: !updated[existingIndex].enabled };
                } else {
                    const widgetDef = WIDGET_CONFIGS.find((w) => w.id === widgetId);
                    if (widgetDef) {
                        updated.push({
                            id: widgetId, x: 0, y: 0,
                            w: widgetDef.defaultSize.w, h: widgetDef.defaultSize.h,
                            enabled: true,
                            displayName: widgetDef.title,
                            category: widgetDef.category,
                            description: widgetDef.description,
                        });
                    }
                }
            });
            return updated;
        });
    }, [filteredWidgets, setTempLayout]);

    const resetChanges = useCallback(() => {
        setTempLayout(JSON.parse(JSON.stringify(initialLayout)));
    }, [initialLayout, setTempLayout]);

    // Stats
    const enabledCount = tempLayout.filter((w) => w.enabled).length;
    const totalCount = accessibleWidgets.length;
    const visibleEnabledCount = filteredWidgets.filter((w) => isWidgetEnabled(w.id)).length;
    const categories = getAvailableCategories();

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "f") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === "Escape" && searchTerm) {
                e.preventDefault();
                setSearchTerm("");
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [searchTerm, handleSave]);

    // Scroll to top on category change
    useEffect(() => {
        listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, [selectedCategory]);

    // ============================================
    // Mobile View
    // ============================================
    if (isMobile) {
        return (
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed inset-0 z-50 flex flex-col"
                style={{ backgroundColor: 'var(--ui-bg-primary)' }}
            >
                {/* Mobile Header */}
                <div
                    className="flex-shrink-0 border-b safe-top"
                    style={{
                        borderColor: 'var(--ui-border-primary)',
                        backgroundColor: 'var(--ui-bg-primary)'
                    }}
                >
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Grid3x3 className="w-5 h-5" style={{ color: 'var(--ui-accent-primary)' }} />
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                                Widgets
                            </h2>
                        </div>
                        <button
                            onClick={handleCancel}
                            className="p-2 rounded-lg"
                            style={{ color: 'var(--ui-text-secondary)' }}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Status bar */}
                    <div className="px-4 pb-3 flex items-center gap-2">
                        <span
                            className="text-sm font-medium px-2 py-0.5 rounded-md"
                            style={{
                                backgroundColor: enabledCount > 0 ? 'var(--ui-success-bg)' : 'var(--ui-bg-tertiary)',
                                color: enabledCount > 0 ? 'var(--ui-success-text)' : 'var(--ui-text-muted)'
                            }}
                        >
                            {enabledCount} active
                        </span>
                        {hasChanges && (
                            <span
                                className="text-sm font-medium px-2 py-0.5 rounded-md flex items-center gap-1.5"
                                style={{
                                    backgroundColor: 'var(--ui-warning-bg)',
                                    color: 'var(--ui-warning-text)'
                                }}
                            >
                                <span
                                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                                    style={{ backgroundColor: 'var(--ui-warning)' }}
                                />
                                Unsaved
                            </span>
                        )}
                        {activePresetName && (
                            <span
                                className="text-sm font-medium px-2 py-0.5 rounded-md flex items-center gap-1.5"
                                style={{
                                    backgroundColor: 'var(--ui-accent-primary-bg)',
                                    color: 'var(--ui-accent-primary)'
                                }}
                            >
                                <Sparkles className="w-3 h-3" />
                                {activePresetName}
                            </span>
                        )}
                    </div>

                    {/* Search */}
                    <div className="px-4 pb-3">
                        <div className="relative">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                style={{ color: 'var(--ui-text-muted)' }}
                            />
                            <input
                                type="text"
                                placeholder="Search widgets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm"
                                style={{
                                    backgroundColor: 'var(--ui-bg-secondary)',
                                    borderColor: 'var(--ui-border-primary)',
                                    color: 'var(--ui-text-primary)'
                                }}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    style={{ color: 'var(--ui-text-muted)' }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Category Pills */}
                    <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedCategory("all")}
                                className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                                style={selectedCategory === "all" ? {
                                    backgroundColor: 'var(--ui-accent-primary)',
                                    color: '#ffffff'
                                } : {
                                    backgroundColor: 'var(--ui-bg-tertiary)',
                                    color: 'var(--ui-text-secondary)'
                                }}
                            >
                                All ({totalCount})
                            </button>
                            {categories.map((category) => {
                                const IconComponent = CATEGORY_ICONS[category];
                                const stats = categoryStats[category];
                                return (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                                        style={selectedCategory === category ? {
                                            backgroundColor: 'var(--ui-accent-primary)',
                                            color: '#ffffff'
                                        } : {
                                            backgroundColor: 'var(--ui-bg-tertiary)',
                                            color: 'var(--ui-text-secondary)'
                                        }}
                                    >
                                        {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                                        <span>{category}</span>
                                        {stats && stats.enabled > 0 && (
                                            <span
                                                className="text-xs px-1.5 rounded-full"
                                                style={{
                                                    backgroundColor: selectedCategory === category
                                                        ? 'rgba(255,255,255,0.2)'
                                                        : 'var(--ui-accent-primary-bg)',
                                                    color: selectedCategory === category
                                                        ? '#ffffff'
                                                        : 'var(--ui-accent-primary)'
                                                }}
                                            >
                                                {stats.enabled}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Mobile Widget List */}
                <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
                    {permissionsLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader />
                            <p className="text-sm mt-3" style={{ color: 'var(--ui-text-muted)' }}>
                                Loading widgets...
                            </p>
                        </div>
                    ) : filteredWidgets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-12">
                            <Grid3x3
                                className="w-12 h-12 mb-3 opacity-40"
                                style={{ color: 'var(--ui-text-tertiary)' }}
                            />
                            <p className="font-medium" style={{ color: 'var(--ui-text-secondary)' }}>
                                No widgets found
                            </p>
                            <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>
                                {searchTerm ? "Try a different search" : "No widgets in this category"}
                            </p>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="mt-4 px-4 py-2 text-sm rounded-lg"
                                    style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : selectedCategory === "all" && !searchTerm ? (
                        // Grouped by category
                        <div className="space-y-6 pb-32">
                            {CATEGORY_ORDER.map((category) => {
                                const widgets = groupedWidgets[category];
                                if (!widgets?.length) return null;
                                const stats = categoryStats[category];
                                const IconComponent = CATEGORY_ICONS[category];

                                return (
                                    <div key={category}>
                                        <div className="flex items-center gap-2 mb-3 sticky top-0 py-2 -mx-4 px-4"
                                            style={{ backgroundColor: 'var(--ui-bg-primary)' }}
                                        >
                                            {IconComponent && (
                                                <IconComponent
                                                    className="w-4 h-4"
                                                    style={{ color: 'var(--ui-text-muted)' }}
                                                />
                                            )}
                                            <span
                                                className="text-sm font-semibold"
                                                style={{ color: 'var(--ui-text-primary)' }}
                                            >
                                                {CATEGORY_METADATA[category].label}
                                            </span>
                                            <span
                                                className="text-xs"
                                                style={{ color: 'var(--ui-text-muted)' }}
                                            >
                                                {stats?.enabled || 0}/{stats?.total || 0}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {widgets.map((widget) =>
                                                widget.allowMultiple ? (
                                                    <MobileMultiInstanceWidgetCard
                                                        key={widget.id}
                                                        widget={widget}
                                                        instances={getWidgetInstances(tempLayout, widget.id)}
                                                        onAddInstance={() => addWidgetInstance(widget.id)}
                                                        onRemoveInstance={removeWidgetInstance}
                                                        canAddMore={canAddInstance(tempLayout, widget.id)}
                                                    />
                                                ) : (
                                                    <MobileWidgetCard
                                                        key={widget.id}
                                                        widget={widget}
                                                        isEnabled={isWidgetEnabled(widget.id)}
                                                        onToggle={() => toggleWidget(widget.id)}
                                                    />
                                                )
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // Flat list
                        <div className="space-y-2 pb-32">
                            <div
                                className="text-xs mb-3"
                                style={{ color: 'var(--ui-text-muted)' }}
                            >
                                {filteredWidgets.length} result{filteredWidgets.length !== 1 ? "s" : ""} • {visibleEnabledCount} selected
                            </div>
                            {filteredWidgets.map((widget) =>
                                widget.allowMultiple ? (
                                    <MobileMultiInstanceWidgetCard
                                        key={widget.id}
                                        widget={widget}
                                        instances={getWidgetInstances(tempLayout, widget.id)}
                                        onAddInstance={() => addWidgetInstance(widget.id)}
                                        onRemoveInstance={removeWidgetInstance}
                                        canAddMore={canAddInstance(tempLayout, widget.id)}
                                        showCategory={selectedCategory === "all"}
                                    />
                                ) : (
                                    <MobileWidgetCard
                                        key={widget.id}
                                        widget={widget}
                                        isEnabled={isWidgetEnabled(widget.id)}
                                        onToggle={() => toggleWidget(widget.id)}
                                        showCategory={selectedCategory === "all"}
                                    />
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* Mobile Footer */}
                <div
                    className="flex-shrink-0 border-t p-4 safe-bottom"
                    style={{
                        borderColor: 'var(--ui-border-primary)',
                        backgroundColor: 'var(--ui-bg-primary)'
                    }}
                >
                    <div className="flex gap-3">
                        <button
                            onClick={handleCancel}
                            className="flex-1 py-3 rounded-xl font-medium transition-colors"
                            style={{
                                backgroundColor: 'var(--ui-bg-tertiary)',
                                color: 'var(--ui-text-secondary)'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges}
                            className="flex-1 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                            style={{
                                backgroundColor: hasChanges ? 'var(--ui-accent-primary)' : 'var(--ui-bg-tertiary)',
                                color: hasChanges ? '#ffffff' : 'var(--ui-text-muted)'
                            }}
                        >
                            Apply Changes
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    // ============================================
    // Desktop View
    // ============================================
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="rounded-xl border w-full max-w-6xl h-[90vh] max-h-[900px] flex flex-col overflow-hidden shadow-2xl"
                style={{
                    backgroundColor: 'var(--ui-bg-primary)',
                    borderColor: 'var(--ui-border-primary)'
                }}
            >
                {/* Header - Clean with view modes */}
                <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--ui-border-primary)' }}>
                    <div className="px-5 py-3 flex items-center gap-3">
                        {/* Search - Primary, takes most space */}
                        <div className="flex-1">
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ui-text-muted)' }}>
                                    <Search className="w-4 h-4" />
                                </div>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search widgets..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border focus:outline-none transition-colors placeholder:opacity-50"
                                    style={{
                                        backgroundColor: 'var(--ui-bg-secondary)',
                                        borderColor: 'var(--ui-border-primary)',
                                        color: 'var(--ui-text-primary)'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--ui-accent-primary)';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px var(--ui-accent-primary-bg)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--ui-border-primary)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                                        style={{ color: 'var(--ui-text-muted)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ui-text-secondary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ui-text-muted)'}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* View Mode Switcher - Compact */}
                        <div className="flex items-center rounded-lg p-0.5 border" style={{
                            backgroundColor: 'var(--ui-bg-secondary)',
                            borderColor: 'var(--ui-border-primary)'
                        }}>
                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => setViewMode("list")}
                                            className="p-2 rounded-md transition-all"
                                            style={viewMode === "list" ? {
                                                backgroundColor: 'var(--ui-accent-primary)',
                                                color: '#ffffff'
                                            } : {
                                                color: 'var(--ui-text-muted)'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (viewMode !== "list") {
                                                    e.currentTarget.style.color = 'var(--ui-text-primary)';
                                                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (viewMode !== "list") {
                                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            }}
                                        >
                                            <List className="w-4 h-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>List view</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => setViewMode("cards")}
                                            className="p-2 rounded-md transition-all"
                                            style={viewMode === "cards" ? {
                                                backgroundColor: 'var(--ui-accent-primary)',
                                                color: '#ffffff'
                                            } : {
                                                color: 'var(--ui-text-muted)'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (viewMode !== "cards") {
                                                    e.currentTarget.style.color = 'var(--ui-text-primary)';
                                                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (viewMode !== "cards") {
                                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            }}
                                        >
                                            <LayoutDashboard className="w-4 h-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Card view</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => setViewMode("compact")}
                                            className="p-2 rounded-md transition-all"
                                            style={viewMode === "compact" ? {
                                                backgroundColor: 'var(--ui-accent-primary)',
                                                color: '#ffffff'
                                            } : {
                                                color: 'var(--ui-text-muted)'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (viewMode !== "compact") {
                                                    e.currentTarget.style.color = 'var(--ui-text-primary)';
                                                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (viewMode !== "compact") {
                                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            }}
                                        >
                                            <Grid3X3 className="w-4 h-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Compact view</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div className="w-px h-6" style={{ backgroundColor: 'var(--ui-border-primary)' }} />

                        {/* Status */}
                        <div className="flex items-center gap-3">
                            {activePresetName && (
                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg" style={{
                                    backgroundColor: 'var(--ui-accent-primary-bg)'
                                }}>
                                    <div style={{ color: 'var(--ui-accent-primary)' }}>
                                        <Sparkles className="w-3 h-3" />
                                    </div>
                                    <span className="text-xs font-medium" style={{ color: 'var(--ui-accent-primary)' }}>{activePresetName}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium tabular-nums" style={enabledCount > 0 ? {
                                backgroundColor: 'var(--ui-success-bg)',
                                color: 'var(--ui-success-text)'
                            } : {
                                backgroundColor: 'var(--ui-bg-tertiary)',
                                color: 'var(--ui-text-muted)'
                            }}>
                                {enabledCount} active
                            </div>
                            {hasChanges && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{
                                    backgroundColor: 'var(--ui-warning-bg)',
                                    color: 'var(--ui-warning-text)'
                                }}>
                                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--ui-warning)' }} />
                                    Unsaved
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <QuickActions
                                onSelectAll={selectAllVisible}
                                onDeselectAll={deselectAllVisible}
                                onInvert={invertSelection}
                                onReset={resetChanges}
                                enabledCount={visibleEnabledCount}
                                totalCount={filteredWidgets.length}
                                hasChanges={hasChanges}
                            />

                            <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--ui-border-primary)' }} />

                            <button
                                onClick={handleCancel}
                                className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                                style={{ color: 'var(--ui-text-muted)' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = 'var(--ui-text-primary)';
                                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges}
                                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                style={hasChanges ? {
                                    backgroundColor: 'var(--ui-accent-primary)',
                                    color: '#ffffff'
                                } : {
                                    backgroundColor: 'var(--ui-bg-secondary)',
                                    color: 'var(--ui-text-muted)',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: 'var(--ui-border-primary)'
                                }}
                                onMouseEnter={(e) => {
                                    if (hasChanges) {
                                        e.currentTarget.style.backgroundColor = 'var(--ui-accent-primary-hover)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (hasChanges) {
                                        e.currentTarget.style.backgroundColor = 'var(--ui-accent-primary)';
                                    }
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-56 flex-shrink-0 border-r p-3 overflow-y-auto" style={{
                        borderColor: 'var(--ui-border-primary)'
                    }}>
                        {/* All Widgets */}
                        <button
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left mb-2"
                            style={selectedCategory === "all" ? {
                                backgroundColor: 'var(--ui-accent-primary)',
                                color: '#ffffff'
                            } : {
                                color: 'var(--ui-text-secondary)'
                            }}
                            onClick={() => setSelectedCategory("all")}
                            onMouseEnter={(e) => {
                                if (selectedCategory !== "all") {
                                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                    e.currentTarget.style.color = 'var(--ui-text-primary)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedCategory !== "all") {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--ui-text-secondary)';
                                }
                            }}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span className="flex-1 text-sm font-semibold">All Widgets</span>
                            <span className="text-xs tabular-nums" style={{
                                color: selectedCategory === "all" ? 'rgba(255, 255, 255, 0.8)' : 'var(--ui-text-muted)'
                            }}>
                                {enabledCount > 0 ? (
                                    <><span style={{ color: selectedCategory === "all" ? '#ffffff' : 'var(--ui-accent-primary)', fontWeight: selectedCategory === "all" ? 600 : 500 }}>{enabledCount}</span>/{totalCount}</>
                                ) : (
                                    totalCount
                                )}
                            </span>
                        </button>

                        <div className="h-px my-2" style={{ backgroundColor: 'var(--ui-border-primary)' }} />

                        {/* Categories */}
                        <div className="space-y-0.5">
                            {categories.map((category) => (
                                <CategorySidebarItem
                                    key={category}
                                    category={category}
                                    count={categoryStats[category]?.total || 0}
                                    enabledCount={categoryStats[category]?.enabled || 0}
                                    isSelected={selectedCategory === category}
                                    onClick={() => setSelectedCategory(category)}
                                />
                            ))}
                        </div>

                        {/* Shortcuts */}
                        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--ui-border-primary)' }}>
                            <p className="text-[10px] uppercase tracking-wider font-medium mb-2 px-1" style={{ color: 'var(--ui-text-muted)' }}>Shortcuts</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { label: "Search", keys: "⌘F" },
                                    { label: "Save", keys: "⌘↵" },
                                    { label: "Close", keys: "Esc" },
                                ].map(({ label, keys }) => (
                                    <div key={label} className="flex items-center justify-between px-1" style={{ color: 'var(--ui-text-muted)' }}>
                                        <span>{label}</span>
                                        <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{
                                            backgroundColor: 'var(--ui-bg-tertiary)'
                                        }}>{keys}</kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Widget Content - View Mode Dependent */}
                    <div ref={listRef} className="flex-1 overflow-y-auto">
                        {permissionsLoading ? (
                            <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--ui-text-muted)' }}>
                                <Loader />
                                <p className="text-sm mt-3">Loading widgets...</p>
                            </div>
                        ) : filteredWidgets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full px-8" style={{ color: 'var(--ui-text-muted)' }}>
                                <div style={{ opacity: 0.3 }}>
                                    <Search className="w-10 h-10 mb-4" />
                                </div>
                                <p className="font-medium" style={{ color: 'var(--ui-text-secondary)' }}>No widgets found</p>
                                <p className="text-sm mt-1 text-center" style={{ color: 'var(--ui-text-muted)' }}>
                                    {searchTerm ? `No results for "${searchTerm}"` : "No widgets in this category."}
                                </p>
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="mt-4 px-4 py-2 text-sm rounded-lg transition-colors"
                                        style={{
                                            backgroundColor: 'var(--ui-bg-tertiary)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ui-bg-quaternary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)'}
                                    >
                                        Clear search
                                    </button>
                                )}
                            </div>
                        ) : viewMode === "cards" ? (
                            // Card Grid View
                            <div className="p-4">
                                {selectedCategory === "all" && !searchTerm ? (
                                    // Grouped cards
                                    CATEGORY_ORDER.map((category) => {
                                        const widgets = groupedWidgets[category];
                                        if (!widgets?.length) return null;
                                        const stats = categoryStats[category];
                                        const IconComponent = CATEGORY_ICONS[category];

                                        return (
                                            <div key={category} className="mb-8 last:mb-0">
                                                <div className="flex items-center gap-2 mb-4">
                                                    {IconComponent && <div style={{ color: 'var(--ui-text-muted)' }}><IconComponent className="w-5 h-5" /></div>}
                                                    <h3 className="text-sm font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                                                        {CATEGORY_METADATA[category].label}
                                                    </h3>
                                                    <span className="text-xs ml-1" style={{ color: 'var(--ui-text-muted)' }}>
                                                        {stats?.enabled || 0}/{stats?.total || 0}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                                    {widgets.map((widget) =>
                                                        widget.allowMultiple ? (
                                                            <MultiInstanceWidgetCard
                                                                key={widget.id}
                                                                widget={widget}
                                                                instances={getWidgetInstances(tempLayout, widget.id)}
                                                                onAddInstance={() => addWidgetInstance(widget.id)}
                                                                onRemoveInstance={removeWidgetInstance}
                                                                canAddMore={canAddInstance(tempLayout, widget.id)}
                                                            />
                                                        ) : (
                                                            <WidgetCard
                                                                key={widget.id}
                                                                widget={widget}
                                                                isEnabled={isWidgetEnabled(widget.id)}
                                                                onToggle={() => toggleWidget(widget.id)}
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    // Flat card grid
                                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {filteredWidgets.map((widget) =>
                                            widget.allowMultiple ? (
                                                <MultiInstanceWidgetCard
                                                    key={widget.id}
                                                    widget={widget}
                                                    instances={getWidgetInstances(tempLayout, widget.id)}
                                                    onAddInstance={() => addWidgetInstance(widget.id)}
                                                    onRemoveInstance={removeWidgetInstance}
                                                    canAddMore={canAddInstance(tempLayout, widget.id)}
                                                />
                                            ) : (
                                                <WidgetCard
                                                    key={widget.id}
                                                    widget={widget}
                                                    isEnabled={isWidgetEnabled(widget.id)}
                                                    onToggle={() => toggleWidget(widget.id)}
                                                />
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : viewMode === "compact" ? (
                            // Compact Dense Grid
                            <div className="p-4">
                                {selectedCategory === "all" && !searchTerm ? (
                                    // Grouped compact
                                    CATEGORY_ORDER.map((category) => {
                                        const widgets = groupedWidgets[category];
                                        if (!widgets?.length) return null;
                                        const stats = categoryStats[category];
                                        const IconComponent = CATEGORY_ICONS[category];

                                        return (
                                            <div key={category} className="mb-5 last:mb-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {IconComponent && <div style={{ color: 'var(--ui-text-muted)' }}><IconComponent className="w-4 h-4" /></div>}
                                                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ui-text-secondary)' }}>
                                                        {CATEGORY_METADATA[category].label}
                                                    </span>
                                                    <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>
                                                        {stats?.enabled || 0}/{stats?.total || 0}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {widgets.map((widget) =>
                                                        widget.allowMultiple ? (
                                                            <MultiInstanceWidgetCompact
                                                                key={widget.id}
                                                                widget={widget}
                                                                instances={getWidgetInstances(tempLayout, widget.id)}
                                                                onAddInstance={() => addWidgetInstance(widget.id)}
                                                                onRemoveInstance={removeWidgetInstance}
                                                                canAddMore={canAddInstance(tempLayout, widget.id)}
                                                            />
                                                        ) : (
                                                            <WidgetCompact
                                                                key={widget.id}
                                                                widget={widget}
                                                                isEnabled={isWidgetEnabled(widget.id)}
                                                                onToggle={() => toggleWidget(widget.id)}
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    // Flat compact
                                    <div className="flex flex-wrap gap-1.5">
                                        {filteredWidgets.map((widget) =>
                                            widget.allowMultiple ? (
                                                <MultiInstanceWidgetCompact
                                                    key={widget.id}
                                                    widget={widget}
                                                    instances={getWidgetInstances(tempLayout, widget.id)}
                                                    onAddInstance={() => addWidgetInstance(widget.id)}
                                                    onRemoveInstance={removeWidgetInstance}
                                                    canAddMore={canAddInstance(tempLayout, widget.id)}
                                                />
                                            ) : (
                                                <WidgetCompact
                                                    key={widget.id}
                                                    widget={widget}
                                                    isEnabled={isWidgetEnabled(widget.id)}
                                                    onToggle={() => toggleWidget(widget.id)}
                                                />
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : selectedCategory === "all" && !searchTerm ? (
                            // List View - Grouped
                            <div className="p-4">
                                {CATEGORY_ORDER.map((category) => {
                                    const widgets = groupedWidgets[category];
                                    if (!widgets?.length) return null;
                                    const stats = categoryStats[category];
                                    const IconComponent = CATEGORY_ICONS[category];
                                    const allEnabled = stats?.enabled === stats?.total;
                                    const noneEnabled = stats?.enabled === 0;

                                    return (
                                        <div key={category} className="mb-6 last:mb-0">
                                            {/* Category Header */}
                                            <div className="flex items-center gap-2 px-3 py-2 sticky top-0 z-10 border-b" style={{
                                                backgroundColor: 'var(--ui-bg-primary)',
                                                borderColor: 'var(--ui-border-primary)'
                                            }}>
                                                <div className="flex items-center gap-2 flex-1">
                                                    {IconComponent && <div style={{ color: 'var(--ui-text-muted)' }}><IconComponent className="w-4 h-4" /></div>}
                                                    <span className="text-sm font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                                                        {CATEGORY_METADATA[category].label}
                                                    </span>
                                                    <span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                                                        {stats?.enabled || 0}/{stats?.total || 0}
                                                    </span>
                                                </div>

                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => toggleAllInCategory(category, true)}
                                                                disabled={allEnabled}
                                                                className="p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                style={{ color: 'var(--ui-text-muted)' }}
                                                                onMouseEnter={(e) => {
                                                                    if (!allEnabled) {
                                                                        e.currentTarget.style.color = 'var(--ui-success)';
                                                                        e.currentTarget.style.backgroundColor = 'var(--ui-success-bg)';
                                                                    }
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!allEnabled) {
                                                                        e.currentTarget.style.color = 'var(--ui-text-muted)';
                                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                                    }
                                                                }}
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Enable all</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => toggleAllInCategory(category, false)}
                                                                disabled={noneEnabled}
                                                                className="p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                style={{ color: 'var(--ui-text-muted)' }}
                                                                onMouseEnter={(e) => {
                                                                    if (!noneEnabled) {
                                                                        e.currentTarget.style.color = 'var(--ui-danger)';
                                                                        e.currentTarget.style.backgroundColor = 'var(--ui-danger-bg)';
                                                                    }
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!noneEnabled) {
                                                                        e.currentTarget.style.color = 'var(--ui-text-muted)';
                                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                                    }
                                                                }}
                                                            >
                                                                <Minus className="w-3.5 h-3.5" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Disable all</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>

                                            {/* Widgets */}
                                            <div className="mt-1">
                                                {widgets.map((widget) =>
                                                    widget.allowMultiple ? (
                                                        <MultiInstanceWidgetRow
                                                            key={widget.id}
                                                            widget={widget}
                                                            instances={getWidgetInstances(tempLayout, widget.id)}
                                                            onAddInstance={() => addWidgetInstance(widget.id)}
                                                            onRemoveInstance={removeWidgetInstance}
                                                            canAddMore={canAddInstance(tempLayout, widget.id)}
                                                        />
                                                    ) : (
                                                        <WidgetRow
                                                            key={widget.id}
                                                            widget={widget}
                                                            isEnabled={isWidgetEnabled(widget.id)}
                                                            onToggle={() => toggleWidget(widget.id)}
                                                        />
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            // List View - Flat
                            <div className="p-4">
                                <div className="flex items-center justify-between px-3 py-2 mb-2 text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                                    <span>{filteredWidgets.length} result{filteredWidgets.length !== 1 ? "s" : ""}</span>
                                    <span>{visibleEnabledCount} selected</span>
                                </div>
                                {filteredWidgets.map((widget) =>
                                    widget.allowMultiple ? (
                                        <MultiInstanceWidgetRow
                                            key={widget.id}
                                            widget={widget}
                                            instances={getWidgetInstances(tempLayout, widget.id)}
                                            onAddInstance={() => addWidgetInstance(widget.id)}
                                            onRemoveInstance={removeWidgetInstance}
                                            canAddMore={canAddInstance(tempLayout, widget.id)}
                                            showCategory={selectedCategory === "all"}
                                        />
                                    ) : (
                                        <WidgetRow
                                            key={widget.id}
                                            widget={widget}
                                            isEnabled={isWidgetEnabled(widget.id)}
                                            onToggle={() => toggleWidget(widget.id)}
                                            showCategory={selectedCategory === "all"}
                                        />
                                    )
                                )}
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - Minimal, keyboard hints only */}
                <div className="px-6 py-2.5 border-t flex items-center justify-between" style={{
                    borderColor: 'var(--ui-border-primary)',
                    backgroundColor: 'var(--ui-bg-secondary)'
                }}>
                    <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                        <span className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>Space</kbd>
                            Toggle widget
                        </span>
                        <span className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>⌘F</kbd>
                            Search
                        </span>
                        <span className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>⌘↵</kbd>
                            Save
                        </span>
                        <span className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>Esc</kbd>
                            {searchTerm ? "Clear search" : "Close"}
                        </span>
                    </div>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--ui-text-muted)' }}>
                        {filteredWidgets.length} widgets
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
