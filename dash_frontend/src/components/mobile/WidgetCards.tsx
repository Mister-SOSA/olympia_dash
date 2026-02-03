"use client";

import React, { memo, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MdDelete, MdDragIndicator } from "react-icons/md";
import {
    DndContext,
    closestCenter,
    TouchSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    UniqueIdentifier,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    useSortable,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { getWidgetById } from "@/constants/widgets";
import { getWidgetConfig } from "@/components/widgets/registry";
import { useWidgetPreview } from "@/hooks/useWidgetPreview";
import { getWidgetTypeIcon, vibrate } from "./utils";
import { WIDGET_PREVIEWS, DefaultPreview, type ComplicationPreviewProps } from "./WidgetPreviews";

// ============================================
// Widget Complication Component
// ============================================

interface WidgetComplicationProps {
    widgetId: string;
    isVisible?: boolean;
    title: string;
    Icon: React.ComponentType<{ className?: string }>;
}

export const WidgetComplication = memo(function WidgetComplication({ widgetId, isVisible = true, title, Icon }: WidgetComplicationProps) {
    const { data, loading } = useWidgetPreview(widgetId);

    // Extract base widget type (e.g., "FanController:abc123" -> "FanController")
    const baseWidgetId = widgetId.includes(':') ? widgetId.split(':')[0] : widgetId;

    const isLoading = loading && isVisible;
    const showContent = !loading && isVisible && data?.value;

    // Get custom preview component or use default
    const PreviewComponent = WIDGET_PREVIEWS[baseWidgetId] || DefaultPreview;

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
                <div
                    className="p-1 rounded-md"
                    style={{ background: 'var(--ui-bg-tertiary)' }}
                >
                    <Icon className="w-3.5 h-3.5 text-[var(--ui-text-muted)]" />
                </div>
                <span
                    className="text-[10px] uppercase tracking-wider font-semibold truncate flex-1 text-[var(--ui-text-muted)]"
                >
                    {title}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 flex flex-col">
                {isLoading ? (
                    <div className="flex-1 flex flex-col justify-end gap-2 animate-pulse">
                        <div className="h-7 w-2/3 rounded" style={{ background: 'var(--ui-bg-tertiary)' }} />
                        <div className="h-3 w-1/3 rounded" style={{ background: 'var(--ui-bg-tertiary)', opacity: 0.5 }} />
                    </div>
                ) : showContent ? (
                    <PreviewComponent data={data} />
                ) : (
                    <div className="flex-1 flex items-end">
                        <span className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>--</span>
                    </div>
                )}
            </div>
        </div>
    );
});

// ============================================
// Sortable Widget Card - using dnd-kit
// ============================================

interface SortableWidgetCardProps {
    widgetId: string;
    onTap: () => void;
    isVisible?: boolean;
}

export const SortableWidgetCard = memo(function SortableWidgetCard({
    widgetId,
    onTap,
    isVisible = true,
}: SortableWidgetCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: widgetId });

    const { title, TypeIcon } = useMemo(() => {
        const cfg = getWidgetConfig(widgetId);
        const def = getWidgetById(widgetId);
        return {
            title: def?.title || cfg?.title || widgetId,
            TypeIcon: getWidgetTypeIcon(widgetId),
        };
    }, [widgetId]);

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 'auto',
        opacity: isDragging ? 0.3 : 1,
        touchAction: 'none',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="mobile-widget-card group select-none cursor-pointer active:scale-[0.98] transition-all"
            onClick={() => !isDragging && onTap()}
            {...attributes}
            {...listeners}
        >
            <WidgetComplication
                widgetId={widgetId}
                isVisible={isVisible && !isDragging}
                title={title}
                Icon={TypeIcon}
            />
        </div>
    );
});

// ============================================
// Static Widget Card (for non-active presets)
// ============================================

interface StaticWidgetCardProps {
    widgetId: string;
    isVisible?: boolean;
}

export const StaticWidgetCard = memo(function StaticWidgetCard({ widgetId, isVisible = true }: StaticWidgetCardProps) {
    const { title, TypeIcon } = useMemo(() => {
        const config = getWidgetConfig(widgetId);
        const def = getWidgetById(widgetId);
        return {
            title: def?.title || config?.title || widgetId,
            TypeIcon: getWidgetTypeIcon(widgetId),
        };
    }, [widgetId]);

    return (
        <motion.div
            className="mobile-widget-card"
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
            <WidgetComplication
                widgetId={widgetId}
                isVisible={isVisible}
                title={title}
                Icon={TypeIcon}
            />
        </motion.div>
    );
});

// ============================================
// Drag Overlay Item
// ============================================

interface DragOverlayItemProps {
    widgetId: string;
}

const DragOverlayItem = memo(function DragOverlayItem({ widgetId }: DragOverlayItemProps) {
    const { title, TypeIcon } = useMemo(() => {
        const cfg = getWidgetConfig(widgetId);
        const def = getWidgetById(widgetId);
        return {
            title: def?.title || cfg?.title || widgetId,
            TypeIcon: getWidgetTypeIcon(widgetId),
        };
    }, [widgetId]);

    return (
        <div className="mobile-widget-card mobile-widget-card-dragging">
            <div className="mobile-widget-card-drag-indicator">
                <MdDragIndicator className="w-4 h-4" />
            </div>
            <WidgetComplication
                widgetId={widgetId}
                isVisible={true}
                title={title}
                Icon={TypeIcon}
            />
        </div>
    );
});

