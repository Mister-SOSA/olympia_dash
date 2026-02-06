"use client";

import React, { memo, useMemo, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MdDelete } from "react-icons/md";
import {
    DndContext,
    closestCenter,
    TouchSensor,
    MouseSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    UniqueIdentifier,
    DragOverlay,
    defaultDropAnimationSideEffects,
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
    isAnyDragging?: boolean;
}

export const SortableWidgetCard = memo(function SortableWidgetCard({
    widgetId,
    onTap,
    isVisible = true,
    isAnyDragging = false,
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
        touchAction: 'none',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`mobile-widget-card select-none ${isDragging ? 'mobile-widget-card-ghost' : ''}`}
            onClick={() => !isDragging && !isAnyDragging && onTap()}
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
        <motion.div
            className="mobile-widget-card mobile-widget-card-overlay"
            initial={{ scale: 1, boxShadow: "0 0 0 rgba(0,0,0,0)" }}
            animate={{
                scale: 1.04,
                boxShadow: "0 16px 48px rgba(0,0,0,0.18), 0 6px 16px rgba(0,0,0,0.1)",
            }}
            transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
            }}
        >
            <WidgetComplication
                widgetId={widgetId}
                isVisible={true}
                title={title}
                Icon={TypeIcon}
            />
        </motion.div>
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
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                        mass: 0.6,
                    }}
                >
                    <motion.div
                        className="mobile-trash-zone-content"
                        animate={{
                            backgroundColor: isOver
                                ? 'rgb(239, 68, 68)'
                                : 'rgba(120, 120, 128, 0.24)',
                            scale: isOver ? 1.06 : 1,
                            borderColor: isOver
                                ? 'rgba(239, 68, 68, 0.5)'
                                : 'rgba(120, 120, 128, 0.2)',
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                        }}
                    >
                        <motion.div
                            animate={{
                                scale: isOver ? 1.15 : 1,
                                y: isOver ? -1 : 0,
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 25,
                            }}
                        >
                            <MdDelete className={`w-5 h-5 ${isOver ? 'text-white' : 'text-[var(--ui-text-secondary)]'}`} />
                        </motion.div>
                        <motion.span
                            className={`text-sm font-medium ${isOver ? 'text-white' : 'text-[var(--ui-text-secondary)]'}`}
                            animate={{ scale: isOver ? 1.02 : 1 }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                            }}
                        >
                            {isOver ? 'Release to Remove' : 'Remove'}
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
    const justFinishedDragging = useRef(false);

    // Touch sensor with delay activation (long press to drag)
    // Mouse sensor for desktop only
    const sensors = useSensors(
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 500,
                tolerance: 5,
            },
        }),
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id);
        onDragStateChange(true);
        vibrate([15, 5, 15]);
    }, [onDragStateChange]);

    const handleDragMove = useCallback((event: { activatorEvent: Event; delta: { x: number; y: number } }) => {
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
        const trashZoneTop = viewportHeight - 100;
        const newIsOverTrash = clientY > trashZoneTop;

        if (newIsOverTrash !== isOverTrash) {
            setIsOverTrash(newIsOverTrash);
            vibrate(newIsOverTrash ? 20 : 10);
        }
    }, [isOverTrash]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (isOverTrash && activeId) {
            vibrate([30, 15, 30]);
            onRemoveWidget(activeId as string);
        } else if (over && active.id !== over.id) {
            const oldIndex = widgetIds.indexOf(active.id as string);
            const newIndex = widgetIds.indexOf(over.id as string);
            const newOrder = arrayMove(widgetIds, oldIndex, newIndex);
            onReorder(newOrder);
            vibrate(15);
        }

        setActiveId(null);
        setIsOverTrash(false);
        onDragStateChange(false);

        // Brief cooldown to prevent accidental taps right after dropping
        justFinishedDragging.current = true;
        setTimeout(() => { justFinishedDragging.current = false; }, 200);
    }, [activeId, isOverTrash, onDragStateChange, onRemoveWidget, onReorder, widgetIds]);

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
        setIsOverTrash(false);
        onDragStateChange(false);
    }, [onDragStateChange]);

    const handleWidgetClick = useCallback((widgetId: string) => {
        if (!justFinishedDragging.current) {
            onWidgetClick(widgetId);
        }
    }, [onWidgetClick]);

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
                            onTap={() => handleWidgetClick(widgetId)}
                            isVisible={isVisible}
                            isAnyDragging={!!activeId}
                        />
                    ))}
                </div>

                {typeof document !== 'undefined' && createPortal(
                    <DragOverlay
                        zIndex={1000}
                        dropAnimation={{
                            duration: 300,
                            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
                            sideEffects: defaultDropAnimationSideEffects({
                                className: {
                                    active: 'mobile-widget-card-ghost',
                                },
                            }),
                        }}
                    >
                        {activeId ? <DragOverlayItem widgetId={activeId as string} /> : null}
                    </DragOverlay>,
                    document.body
                )}
            </SortableContext>
        </DndContext>
    );
});
