"use client";

import React, { useState, useEffect, useCallback, Suspense, useMemo, useRef } from "react";
import { motion, AnimatePresence, PanInfo, useAnimation } from "framer-motion";
import { getWidgetById } from "@/constants/widgets";
import {
    WIDGET_CONFIGS,
    WidgetCategory,
    getWidgetConfig,
    getAvailableCategories,
    searchWidgets,
    WidgetConfig,
} from "@/components/widgets/registry";
import {
    MdWidgets,
    MdSettings,
    MdClose,
    MdExpandMore,
    MdBarChart,
    MdAttachMoney,
    MdShoppingCart,
    MdInventory,
    MdReceipt,
    MdDescription,
    MdTune,
    MdBuild,
    MdAccessTime,
    MdTrendingUp,
    MdPeople,
    MdLocalShipping,
    MdTableChart,
    MdPieChart,
    MdShowChart,
    MdTimeline,
    MdSearch,
    MdCheck,
    MdAdd,
    MdDelete,
    MdRefresh,
    MdVisibilityOff,
    MdVisibility,
    MdBookmarks,
    MdMoreVert,
    MdSave,
    MdEdit,
    MdChevronLeft,
    MdChevronRight,
} from "react-icons/md";
import { useWidgetPermissions } from "@/hooks/useWidgetPermissions";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { Loader } from "@/components/ui/loader";
import { WidgetErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "sonner";
import {
    MobilePresetsState,
    MobilePreset,
    readMobilePresets,
    saveMobilePresets,
    getStarterPresets,
    toggleWidgetInActivePreset,
    updateActivePresetWidgets,
    savePreset,
    deletePreset,
    findNextEmptySlot,
    subscribeMobilePresets,
} from "@/utils/mobilePresetUtils";
import { getWidgetSettingsSchema } from "@/constants/widgetSettings";
import WidgetSettingsDialog from "@/components/WidgetSettingsDialog";

// dnd-kit imports
import {
    DndContext,
    closestCenter,
    pointerWithin,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    DragOverlay,
    useDroppable,
    CollisionDetection,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    useSortable,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ============================================
// Category Icons
// ============================================

const CATEGORY_ICONS: Record<WidgetCategory, React.ComponentType<{ className?: string }>> = {
    Sales: MdAttachMoney,
    Purchasing: MdShoppingCart,
    Inventory: MdInventory,
    AP: MdReceipt,
    Analytics: MdBarChart,
    Reports: MdDescription,
    Operations: MdTune,
    Utilities: MdBuild,
};

const getWidgetTypeIcon = (widgetId: string): React.ComponentType<{ className?: string }> => {
    const id = widgetId.toLowerCase();
    if (id.includes('clock') || id.includes('date')) return MdAccessTime;
    if (id.includes('pie')) return MdPieChart;
    if (id.includes('line') || id.includes('cumulative')) return MdShowChart;
    if (id.includes('bar') || id.includes('chart')) return MdBarChart;
    if (id.includes('table') || id.includes('log') || id.includes('orders')) return MdTableChart;
    if (id.includes('customer') || id.includes('user')) return MdPeople;
    if (id.includes('due') || id.includes('delivery')) return MdLocalShipping;
    if (id.includes('overview') || id.includes('summary')) return MdTrendingUp;
    if (id.includes('status') || id.includes('tracker')) return MdTimeline;
    return MdBarChart;
};

// ============================================
// Types
// ============================================

export interface MobileDashboardProps {
    onSettingsClick: () => void;
}

// ============================================
// Sortable Widget Card
// ============================================

interface SortableWidgetCardProps {
    widgetId: string;
    onClick: () => void;
    isEditing: boolean;
}

const SortableWidgetCard = ({ widgetId, onClick, isEditing }: SortableWidgetCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: widgetId, disabled: !isEditing });

    const config = getWidgetConfig(widgetId);
    const widgetDef = getWidgetById(widgetId);
    const CategoryIcon = config ? CATEGORY_ICONS[config.category] : MdBarChart;
    const TypeIcon = getWidgetTypeIcon(widgetId);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="mobile-widget-card-placeholder"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`mobile-widget-card group ${isEditing ? 'mobile-widget-card-editing' : ''}`}
            onClick={() => !isEditing && onClick()}
            {...(isEditing ? { ...attributes, ...listeners } : {})}
        >
            {/* Icon */}
            <div className="mobile-widget-card-icon">
                <TypeIcon className="w-6 h-6 text-[var(--ui-accent-primary)]" />
            </div>

            {/* Content */}
            <div className="mobile-widget-card-content">
                <h3
                    className="text-sm font-semibold line-clamp-1"
                    style={{ color: 'var(--ui-text-primary)' }}
                >
                    {widgetDef?.title || config?.title || widgetId}
                </h3>
                {config?.category && (
                    <div className="flex items-center gap-1 mt-1">
                        <CategoryIcon className="w-3 h-3 text-[var(--ui-text-muted)]" />
                        <span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                            {config.category}
                        </span>
                    </div>
                )}
            </div>

            {/* Edit mode indicator */}
            {isEditing && (
                <div className="absolute top-2 right-2">
                    <div className="w-5 h-5 rounded-full bg-ui-accent-primary/20 flex items-center justify-center">
                        <MdEdit className="w-3 h-3 text-ui-accent-primary" />
                    </div>
                </div>
            )}

            {/* Tap indicator */}
            {!isEditing && (
                <div
                    className="absolute bottom-2 right-2 opacity-0 group-active:opacity-100 transition-opacity"
                    style={{ color: 'var(--ui-text-muted)' }}
                >
                    <MdExpandMore className="w-4 h-4 rotate-[-90deg]" />
                </div>
            )}
        </div>
    );
};