// ============================================
// Trash Drop Zone - Enhanced Visual Feedback
// ============================================

interface TrashDropZoneProps {
    isVisible: boolean;
    isOver: boolean;
}

const TrashDropZone = memo(function TrashDropZone({ isVisible, isOver }: TrashDropZoneProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="mobile-trash-zone"
                    initial={{ opacity: 0, y: 80, scale: 0.9 }}
                    animate={{
                        opacity: 1,
                        y: 0,
                        scale: isOver ? 1.08 : 1,
                    }}
                    exit={{ opacity: 0, y: 60, scale: 0.95 }}
                    transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                        mass: 0.8,
                    }}
                >
                    <motion.div
                        className={`mobile-trash-zone-content ${isOver ? 'active' : ''}`}
                        animate={{
                            backgroundColor: isOver ? 'rgb(239, 68, 68)' : 'rgba(239, 68, 68, 0.85)',
                            scale: isOver ? 1.02 : 1,
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                        <motion.div
                            animate={{
                                scale: isOver ? 1.3 : 1,
                                rotate: isOver ? [0, -15, 15, -10, 10, 0] : 0,
                                y: isOver ? -2 : 0,
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 600,
                                damping: 15,
                                rotate: { duration: 0.5, ease: "easeInOut" }
                            }}
                        >
                            <MdDelete className={`w-7 h-7 ${isOver ? 'text-white' : 'text-white/90'}`} />
                        </motion.div>
                        <motion.span
                            className="text-white text-sm font-semibold"
                            animate={{
                                scale: isOver ? 1.05 : 1,
                                y: isOver ? 1 : 0,
                            }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        >
                            {isOver ? 'Release to Remove' : 'Drag Here to Remove'}
                        </motion.span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

// ============================================
// Sortable Widget Grid - Using dnd-kit
// ============================================

interface SortableWidgetGridProps {
    widgetIds: string[];
    onReorder: (newOrder: string[]) => void;
    onWidgetClick: (widgetId: string) => void;
    onRemoveWidget: (widgetId: string) => void;
    onDragStateChange: (isDragging: boolean) => void;
    isVisible?: boolean;
}

export const SortableWidgetGrid = memo(function SortableWidgetGrid({
    widgetIds,
    onReorder,
    onWidgetClick,
    onRemoveWidget,
    onDragStateChange,
    isVisible = true,
}: SortableWidgetGridProps) {
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [isOverTrash, setIsOverTrash] = useState(false);

    // Touch sensor with delay activation (long press to drag)
    // Pointer sensor for desktop/mouse with distance activation
    const sensors = useSensors(
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 8,
            },
        }),
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id);
        onDragStateChange(true);
        vibrate([20, 10, 20]);
    }, [onDragStateChange]);

    const handleDragMove = useCallback((event: { activatorEvent: Event; delta: { x: number; y: number } }) => {
        // Check if dragging over trash zone using the current pointer position
        const activatorEvent = event.activatorEvent as TouchEvent | MouseEvent;
        let clientY: number;

        if ('touches' in activatorEvent && activatorEvent.touches.length > 0) {
            clientY = activatorEvent.touches[0].clientY + event.delta.y;
        } else if ('clientY' in activatorEvent) {
            clientY = activatorEvent.clientY + event.delta.y;
        } else {
            return;
        }

        const viewportHeight = window.innerHeight;
        const trashZoneTop = viewportHeight - 120;
        const newIsOverTrash = clientY > trashZoneTop;

        if (newIsOverTrash !== isOverTrash) {
            setIsOverTrash(newIsOverTrash);
            vibrate(newIsOverTrash ? 30 : 15);
        }
    }, [isOverTrash]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        // If over trash, remove the widget
        if (isOverTrash && activeId) {
            vibrate([50, 30, 50]);
            onRemoveWidget(activeId as string);
        } else if (over && active.id !== over.id) {
            // Reorder
            const oldIndex = widgetIds.indexOf(active.id as string);
            const newIndex = widgetIds.indexOf(over.id as string);
            const newOrder = arrayMove(widgetIds, oldIndex, newIndex);
            onReorder(newOrder);
            vibrate(20);
        }

        setActiveId(null);
        setIsOverTrash(false);
        onDragStateChange(false);
    }, [activeId, isOverTrash, onDragStateChange, onRemoveWidget, onReorder, widgetIds]);

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
        setIsOverTrash(false);
        onDragStateChange(false);
    }, [onDragStateChange]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
                {/* Trash zone */}
                <TrashDropZone isVisible={!!activeId} isOver={isOverTrash} />

                {/* Widget grid */}
                <div className="mobile-widget-grid">
                    {widgetIds.map((widgetId) => (
                        <SortableWidgetCard
                            key={widgetId}
                            widgetId={widgetId}
                            onTap={() => onWidgetClick(widgetId)}
                            isVisible={isVisible}
                        />
                    ))}
                </div>

                {typeof document !== 'undefined' && createPortal(
                    <DragOverlay zIndex={1000}>
                        {activeId ? <DragOverlayItem widgetId={activeId as string} /> : null}
                    </DragOverlay>,
                    document.body
                )}
            </SortableContext>
        </DndContext>
    );
});
