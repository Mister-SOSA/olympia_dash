"use client";

import React, { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { getWidgetById } from "@/constants/widgets";
import {
    WIDGET_CONFIGS,
    WidgetCategory,
    getWidgetConfig,
    getAvailableCategories,
    searchWidgets,
    WidgetConfig,
} from "@/components/widgets/registry";
// Use Material Design icons for consistency with desktop
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
} from "react-icons/md";
import { useWidgetPermissions } from "@/hooks/useWidgetPermissions";
import { Loader } from "@/components/ui/loader";
import { toast } from "sonner";
import {
    MobileLayout,
    readMobileLayout,
    saveMobileLayout,
    subscribeMobileLayout,
    toggleWidget as toggleWidgetInLayout,
    getStarterMobileLayout,
} from "@/utils/mobileLayoutUtils";
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
    rectIntersection,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    useSortable,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ============================================
// Category Icons (Material Design)
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

// Widget type icons based on common patterns
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
    return MdBarChart; // Default
};

// ============================================
// Types
// ============================================

export interface MobileDashboardProps {
    onSettingsClick: () => void;
}

// ============================================
// Sortable Widget Card (dnd-kit)
// ============================================

interface SortableWidgetCardProps {
    widgetId: string;
    onClick: () => void;
}

const SortableWidgetCard = ({ widgetId, onClick }: SortableWidgetCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: widgetId });

    const config = getWidgetConfig(widgetId);
    const widgetDef = getWidgetById(widgetId);
    const CategoryIcon = config ? CATEGORY_ICONS[config.category] : MdBarChart;
    const TypeIcon = getWidgetTypeIcon(widgetId);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // When dragging, show the drop placeholder (matches desktop style)
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
            className="mobile-widget-card group"
            onClick={onClick}
            {...attributes}
            {...listeners}
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
                        <span
                            className="text-xs"
                            style={{ color: 'var(--ui-text-muted)' }}
                        >
                            {config.category}
                        </span>
                    </div>
                )}
            </div>

            {/* Tap indicator */}
            <div
                className="absolute bottom-2 right-2 opacity-0 group-active:opacity-100 transition-opacity"
                style={{ color: 'var(--ui-text-muted)' }}
            >
                <MdExpandMore className="w-4 h-4 rotate-[-90deg]" />
            </div>
        </div>
    );
};

// ============================================
// Drag Overlay Card (ghost that follows finger)
// ============================================

interface DragOverlayCardProps {
    widgetId: string;
}