// ============================================
// Drag Overlay Card
// ============================================

const DragOverlayCard = ({ widgetId }: { widgetId: string }) => {
    const config = getWidgetConfig(widgetId);
    const widgetDef = getWidgetById(widgetId);
    const CategoryIcon = config ? CATEGORY_ICONS[config.category] : MdBarChart;
    const TypeIcon = getWidgetTypeIcon(widgetId);

    return (
        <div
            className="mobile-widget-card"
            style={{
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                transform: 'scale(1.05)',
            }}
        >
            <div className="mobile-widget-card-icon">
                <TypeIcon className="w-6 h-6 text-[var(--ui-accent-primary)]" />
            </div>
            <div className="mobile-widget-card-content">
                <h3 className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--ui-text-primary)' }}>
                    {widgetDef?.title || config?.title || widgetId}
                </h3>
                {config?.category && (
                    <div className="flex items-center gap-1 mt-1">
                        <CategoryIcon className="w-3 h-3 text-[var(--ui-text-muted)]" />
                        <span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                            {config.category}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// Trash Drop Zone
// ============================================

interface TrashDropZoneProps {
    isOver: boolean;
    isVisible: boolean;
}

const TrashDropZone = ({ isOver, isVisible }: TrashDropZoneProps) => {
    const { setNodeRef, isOver: dndIsOver } = useDroppable({ id: 'trash-zone' });
    const showActive = isOver || dndIsOver;

    return (
        <div
            ref={setNodeRef}
            className="fixed top-0 inset-x-0 z-[200] flex justify-center transition-all duration-200"
            style={{
                paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
                paddingBottom: '10px',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(-60px)',
                pointerEvents: isVisible ? 'auto' : 'none',
            }}
        >
            <div
                className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium shadow-lg transition-all duration-200 ${showActive ? 'scale-110' : 'scale-100'}`}
                style={{
                    backgroundColor: showActive ? '#ef4444' : 'var(--ui-bg-tertiary)',
                    color: showActive ? '#ffffff' : 'var(--ui-text-secondary)',
                    border: showActive ? '2px solid #dc2626' : '2px dashed var(--ui-border-secondary)',
                }}
            >
                <MdDelete className={`w-5 h-5 ${showActive ? 'animate-pulse' : ''}`} />
                <span>{showActive ? 'Release to remove' : 'Drag here to remove'}</span>
            </div>
        </div>
    );
};

// ============================================
// Preset Tabs
// ============================================

interface PresetTabsProps {
    presets: MobilePresetsState;
    onPresetChange: (index: number) => void;
    onAddPreset: () => void;
}

const PresetTabs = ({ presets, onPresetChange, onAddPreset }: PresetTabsProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll active preset into view
        if (scrollRef.current) {
            const activeTab = scrollRef.current.children[presets.activePresetIndex] as HTMLElement;
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [presets.activePresetIndex]);

    return (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide" ref={scrollRef}>
            {presets.presets.map((preset, index) => {
                const isActive = presets.activePresetIndex === index;
                const isEmpty = preset === null;

                return (
                    <button
                        key={index}
                        onClick={() => isEmpty ? onAddPreset() : onPresetChange(index)}
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive
                                ? 'bg-ui-accent-primary text-white shadow-md'
                                : isEmpty
                                    ? 'bg-ui-bg-tertiary/50 text-ui-text-muted border border-dashed border-ui-border-secondary'
                                    : 'bg-ui-bg-tertiary text-ui-text-secondary'
                            }`}
                    >
                        {isEmpty ? (
                            <>
                                <MdAdd className="w-4 h-4" />
                                <span>New</span>
                            </>
                        ) : (
                            <>
                                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                </span>
                                <span className="max-w-20 truncate">{preset.name}</span>
                            </>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

// ============================================
// Pull to Refresh
// ============================================

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const THRESHOLD = 80;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (containerRef.current?.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isRefreshing || containerRef.current?.scrollTop !== 0) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        if (diff > 0) {
            setPullDistance(Math.min(diff * 0.5, THRESHOLD * 1.5));
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance >= THRESHOLD && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(THRESHOLD);

            try {
                await onRefresh();
                toast.success("Refreshed!");
            } catch (error) {
                toast.error("Failed to refresh");
            }

            setIsRefreshing(false);
        }
        setPullDistance(0);
    };

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <div
                className="flex items-center justify-center transition-all duration-200"
                style={{
                    height: pullDistance,
                    opacity: pullDistance / THRESHOLD,
                }}
            >
                <motion.div
                    animate={{ rotate: isRefreshing ? 360 : (pullDistance / THRESHOLD) * 180 }}
                    transition={{ duration: isRefreshing ? 1 : 0, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
                >
                    <MdRefresh className={`w-6 h-6 ${pullDistance >= THRESHOLD ? 'text-ui-accent-primary' : 'text-ui-text-muted'}`} />
                </motion.div>
            </div>
            {children}
        </div>
    );
};

// ============================================
// Draggable Widget Grid
// ============================================

interface DraggableGridProps {
    widgetIds: string[];
    onReorder: (newOrder: string[]) => void;
    onWidgetClick: (widgetId: string) => void;
    onRemoveWidget: (widgetId: string) => void;
    isEditing: boolean;
}

const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    const trashCollision = pointerCollisions.find(c => c.id === 'trash-zone');
    if (trashCollision) return [trashCollision];
    return closestCenter(args);
};

const DraggableWidgetGrid = ({ widgetIds, onReorder, onWidgetClick, onRemoveWidget, isEditing }: DraggableGridProps) => {
    const [items, setItems] = useState(widgetIds);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isOverTrash, setIsOverTrash] = useState(false);

    const sensors = useSensors(
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 8,
            },
        })
    );

    useEffect(() => {
        setItems(widgetIds);
    }, [widgetIds]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        try { navigator.vibrate?.(50); } catch { }
    };

    const handleDragOver = (event: DragOverEvent) => {
        setIsOverTrash(event.over?.id === 'trash-zone');
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setIsOverTrash(false);

        if (over?.id === 'trash-zone') {
            onRemoveWidget(active.id as string);
            return;
        }

        if (over && active.id !== over.id) {
            setItems((currentItems) => {
                const oldIndex = currentItems.indexOf(active.id as string);
                const newIndex = currentItems.indexOf(over.id as string);
                const newItems = arrayMove(currentItems, oldIndex, newIndex);
                onReorder(newItems);
                return newItems;
            });
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={() => { setActiveId(null); setIsOverTrash(false); }}
        >
            <TrashDropZone isOver={isOverTrash} isVisible={!!activeId} />
            <SortableContext items={items} strategy={rectSortingStrategy}>
                <div className="mobile-widget-grid">
                    {items.map((widgetId) => (
                        <SortableWidgetCard
                            key={widgetId}
                            widgetId={widgetId}
                            onClick={() => onWidgetClick(widgetId)}
                            isEditing={isEditing}
                        />
                    ))}
                </div>
            </SortableContext>
            <DragOverlay>
                {activeId ? <DragOverlayCard widgetId={activeId} /> : null}
            </DragOverlay>
        </DndContext>
    );
};

// ============================================
// Detail View (Full Screen Widget)
// ============================================

interface DetailViewProps {
    widgetId: string;
    onClose: () => void;
}

const DetailView = ({ widgetId, onClose }: DetailViewProps) => {
    const widgetDef = getWidgetById(widgetId);
    const config = getWidgetConfig(widgetId);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const hasSettings = getWidgetSettingsSchema(widgetId) !== null;

    const handleDragEnd = (_: any, info: PanInfo) => {
        if (info.offset.y > 100 || info.velocity.y > 500) {
            onClose();
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="fixed inset-0 z-50"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "tween", duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0.1, bottom: 0.3 }}
                    onDragEnd={handleDragEnd}
                    className="absolute inset-x-0 bottom-0 top-[env(safe-area-inset-top)] flex flex-col overflow-hidden"
                    style={{
                        backgroundColor: 'var(--ui-bg-primary)',
                        borderTopLeftRadius: '1.5rem',
                        borderTopRightRadius: '1.5rem',
                        willChange: 'transform',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Drag Handle */}
                    <div className="flex justify-center py-3 flex-shrink-0">
                        <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--ui-border-secondary)' }} />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pb-3 border-b flex-shrink-0" style={{ borderColor: 'var(--ui-border-primary)' }}>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-semibold truncate" style={{ color: 'var(--ui-text-primary)' }}>
                                {widgetDef?.title || config?.title || widgetId}
                            </h2>
                            {config?.category && (
                                <span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>{config.category}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            {hasSettings && (
                                <button
                                    onClick={() => setSettingsOpen(true)}
                                    className="p-2 rounded-full transition-colors"
                                    style={{ backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--ui-text-secondary)' }}
                                    aria-label="Widget Settings"
                                >
                                    <MdTune className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full transition-colors"
                                style={{ backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--ui-text-secondary)' }}
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Widget Content */}
                    <div className="flex-1 overflow-auto p-4" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
                        {widgetDef && (
                            <WidgetErrorBoundary widgetName={widgetDef.displayName || widgetDef.id}>
                                <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader /></div>}>
                                    <div className="h-full min-h-[300px]">
                                        <widgetDef.component />
                                    </div>
                                </Suspense>
                            </WidgetErrorBoundary>
                        )}
                    </div>

                    {/* Swipe hint */}
                    <motion.div
                        className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none"
                        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 0.8, y: 0 }}
                        transition={{ delay: 1 }}
                    >
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--ui-text-muted)' }}>
                            <MdExpandMore className="w-4 h-4" />
                            <span className="text-xs font-medium">Swipe down to close</span>
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>

            {hasSettings && (
                <WidgetSettingsDialog
                    widgetId={widgetId}
                    widgetTitle={widgetDef?.title || config?.title || widgetId}
                    isOpen={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                />
            )}
        </>
    );
};

// ============================================
// Mobile Widget Picker
// ============================================

interface MobileWidgetPickerProps {
    enabledWidgetIds: string[];
    onToggleWidget: (widgetId: string) => void;
    onClose: () => void;
}

const MobileWidgetPicker = ({ enabledWidgetIds, onToggleWidget, onClose }: MobileWidgetPickerProps) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | "all">("all");
    const { filterAccessibleWidgets } = useWidgetPermissions();

    const accessibleWidgets = useMemo(() => {
        return filterAccessibleWidgets(WIDGET_CONFIGS, 'view') as WidgetConfig[];
    }, [filterAccessibleWidgets]);

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

    const categories = getAvailableCategories();
    const enabledSet = useMemo(() => new Set(enabledWidgetIds), [enabledWidgetIds]);

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ backgroundColor: 'var(--ui-bg-primary)', willChange: 'transform' }}
        >
            {/* Header */}
            <div className="flex-shrink-0 border-b safe-top" style={{ borderColor: 'var(--ui-border-primary)' }}>
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <MdWidgets className="w-5 h-5" style={{ color: 'var(--ui-accent-primary)' }} />
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--ui-text-primary)' }}>Add Widgets</h2>
                            <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                                {enabledSet.size} selected
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg" style={{ color: 'var(--ui-text-secondary)' }}>
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ui-text-muted)' }} />
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
                            <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ui-text-muted)' }}>
                                <MdClose className="w-4 h-4" />
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
                                backgroundColor: 'var(--ui-accent-primary)', color: '#ffffff'
                            } : {
                                backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--ui-text-secondary)'
                            }}
                        >
                            All
                        </button>
                        {categories.map((category) => {
                            const IconComponent = CATEGORY_ICONS[category];
                            return (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                                    style={selectedCategory === category ? {
                                        backgroundColor: 'var(--ui-accent-primary)', color: '#ffffff'
                                    } : {
                                        backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--ui-text-secondary)'
                                    }}
                                >
                                    {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                                    <span>{category}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Widget List */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
                {filteredWidgets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                        <MdWidgets className="w-12 h-12 mb-3 opacity-40" style={{ color: 'var(--ui-text-tertiary)' }} />
                        <p className="font-medium" style={{ color: 'var(--ui-text-secondary)' }}>No widgets found</p>
                    </div>
                ) : (
                    <div className="space-y-2 pb-8">
                        {filteredWidgets.map((widget) => {
                            const isEnabled = enabledSet.has(widget.id);
                            const TypeIcon = getWidgetTypeIcon(widget.id);

                            return (
                                <button
                                    key={widget.id}
                                    onClick={() => onToggleWidget(widget.id)}
                                    className="w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left active:scale-[0.98]"
                                    style={isEnabled ? {
                                        backgroundColor: 'var(--ui-accent-primary-bg)',
                                        borderColor: 'var(--ui-accent-primary-border)'
                                    } : {
                                        backgroundColor: 'var(--ui-bg-secondary)',
                                        borderColor: 'var(--ui-border-primary)'
                                    }}
                                >
                                    <div
                                        className="flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center mt-0.5 transition-all"
                                        style={isEnabled ? {
                                            backgroundColor: 'var(--ui-accent-primary)',
                                            borderColor: 'var(--ui-accent-primary)'
                                        } : {
                                            borderColor: 'var(--ui-border-secondary)'
                                        }}
                                    >
                                        {isEnabled && <MdCheck className="w-4 h-4 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3
                                            className="font-semibold truncate"
                                            style={{ color: isEnabled ? 'var(--ui-accent-primary)' : 'var(--ui-text-primary)' }}
                                        >
                                            {widget.title}
                                        </h3>
                                        <p className="text-sm line-clamp-2" style={{ color: 'var(--ui-text-muted)' }}>
                                            {widget.description}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t p-4 safe-bottom" style={{ borderColor: 'var(--ui-border-primary)' }}>
                <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl font-semibold transition-all"
                    style={{ backgroundColor: 'var(--ui-accent-primary)', color: '#ffffff' }}
                >
                    Done
                </button>
            </div>
        </motion.div>
    );
};

// ============================================
// Preset Name Dialog
// ============================================

interface PresetNameDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    initialName?: string;
    title?: string;
}

const PresetNameDialog = ({ isOpen, onClose, onSave, initialName = "", title = "Save Preset" }: PresetNameDialogProps) => {
    const [name, setName] = useState(initialName);

    useEffect(() => {
        setName(initialName);
    }, [initialName, isOpen]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm rounded-2xl p-6"
                style={{ backgroundColor: 'var(--ui-bg-primary)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ui-text-primary)' }}>{title}</h3>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Preset name..."
                    autoFocus
                    className="w-full px-4 py-3 rounded-lg border text-sm mb-4"
                    style={{
                        backgroundColor: 'var(--ui-bg-secondary)',
                        borderColor: 'var(--ui-border-primary)',
                        color: 'var(--ui-text-primary)'
                    }}
                />
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-lg font-medium"
                        style={{ backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--ui-text-secondary)' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            if (name.trim()) {
                                onSave(name.trim());
                                onClose();
                            }
                        }}
                        disabled={!name.trim()}
                        className="flex-1 py-3 rounded-lg font-medium disabled:opacity-50"
                        style={{ backgroundColor: 'var(--ui-accent-primary)', color: '#ffffff' }}
                    >
                        Save
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ============================================
// Main Component
// ============================================

export default function MobileDashboard({ onSettingsClick }: MobileDashboardProps) {
    const { hasAccess } = useWidgetPermissions();
    const { settings: privacySettings, toggle: togglePrivacy } = usePrivacy();

    // Presets state
    const [presetsState, setPresetsState] = useState<MobilePresetsState>(() => readMobilePresets());
    const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
    const [widgetPickerOpen, setWidgetPickerOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [presetNameDialogOpen, setPresetNameDialogOpen] = useState(false);
    const [pendingPresetSlot, setPendingPresetSlot] = useState<number | null>(null);

    // Subscribe to remote changes
    useEffect(() => {
        const unsubscribe = subscribeMobilePresets((newState) => {
            setPresetsState(newState);
        });
        return unsubscribe;
    }, []);

    // Get current preset
    const activePreset = presetsState.presets[presetsState.activePresetIndex];
    const enabledWidgetIds = useMemo(() => {
        if (!activePreset) return [];
        return activePreset.widgetIds.filter(id => hasAccess(id, 'view'));
    }, [activePreset, hasAccess]);

    // Handlers
    const handlePresetChange = useCallback((index: number) => {
        if (presetsState.presets[index] === null) return;
        setPresetsState(prev => {
            const newState = { ...prev, activePresetIndex: index };
            saveMobilePresets(newState);
            return newState;
        });
    }, []);

    const handleSwipePreset = useCallback((direction: 'left' | 'right') => {
        const nonNullPresets = presetsState.presets
            .map((p, i) => ({ preset: p, index: i }))
            .filter(({ preset }) => preset !== null);

        if (nonNullPresets.length <= 1) return;

        const currentIndexInList = nonNullPresets.findIndex(({ index }) => index === presetsState.activePresetIndex);
        let newIndexInList = direction === 'left'
            ? (currentIndexInList - 1 + nonNullPresets.length) % nonNullPresets.length
            : (currentIndexInList + 1) % nonNullPresets.length;

        handlePresetChange(nonNullPresets[newIndexInList].index);
        try { navigator.vibrate?.(20); } catch { }
    }, [presetsState, handlePresetChange]);

    const handleWidgetClick = useCallback((widgetId: string) => {
        if (!isEditing) setSelectedWidgetId(widgetId);
    }, [isEditing]);

    const handleToggleWidget = useCallback((widgetId: string) => {
        setPresetsState(prev => {
            const newState = toggleWidgetInActivePreset(prev, widgetId);
            saveMobilePresets(newState);
            return newState;
        });
    }, []);

    const handleRemoveWidget = useCallback((widgetId: string) => {
        const widgetDef = getWidgetById(widgetId);
        const config = getWidgetConfig(widgetId);
        const widgetName = widgetDef?.title || config?.title || widgetId;

        setPresetsState(prev => {
            const newState = toggleWidgetInActivePreset(prev, widgetId);
            saveMobilePresets(newState);
            return newState;
        });
        toast.success(`Removed "${widgetName}"`);
    }, []);

    const handleReorder = useCallback((newOrder: string[]) => {
        setPresetsState(prev => {
            const newState = updateActivePresetWidgets(prev, newOrder);
            saveMobilePresets(newState);
            return newState;
        });
    }, []);

    const handleRefresh = useCallback(async () => {
        // Trigger a page refresh or data reload
        await new Promise(resolve => setTimeout(resolve, 500));
        window.dispatchEvent(new CustomEvent('refresh-widgets'));
    }, []);

    const handleAddPreset = useCallback(() => {
        const emptySlot = findNextEmptySlot(presetsState);
        if (emptySlot === -1) {
            toast.error("All preset slots are full");
            return;
        }
        setPendingPresetSlot(emptySlot);
        setPresetNameDialogOpen(true);
    }, [presetsState]);

    const handleSaveNewPreset = useCallback((name: string) => {
        if (pendingPresetSlot === null) return;

        setPresetsState(prev => {
            const newState = savePreset(prev, pendingPresetSlot, name, []);
            const withActiveChange = { ...newState, activePresetIndex: pendingPresetSlot };
            saveMobilePresets(withActiveChange);
            return withActiveChange;
        });
        toast.success(`Created "${name}"`);
        setPendingPresetSlot(null);
    }, [pendingPresetSlot]);

    const handleUseStarter = useCallback(() => {
        const starterPresets = getStarterPresets();
        setPresetsState(starterPresets);
        saveMobilePresets(starterPresets);
        toast.success("Loaded starter presets!");
    }, []);

    // Swipe handling for preset navigation
    const swipeControls = useAnimation();
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDragEnd = async (_: any, info: PanInfo) => {
        const threshold = 50;
        const velocity = 300;
        const containerWidth = containerRef.current?.offsetWidth || 300;

        if (Math.abs(info.offset.x) > threshold || Math.abs(info.velocity.x) > velocity) {
            const direction = info.offset.x > 0 ? 'left' : 'right';
            setSwipeDirection(direction);

            // Animate off-screen
            await swipeControls.start({
                x: direction === 'left' ? containerWidth : -containerWidth,
                opacity: 0,
                transition: { duration: 0.15, ease: 'easeOut' }
            });

            // Change preset
            handleSwipePreset(direction);

            // Reset position instantly on opposite side then animate in
            swipeControls.set({ x: direction === 'left' ? -containerWidth : containerWidth });
            await swipeControls.start({
                x: 0,
                opacity: 1,
                transition: { duration: 0.2, ease: 'easeOut' }
            });

            setSwipeDirection(null);
        } else {
            // Snap back
            swipeControls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
        }
    };

    // Empty state - no presets at all
    if (presetsState.presets.every(p => p === null)) {
        return (
            <div className="mobile-dashboard-empty">
                <div className="mobile-empty-state">
                    <MdBookmarks className="w-16 h-16 text-ui-text-tertiary opacity-40 mb-4" />
                    <h2 className="text-xl font-medium text-ui-text-secondary mb-2">Welcome to OlyDash</h2>
                    <p className="text-sm text-ui-text-tertiary mb-6 text-center px-4">
                        Create presets to organize your widgets into different views
                    </p>
                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        <button
                            onClick={handleUseStarter}
                            className="mobile-nav-button justify-center"
                            style={{ backgroundColor: 'var(--ui-accent-primary)', color: '#ffffff' }}
                        >
                            <MdBookmarks className="w-5 h-5" />
                            <span>Use Starter Presets</span>
                        </button>
                        <button
                            onClick={handleAddPreset}
                            className="mobile-nav-button justify-center"
                            style={{ backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--ui-text-secondary)' }}
                        >
                            <MdAdd className="w-5 h-5" />
                            <span>Create Empty Preset</span>
                        </button>
                    </div>
                </div>

                <PresetNameDialog
                    isOpen={presetNameDialogOpen}
                    onClose={() => { setPresetNameDialogOpen(false); setPendingPresetSlot(null); }}
                    onSave={handleSaveNewPreset}
                    title="New Preset"
                />
            </div>
        );
    }

    // Empty preset state
    if (!activePreset || enabledWidgetIds.length === 0) {
        return (
            <>
                <div className="mobile-dashboard-grid">
                    {/* Header */}
                    <div className="mobile-grid-header">
                        <div className="flex items-center gap-3">
                            <MdBookmarks className="w-5 h-5" style={{ color: 'var(--ui-accent-primary)' }} />
                            <div>
                                <h1 className="text-lg font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                                    {activePreset?.name || "No Preset"}
                                </h1>
                                <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>No widgets</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={onSettingsClick} className="mobile-header-button" aria-label="Settings">
                                <MdSettings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Preset Tabs */}
                    <PresetTabs presets={presetsState} onPresetChange={handlePresetChange} onAddPreset={handleAddPreset} />

                    {/* Empty content */}
                    <div className="flex-1 flex items-center justify-center p-4">
                        <div className="text-center">
                            <MdWidgets className="w-16 h-16 text-ui-text-tertiary opacity-40 mb-4 mx-auto" />
                            <h2 className="text-lg font-medium text-ui-text-secondary mb-2">
                                {activePreset ? "No widgets yet" : "Select a preset"}
                            </h2>
                            <p className="text-sm text-ui-text-tertiary mb-6">
                                {activePreset ? "Add widgets to this preset" : "Choose a preset or create a new one"}
                            </p>
                            {activePreset && (
                                <button
                                    onClick={() => setWidgetPickerOpen(true)}
                                    className="px-6 py-3 rounded-xl font-medium"
                                    style={{ backgroundColor: 'var(--ui-accent-primary)', color: '#ffffff' }}
                                >
                                    <MdAdd className="w-5 h-5 inline mr-2" />
                                    Add Widgets
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Widget Picker */}
                <AnimatePresence>
                    {widgetPickerOpen && (
                        <MobileWidgetPicker
                            enabledWidgetIds={enabledWidgetIds}
                            onToggleWidget={handleToggleWidget}
                            onClose={() => setWidgetPickerOpen(false)}
                        />
                    )}
                </AnimatePresence>

                <PresetNameDialog
                    isOpen={presetNameDialogOpen}
                    onClose={() => { setPresetNameDialogOpen(false); setPendingPresetSlot(null); }}
                    onSave={handleSaveNewPreset}
                    title="New Preset"
                />
            </>
        );
    }

    return (
        <div className="mobile-dashboard-grid">
            {/* Header */}
            <div className="mobile-grid-header">
                <div className="flex items-center gap-3">
                    <MdBookmarks className="w-5 h-5" style={{ color: 'var(--ui-accent-primary)' }} />
                    <div>
                        <h1 className="text-lg font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                            {activePreset.name}
                        </h1>
                        <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                            {enabledWidgetIds.length} widget{enabledWidgetIds.length !== 1 ? 's' : ''}
                            {isEditing && ' • Editing'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Privacy Toggle */}
                    <button
                        onClick={togglePrivacy}
                        className={`mobile-header-button ${privacySettings.enabled ? 'bg-ui-accent-secondary text-white' : ''}`}
                        aria-label={privacySettings.enabled ? "Disable privacy mode" : "Enable privacy mode"}
                    >
                        {privacySettings.enabled ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
                    </button>
                    {/* Edit Toggle */}
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`mobile-header-button ${isEditing ? 'bg-ui-accent-primary text-white' : ''}`}
                        aria-label={isEditing ? "Done editing" : "Edit layout"}
                    >
                        {isEditing ? <MdCheck className="w-5 h-5" /> : <MdEdit className="w-5 h-5" />}
                    </button>
                    {/* Settings */}
                    <button onClick={onSettingsClick} className="mobile-header-button" aria-label="Settings">
                        <MdSettings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Preset Tabs */}
            <PresetTabs presets={presetsState} onPresetChange={handlePresetChange} onAddPreset={handleAddPreset} />

            {/* Main Content with swipe and pull-to-refresh */}
            <motion.div
                ref={containerRef}
                className="flex-1 overflow-hidden"
                drag={isEditing ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.5}
                onDragEnd={handleDragEnd}
                animate={swipeControls}
                style={{ x: 0 }}
            >
                <PullToRefresh onRefresh={handleRefresh}>
                    <div className="mobile-grid-content">
                        <DraggableWidgetGrid
                            widgetIds={enabledWidgetIds}
                            onReorder={handleReorder}
                            onWidgetClick={handleWidgetClick}
                            onRemoveWidget={handleRemoveWidget}
                            isEditing={isEditing}
                        />

                        {/* Add Widget Button (when editing) */}
                        {isEditing && (
                            <button
                                onClick={() => setWidgetPickerOpen(true)}
                                className="w-full mt-4 p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors"
                                style={{ borderColor: 'var(--ui-border-secondary)', color: 'var(--ui-text-muted)' }}
                            >
                                <MdAdd className="w-5 h-5" />
                                <span className="font-medium">Add Widget</span>
                            </button>
                        )}
                    </div>
                </PullToRefresh>
            </motion.div>

            {/* Swipe hint indicator */}
            {!isEditing && presetsState.presets.filter(p => p !== null).length > 1 && (
                <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ui-bg-tertiary/80 backdrop-blur-sm">
                        <MdChevronLeft className="w-4 h-4 text-ui-text-muted" />
                        <span className="text-xs text-ui-text-muted">Swipe for presets</span>
                        <MdChevronRight className="w-4 h-4 text-ui-text-muted" />
                    </div>
                </div>
            )}

            {/* Detail View Modal */}
            <AnimatePresence>
                {selectedWidgetId && (
                    <DetailView widgetId={selectedWidgetId} onClose={() => setSelectedWidgetId(null)} />
                )}
            </AnimatePresence>

            {/* Widget Picker */}
            <AnimatePresence>
                {widgetPickerOpen && (
                    <MobileWidgetPicker
                        enabledWidgetIds={enabledWidgetIds}
                        onToggleWidget={handleToggleWidget}
                        onClose={() => setWidgetPickerOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Preset Name Dialog */}
            <PresetNameDialog
                isOpen={presetNameDialogOpen}
                onClose={() => { setPresetNameDialogOpen(false); setPendingPresetSlot(null); }}
                onSave={handleSaveNewPreset}
                title="New Preset"
            />
        </div>
    );
}