const DragOverlayCard = ({ widgetId }: DragOverlayCardProps) => {
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
                        <span
                            className="text-xs"
                            style={{ color: 'var(--ui-text-muted)' }}
                        >
                            {config.category}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// Draggable Widget Grid (dnd-kit)
// ============================================

interface DraggableGridProps {
    widgetIds: string[];
    onReorder: (newOrder: string[]) => void;
    onWidgetClick: (widgetId: string) => void;
    onRemoveWidget: (widgetId: string) => void;
}

// Trash Drop Zone Component - always rendered for stable collision detection
interface TrashDropZoneProps {
    isOver: boolean;
    isVisible: boolean;
}

const TrashDropZone = ({ isOver, isVisible }: TrashDropZoneProps) => {
    const { setNodeRef, isOver: dndIsOver } = useDroppable({
        id: 'trash-zone',
    });

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
                className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium shadow-lg transition-all duration-200 ${showActive ? 'scale-110' : 'scale-100'
                    }`}
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

// Custom collision detection that prioritizes the trash zone
const customCollisionDetection: CollisionDetection = (args) => {
    // First check if we're over the trash zone using pointer position
    const pointerCollisions = pointerWithin(args);
    const trashCollision = pointerCollisions.find(c => c.id === 'trash-zone');
    if (trashCollision) {
        return [trashCollision];
    }

    // Otherwise use standard closest center for sortable items
    return closestCenter(args);
};

const DraggableWidgetGrid = ({ widgetIds, onReorder, onWidgetClick, onRemoveWidget }: DraggableGridProps) => {
    const [items, setItems] = useState(widgetIds);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isOverTrash, setIsOverTrash] = useState(false);

    // Configure touch sensor with delay for long press
    const sensors = useSensors(
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 300,
                tolerance: 8,
            },
        })
    );

    // Sync with parent
    useEffect(() => {
        setItems(widgetIds);
    }, [widgetIds]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        // Haptic feedback
        try {
            navigator.vibrate?.(50);
        } catch { }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        setIsOverTrash(over?.id === 'trash-zone');
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setIsOverTrash(false);

        // Check if dropped on trash zone
        if (over?.id === 'trash-zone') {
            onRemoveWidget(active.id as string);
            return;
        }

        if (over && active.id !== over.id) {
            setItems((currentItems) => {
                const oldIndex = currentItems.indexOf(active.id as string);
                const newIndex = currentItems.indexOf(over.id as string);
                const newItems = arrayMove(currentItems, oldIndex, newIndex);
                // Save the new order
                onReorder(newItems);
                return newItems;
            });
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
        setIsOverTrash(false);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            {/* Trash drop zone - always rendered inside DndContext for stable collision detection */}
            <TrashDropZone isOver={isOverTrash} isVisible={!!activeId} />

            <SortableContext items={items} strategy={rectSortingStrategy}>
                <div className="mobile-widget-grid">
                    {items.map((widgetId) => (
                        <SortableWidgetCard
                            key={widgetId}
                            widgetId={widgetId}
                            onClick={() => !activeId && onWidgetClick(widgetId)}
                        />
                    ))}
                </div>
            </SortableContext>

            {/* Drag overlay - the card that follows your finger */}
            <DragOverlay>
                {activeId ? <DragOverlayCard widgetId={activeId} /> : null}
            </DragOverlay>
        </DndContext>
    );
};

// ============================================
// Detail View Component (Full Screen Widget)
// ============================================

interface DetailViewProps {
    widgetId: string;
    onClose: () => void;
}

const DetailView = ({ widgetId, onClose }: DetailViewProps) => {
    const widgetDef = getWidgetById(widgetId);
    const config = getWidgetConfig(widgetId);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Check if widget has settings
    const hasSettings = getWidgetSettingsSchema(widgetId) !== null;

    const handleDragEnd = (_: any, info: PanInfo) => {
        // Close if dragged down more than 100px or with high velocity
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
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{
                        type: "spring",
                        damping: 30,
                        stiffness: 300,
                        mass: 0.8
                    }}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0.1, bottom: 0.3 }}
                    onDragEnd={handleDragEnd}
                    className="absolute inset-x-0 bottom-0 top-[env(safe-area-inset-top)] flex flex-col overflow-hidden"
                    style={{
                        backgroundColor: 'var(--ui-bg-primary)',
                        borderTopLeftRadius: '1.5rem',
                        borderTopRightRadius: '1.5rem',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Drag Handle */}
                    <div className="flex justify-center py-3 flex-shrink-0">
                        <div
                            className="w-10 h-1 rounded-full"
                            style={{ backgroundColor: 'var(--ui-border-secondary)' }}
                        />
                    </div>

                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-4 pb-3 border-b flex-shrink-0"
                        style={{ borderColor: 'var(--ui-border-primary)' }}
                    >
                        <div className="flex-1 min-w-0">
                            <h2
                                className="text-lg font-semibold truncate"
                                style={{ color: 'var(--ui-text-primary)' }}
                            >
                                {widgetDef?.title || config?.title || widgetId}
                            </h2>
                            {config?.category && (
                                <span
                                    className="text-xs"
                                    style={{ color: 'var(--ui-text-muted)' }}
                                >
                                    {config.category}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            {/* Widget Settings Button */}
                            {hasSettings && (
                                <button
                                    onClick={() => setSettingsOpen(true)}
                                    className="p-2 rounded-full transition-colors"
                                    style={{
                                        backgroundColor: 'var(--ui-bg-tertiary)',
                                        color: 'var(--ui-text-secondary)'
                                    }}
                                    aria-label="Widget Settings"
                                >
                                    <MdTune className="w-5 h-5" />
                                </button>
                            )}
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full transition-colors"
                                style={{
                                    backgroundColor: 'var(--ui-bg-tertiary)',
                                    color: 'var(--ui-text-secondary)'
                                }}
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Widget Content */}
                    <div
                        className="flex-1 overflow-auto p-4"
                        style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
                    >
                        {widgetDef && (
                            <Suspense
                                fallback={
                                    <div className="flex items-center justify-center h-64">
                                        <Loader />
                                    </div>
                                }
                            >
                                <div className="h-full min-h-[300px]">
                                    <widgetDef.component />
                                </div>
                            </Suspense>
                        )}
                    </div>

                    {/* Swipe hint */}
                    <motion.div
                        className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none"
                        style={{
                            marginBottom: 'env(safe-area-inset-bottom)'
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 0.8, y: 0 }}
                        transition={{ delay: 1 }}
                    >
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                            style={{
                                backgroundColor: 'var(--ui-bg-tertiary)',
                                color: 'var(--ui-text-muted)',
                            }}
                        >
                            <MdExpandMore className="w-4 h-4" />
                            <span className="text-xs font-medium">Swipe down to close</span>
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* Widget Settings Dialog */}
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
// Mobile Widget Picker (Simple, no presets)
// ============================================

interface MobileWidgetPickerProps {
    layout: MobileLayout;
    onToggleWidget: (widgetId: string) => void;
    onClose: () => void;
}

const MobileWidgetPicker = ({ layout, onToggleWidget, onClose }: MobileWidgetPickerProps) => {
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
    const enabledSet = useMemo(() => new Set(layout.enabledWidgetIds), [layout.enabledWidgetIds]);

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ backgroundColor: 'var(--ui-bg-primary)' }}
        >
            {/* Header */}
            <div
                className="flex-shrink-0 border-b safe-top"
                style={{ borderColor: 'var(--ui-border-primary)' }}
            >
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <MdWidgets className="w-5 h-5" style={{ color: 'var(--ui-accent-primary)' }} />
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                                Edit Widgets
                            </h2>
                            <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                                {enabledSet.size} of {accessibleWidgets.length} enabled
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg"
                        style={{ color: 'var(--ui-text-secondary)' }}
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <MdSearch
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
                                backgroundColor: 'var(--ui-accent-primary)',
                                color: '#ffffff'
                            } : {
                                backgroundColor: 'var(--ui-bg-tertiary)',
                                color: 'var(--ui-text-secondary)'
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
                                        backgroundColor: 'var(--ui-accent-primary)',
                                        color: '#ffffff'
                                    } : {
                                        backgroundColor: 'var(--ui-bg-tertiary)',
                                        color: 'var(--ui-text-secondary)'
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
                        <MdWidgets
                            className="w-12 h-12 mb-3 opacity-40"
                            style={{ color: 'var(--ui-text-tertiary)' }}
                        />
                        <p className="font-medium" style={{ color: 'var(--ui-text-secondary)' }}>
                            No widgets found
                        </p>
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
                                        {isEnabled && <MdCheck className="w-4 h-4 text-white" />}
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
                                        </div>
                                        <p
                                            className="text-sm line-clamp-2"
                                            style={{ color: 'var(--ui-text-muted)' }}
                                        >
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
            <div
                className="flex-shrink-0 border-t p-4 safe-bottom"
                style={{ borderColor: 'var(--ui-border-primary)' }}
            >
                <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl font-semibold transition-all"
                    style={{
                        backgroundColor: 'var(--ui-accent-primary)',
                        color: '#ffffff'
                    }}
                >
                    Done
                </button>
            </div>
        </motion.div>
    );
};

// ============================================
// Main Component
// ============================================

export default function MobileDashboard({
    onSettingsClick,
}: MobileDashboardProps) {
    const { hasAccess } = useWidgetPermissions();
    const [mobileLayout, setMobileLayout] = useState<MobileLayout>(() => readMobileLayout());
    const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
    const [widgetPickerOpen, setWidgetPickerOpen] = useState(false);

    // Subscribe to remote layout changes
    useEffect(() => {
        const unsubscribe = subscribeMobileLayout((newLayout) => {
            setMobileLayout(newLayout);
        });
        return unsubscribe;
    }, []);

    // Filter enabled widgets that user has access to
    const enabledWidgetIds = useMemo(() => {
        return mobileLayout.enabledWidgetIds.filter(id => hasAccess(id, 'view'));
    }, [mobileLayout.enabledWidgetIds, hasAccess]);

    const handleWidgetClick = useCallback((widgetId: string) => {
        setSelectedWidgetId(widgetId);
    }, []);

    const handleCloseDetail = useCallback(() => {
        setSelectedWidgetId(null);
    }, []);

    const handleToggleWidget = useCallback((widgetId: string) => {
        setMobileLayout(prev => {
            const newLayout = toggleWidgetInLayout(prev, widgetId);
            saveMobileLayout(newLayout);
            return newLayout;
        });
    }, []);

    const handleRemoveWidget = useCallback((widgetId: string) => {
        const widgetDef = getWidgetById(widgetId);
        const config = getWidgetConfig(widgetId);
        const widgetName = widgetDef?.title || config?.title || widgetId;

        setMobileLayout(prev => {
            const newLayout = toggleWidgetInLayout(prev, widgetId);
            saveMobileLayout(newLayout);
            return newLayout;
        });
        toast.success(`Removed "${widgetName}"`);
    }, []);

    const handleAddStarterWidgets = useCallback(() => {
        const starter = getStarterMobileLayout();
        setMobileLayout(starter);
        saveMobileLayout(starter);
        toast.success("Added starter widgets!");
    }, []);

    const handleReorder = useCallback((newOrder: string[]) => {
        setMobileLayout(prev => {
            const newLayout = {
                ...prev,
                enabledWidgetIds: newOrder,
                updatedAt: new Date().toISOString(),
            };
            saveMobileLayout(newLayout);
            return newLayout;
        });
    }, []);

    // Empty state
    if (enabledWidgetIds.length === 0) {
        return (
            <>
                <div className="mobile-dashboard-empty">
                    <div className="mobile-empty-state">
                        <MdWidgets className="w-16 h-16 text-ui-text-tertiary opacity-40 mb-4" />
                        <h2 className="text-xl font-medium text-ui-text-secondary mb-2">
                            No widgets enabled
                        </h2>
                        <p className="text-sm text-ui-text-tertiary mb-6">
                            Add widgets to your mobile dashboard
                        </p>
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <button
                                onClick={() => setWidgetPickerOpen(true)}
                                className="mobile-nav-button justify-center"
                                style={{
                                    backgroundColor: 'var(--ui-accent-primary)',
                                    color: '#ffffff'
                                }}
                            >
                                <MdAdd className="w-5 h-5" />
                                <span>Choose Widgets</span>
                            </button>
                            <button
                                onClick={handleAddStarterWidgets}
                                className="mobile-nav-button justify-center"
                                style={{
                                    backgroundColor: 'var(--ui-bg-tertiary)',
                                    color: 'var(--ui-text-secondary)'
                                }}
                            >
                                <MdWidgets className="w-5 h-5" />
                                <span>Use Starter Layout</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Widget Picker */}
                <AnimatePresence>
                    {widgetPickerOpen && (
                        <MobileWidgetPicker
                            layout={mobileLayout}
                            onToggleWidget={handleToggleWidget}
                            onClose={() => setWidgetPickerOpen(false)}
                        />
                    )}
                </AnimatePresence>
            </>
        );
    }

    return (
        <div className="mobile-dashboard-grid">
            {/* Header */}
            <div className="mobile-grid-header">
                <div className="flex items-center gap-3">
                    <MdWidgets className="w-5 h-5" style={{ color: 'var(--ui-accent-primary)' }} />
                    <div>
                        <h1
                            className="text-lg font-semibold"
                            style={{ color: 'var(--ui-text-primary)' }}
                        >
                            Dashboard
                        </h1>
                        <p
                            className="text-xs"
                            style={{ color: 'var(--ui-text-muted)' }}
                        >
                            {enabledWidgetIds.length} widget{enabledWidgetIds.length !== 1 ? 's' : ''} • Hold to reorder
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Widget Picker Button */}
                    <button
                        onClick={() => setWidgetPickerOpen(true)}
                        className="mobile-header-button"
                        aria-label="Edit Widgets"
                    >
                        <MdWidgets className="w-5 h-5" />
                    </button>
                    {/* Settings Button */}
                    <button
                        onClick={onSettingsClick}
                        className="mobile-header-button"
                        aria-label="Settings"
                    >
                        <MdSettings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Widget Grid with Hold-and-Drag */}
            <div className="mobile-grid-content">
                <DraggableWidgetGrid
                    widgetIds={enabledWidgetIds}
                    onReorder={handleReorder}
                    onWidgetClick={handleWidgetClick}
                    onRemoveWidget={handleRemoveWidget}
                />
            </div>

            {/* Detail View Modal */}
            <AnimatePresence>
                {selectedWidgetId && (
                    <DetailView
                        widgetId={selectedWidgetId}
                        onClose={handleCloseDetail}
                    />
                )}
            </AnimatePresence>

            {/* Widget Picker */}
            <AnimatePresence>
                {widgetPickerOpen && (
                    <MobileWidgetPicker
                        layout={mobileLayout}
                        onToggleWidget={handleToggleWidget}
                        onClose={() => setWidgetPickerOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
