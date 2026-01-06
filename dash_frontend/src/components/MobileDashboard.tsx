"use client";

import React, {
    useState,
    useEffect,
    useCallback,
    Suspense,
    useMemo,
    useRef,
    memo,
} from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { getWidgetById } from "@/constants/widgets";

// Swiper - native-feeling carousel
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/pagination";

// Widget registry
import {
    WIDGET_CONFIGS,
    type WidgetCategory,
    getWidgetConfig,
    getAvailableCategories,
    searchWidgets,
    type WidgetConfig,
} from "@/components/widgets/registry";

// Icons - grouped by usage
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
    MdEdit,
} from "react-icons/md";

// Hooks & contexts
import { useWidgetPermissions } from "@/hooks/useWidgetPermissions";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useWidgetPreview } from "@/hooks/useWidgetPreview";

// Components
import { Loader } from "@/components/ui/loader";
import { WidgetErrorBoundary } from "@/components/ErrorBoundary";
import WidgetSettingsDialog from "@/components/WidgetSettingsDialog";

// Utils
import { toast } from "sonner";
import { getWidgetSettingsSchema } from "@/constants/widgetSettings";
import {
    type MobilePresetsState,
    type MobilePreset,
    readMobilePresets,
    saveMobilePresets,
    getStarterPresets,
    toggleWidgetInActivePreset,
    updateActivePresetWidgets,
    savePreset,
    findNextEmptySlot,
    subscribeMobilePresets,
} from "@/utils/mobilePresetUtils";

// DnD Kit
import {
    DndContext,
    closestCenter,
    pointerWithin,
    TouchSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
    type DragOverEvent,
    useDroppable,
    type CollisionDetection,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    useSortable,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ============================================
// Constants & Types
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

// Animation presets for consistent motion
const SPRING_TRANSITION = { type: "spring", stiffness: 400, damping: 30 };
const EASE_OUT_TRANSITION = { type: "tween", duration: 0.25, ease: [0.32, 0.72, 0, 1] };

export interface MobileDashboardProps {
    onSettingsClick: () => void;
}

// ============================================
// Utility Functions
// ============================================

const getWidgetTypeIcon = (widgetId: string): React.ComponentType<{ className?: string }> => {
    const id = widgetId.toLowerCase();
    if (id.includes("clock") || id.includes("date")) return MdAccessTime;
    if (id.includes("pie")) return MdPieChart;
    if (id.includes("line") || id.includes("cumulative")) return MdShowChart;
    if (id.includes("bar") || id.includes("chart")) return MdBarChart;
    if (id.includes("table") || id.includes("log") || id.includes("orders")) return MdTableChart;
    if (id.includes("customer") || id.includes("user")) return MdPeople;
    if (id.includes("due") || id.includes("delivery")) return MdLocalShipping;
    if (id.includes("overview") || id.includes("summary")) return MdTrendingUp;
    if (id.includes("status") || id.includes("tracker")) return MdTimeline;
    return MdBarChart;
};

/** Safe haptic feedback - fails silently on unsupported devices */
const vibrate = (pattern: number | number[] = 10) => {
    try {
        navigator.vibrate?.(pattern);
    } catch {
        // Vibration not supported
    }
};

// ============================================
// Widget Complication (Mini Preview) - Memoized
// ============================================

interface WidgetComplicationProps {
    widgetId: string;
    isVisible?: boolean;
}

const WidgetComplication = memo(function WidgetComplication({ widgetId, isVisible = true }: WidgetComplicationProps) {
    const { data, loading } = useWidgetPreview(widgetId);
    const [dataReady, setDataReady] = useState(false);

    useEffect(() => {
        if (!loading && data?.value) {
            setDataReady(true);
        }
    }, [loading, data?.value]);

    // Show content when data is ready AND this preset is visible
    const showContent = dataReady && isVisible;

    if (!loading && !data?.value && !dataReady) {
        return null;
    }

    return (
        <div className="widget-complication-container">
            {/* Skeleton loader - shows while loading or when not visible */}
            <div
                className="widget-complication-loading"
                style={{
                    opacity: showContent ? 0 : 1,
                    transition: "opacity 0.2s ease-out",
                }}
            >
                <div className="widget-complication-skeleton" />
            </div>

            {/* Actual data - fades in when visible */}
            {dataReady && data?.value && (
                <div
                    className="widget-complication"
                    style={{
                        opacity: showContent ? 1 : 0,
                        transition: "opacity 0.3s ease-in",
                    }}
                >
                    {data.status && data.status !== "neutral" && (
                        <div className={`widget-complication-status ${data.status}`} />
                    )}
                    <div className="widget-complication-value">
                        <span>{data.value}</span>
                        {data.trendValue && data.trend && (
                            <span className={`widget-complication-trend ${data.trend}`}>
                                {data.trendValue}
                            </span>
                        )}
                    </div>
                    {data.label && (
                        <div className="widget-complication-label">{data.label}</div>
                    )}
                </div>
            )}
        </div>
    );
});

// ============================================
// Sortable Widget Card - Memoized
// ============================================

interface SortableWidgetCardProps {
    widgetId: string;
    onClick: () => void;
    isVisible?: boolean;
}

const SortableWidgetCard = memo(function SortableWidgetCard({
    widgetId,
    onClick,
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
        transition: isDragging ? undefined : 'transform 200ms ease',
        touchAction: 'none',
        zIndex: isDragging ? 999 : 'auto',
        position: 'relative',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`mobile-widget-card ${isDragging ? 'mobile-widget-card-dragging' : ''}`}
            onClick={() => {
                if (!isDragging) {
                    vibrate(10);
                    onClick();
                }
            }}
            {...attributes}
            {...listeners}
        >
            <div className="mobile-widget-card-header">
                <div className="mobile-widget-card-icon">
                    <TypeIcon className="w-4 h-4" />
                </div>
                <span className="mobile-widget-card-title">{title}</span>
            </div>
            <WidgetComplication widgetId={widgetId} isVisible={isVisible} />
        </div>
    );
});

// ============================================
// Trash Drop Zone - Memoized
// ============================================

interface TrashDropZoneProps {
    isOver: boolean;
    isVisible: boolean;
}

const TrashDropZone = memo(function TrashDropZone({ isOver, isVisible }: TrashDropZoneProps) {
    const { setNodeRef, isOver: dndIsOver } = useDroppable({ id: "trash-zone" });
    const showActive = isOver || dndIsOver;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    ref={setNodeRef}
                    className="fixed bottom-0 inset-x-0 z-[200] flex justify-center"
                    style={{
                        paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
                        paddingTop: "16px",
                    }}
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 60 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                    <motion.div
                        className="flex items-center gap-2 px-6 py-4 rounded-2xl text-sm font-semibold shadow-2xl"
                        animate={{
                            scale: showActive ? 1.1 : 1,
                            backgroundColor: showActive ? "#ef4444" : "rgba(239, 68, 68, 0.9)",
                        }}
                        style={{
                            color: "#ffffff",
                            backdropFilter: "blur(12px)",
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                        <MdDelete className={`w-6 h-6 ${showActive ? "animate-bounce" : ""}`} />
                        <span>{showActive ? "Release to remove" : "Drop here to remove"}</span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

// ============================================
// Preset Tabs - Clean iOS-style with spring animation
// ============================================

interface PresetTabsProps {
    presets: MobilePresetsState;
    onPresetChange: (index: number) => void;
    onAddPreset: () => void;
    onRenamePreset: (index: number) => void;
    onDeletePreset: (index: number) => void;
    currentSwiperIndex: number;
    nonNullPresetsCount: number;
}

const PresetTabs = memo(function PresetTabs({
    presets,
    onPresetChange,
    onAddPreset,
    onRenamePreset,
    onDeletePreset,
    currentSwiperIndex,
    nonNullPresetsCount,
}: PresetTabsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
    const [contextMenu, setContextMenu] = useState<{ index: number; x: number; y: number } | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    // Get non-null presets for rendering
    const nonNullPresets = useMemo(
        () => presets.presets
            .map((p, i) => ({ preset: p, originalIndex: i }))
            .filter((item): item is { preset: NonNullable<typeof item.preset>; originalIndex: number } =>
                item.preset !== null
            ),
        [presets.presets]
    );

    // Close context menu when clicking outside
    useEffect(() => {
        if (!contextMenu) return;
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [contextMenu]);

    const handleLongPressStart = useCallback((index: number, e: React.TouchEvent | React.MouseEvent) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        longPressTimer.current = setTimeout(() => {
            vibrate(20);
            setContextMenu({ index, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
        }, 500);
    }, []);

    const handleLongPressEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handleRename = useCallback(() => {
        if (contextMenu) {
            onRenamePreset(contextMenu.index);
            setContextMenu(null);
        }
    }, [contextMenu, onRenamePreset]);

    const handleDelete = useCallback(() => {
        if (contextMenu) {
            onDeletePreset(contextMenu.index);
            setContextMenu(null);
        }
    }, [contextMenu, onDeletePreset]);

    // Update indicator position when active tab changes
    useEffect(() => {
        if (!tabsRef.current) return;

        const updateIndicator = () => {
            const tabs = tabsRef.current?.querySelectorAll<HTMLElement>('[data-tab]');
            if (!tabs || !tabs[currentSwiperIndex]) return;

            const tab = tabs[currentSwiperIndex];
            setIndicatorStyle({
                left: tab.offsetLeft,
                width: tab.offsetWidth,
            });
        };

        // Update immediately and after a short delay (for initial render)
        updateIndicator();
        const timer = setTimeout(updateIndicator, 50);
        return () => clearTimeout(timer);
    }, [currentSwiperIndex, nonNullPresets.length]);

    // Smooth scroll to active tab using requestAnimationFrame
    useEffect(() => {
        if (!containerRef.current || !tabsRef.current) return;
        const tabs = tabsRef.current.querySelectorAll<HTMLElement>('[data-tab]');
        const tab = tabs[currentSwiperIndex];
        if (!tab) return;

        const container = containerRef.current;
        const tabRect = tab.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Calculate where we want the tab centered
        const tabCenterInContainer = tab.offsetLeft + tab.offsetWidth / 2;
        const targetScroll = tabCenterInContainer - container.clientWidth / 2;
        const clampedTarget = Math.max(0, Math.min(targetScroll, container.scrollWidth - container.clientWidth));

        const startScroll = container.scrollLeft;
        const distance = clampedTarget - startScroll;

        // Skip if already close enough
        if (Math.abs(distance) < 2) return;

        const duration = 250;
        let startTime: number | null = null;

        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

        const animateScroll = (currentTime: number) => {
            if (startTime === null) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);

            container.scrollLeft = startScroll + distance * easedProgress;

            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        };

        requestAnimationFrame(animateScroll);
    }, [currentSwiperIndex]);

    return (
        <div className="preset-tabs-wrapper px-4 py-2">
            <div
                ref={containerRef}
                className="overflow-x-auto scrollbar-hide"
            >
                <div className="inline-flex items-center gap-2">
                    {/* Tab container */}
                    <div
                        ref={tabsRef}
                        className="relative flex items-center rounded-xl p-1"
                        style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}
                        role="tablist"
                        aria-label="Preset tabs"
                    >
                        {/* Animated indicator */}
                        <motion.div
                            className="absolute top-1 bottom-1 rounded-lg"
                            style={{ backgroundColor: 'var(--ui-accent-primary)' }}
                            initial={false}
                            animate={{
                                left: indicatorStyle.left,
                                width: indicatorStyle.width,
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 30,
                            }}
                        />

                        {/* Tab buttons */}
                        {nonNullPresets.map(({ preset, originalIndex }, swiperIndex) => {
                            const isActive = swiperIndex === currentSwiperIndex;

                            return (
                                <button
                                    key={originalIndex}
                                    data-tab
                                    onClick={() => onPresetChange(originalIndex)}
                                    onTouchStart={(e) => handleLongPressStart(originalIndex, e)}
                                    onTouchEnd={handleLongPressEnd}
                                    onTouchCancel={handleLongPressEnd}
                                    onMouseDown={(e) => handleLongPressStart(originalIndex, e)}
                                    onMouseUp={handleLongPressEnd}
                                    onMouseLeave={handleLongPressEnd}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                                        vibrate(20);
                                        setContextMenu({ index: originalIndex, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
                                    }}
                                    role="tab"
                                    aria-selected={isActive}
                                    className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap select-none"
                                    style={{
                                        color: isActive ? 'white' : 'var(--ui-text-secondary)',
                                        transition: 'color 0.2s ease',
                                    }}
                                >
                                    <span
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold"
                                        style={{
                                            backgroundColor: isActive
                                                ? 'rgba(255,255,255,0.25)'
                                                : 'var(--ui-bg-secondary)',
                                            transition: 'background-color 0.2s ease',
                                        }}
                                    >
                                        {swiperIndex + 1}
                                    </span>
                                    <span className="max-w-20 truncate">{preset.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Add preset button */}
                    <button
                        onClick={onAddPreset}
                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-ui-text-muted active:scale-90 transition-transform"
                        style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}
                        aria-label="Create new preset"
                    >
                        <MdAdd className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Context Menu */}
            <AnimatePresence>
                {contextMenu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed z-[100] bg-ui-bg-primary border border-ui-border-primary rounded-lg shadow-2xl overflow-hidden"
                        style={{
                            left: contextMenu.x,
                            top: contextMenu.y,
                            transform: 'translateX(-50%)',
                            minWidth: '160px',
                        }}
                    >
                        {/* Header */}
                        <div className="px-3 py-2 border-b border-ui-border-primary bg-ui-bg-secondary">
                            <p className="text-xs font-medium text-ui-text-secondary truncate">
                                {presets.presets[contextMenu.index]?.name}
                            </p>
                        </div>
                        {/* Menu Items */}
                        <div className="py-1">
                            <button
                                onClick={handleRename}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-ui-text-primary hover:bg-ui-bg-tertiary transition-colors"
                            >
                                <MdEdit className="w-4 h-4" />
                                Rename
                            </button>
                            {nonNullPresetsCount > 1 && (
                                <button
                                    onClick={handleDelete}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <MdDelete className="w-4 h-4" />
                                    Delete
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

// ============================================
// Pull to Refresh - Memoized
// ============================================

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

const PullToRefresh = memo(function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const THRESHOLD = 80;

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (containerRef.current?.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
        }
    }, []);

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (isRefreshing || containerRef.current?.scrollTop !== 0) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startY.current;

            if (diff > 0) {
                setPullDistance(Math.min(diff * 0.5, THRESHOLD * 1.5));
            }
        },
        [isRefreshing]
    );

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance >= THRESHOLD && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(THRESHOLD);
            vibrate(20);

            try {
                await onRefresh();
                toast.success("Refreshed!");
            } catch {
                toast.error("Failed to refresh");
            }

            setIsRefreshing(false);
        }
        setPullDistance(0);
    }, [pullDistance, isRefreshing, onRefresh]);

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
            style={{ WebkitOverflowScrolling: "touch" }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <div
                className="flex items-center justify-center"
                style={{
                    height: pullDistance,
                    opacity: pullDistance / THRESHOLD,
                    transition: pullDistance === 0 ? "height 0.2s ease" : "none",
                }}
            >
                <motion.div
                    animate={{
                        rotate: isRefreshing ? 360 : (pullDistance / THRESHOLD) * 180,
                    }}
                    transition={{
                        duration: isRefreshing ? 1 : 0,
                        repeat: isRefreshing ? Infinity : 0,
                        ease: "linear",
                    }}
                >
                    <MdRefresh
                        className={`w-6 h-6 ${pullDistance >= THRESHOLD ? "text-ui-accent-primary" : "text-ui-text-muted"
                            }`}
                    />
                </motion.div>
            </div>
            {children}
        </div>
    );
});

// ============================================
// Draggable Widget Grid
// ============================================

interface DraggableGridProps {
    widgetIds: string[];
    onReorder: (newOrder: string[]) => void;
    onWidgetClick: (widgetId: string) => void;
    onRemoveWidget: (widgetId: string) => void;
    isVisible?: boolean;
}

// Custom collision detection: prioritize sortable items, only use trash when pointer is directly over it
const customCollisionDetection: CollisionDetection = (args) => {
    // First check if pointer is over the trash zone
    const pointerCollisions = pointerWithin(args);
    const trashCollision = pointerCollisions.find((c) => c.id === "trash-zone");
    if (trashCollision) {
        return [trashCollision];
    }

    // Otherwise use closestCenter for the sortable items
    return closestCenter(args);
};

const DraggableWidgetGrid = memo(function DraggableWidgetGrid({
    widgetIds,
    onReorder,
    onWidgetClick,
    onRemoveWidget,
    isVisible = true,
}: DraggableGridProps) {
    const [items, setItems] = useState(widgetIds);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isOverTrash, setIsOverTrash] = useState(false);

    // Hold to drag: 200ms delay, 5px tolerance during delay
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 5,
            },
        })
    );

    // Sync items when widgetIds change
    useEffect(() => {
        setItems(widgetIds);
    }, [widgetIds]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        vibrate(50);
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        setIsOverTrash(event.over?.id === "trash-zone");
    }, []);

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveId(null);
            setIsOverTrash(false);

            if (over?.id === "trash-zone") {
                onRemoveWidget(active.id as string);
                vibrate([50, 30, 50]);
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
                vibrate(20);
            }
        },
        [onReorder, onRemoveWidget]
    );

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
        setIsOverTrash(false);
    }, []);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <TrashDropZone isOver={isOverTrash} isVisible={!!activeId} />
            <SortableContext items={items} strategy={rectSortingStrategy}>
                <div className="mobile-widget-grid">
                    {items.map((widgetId) => (
                        <SortableWidgetCard
                            key={widgetId}
                            widgetId={widgetId}
                            onClick={() => onWidgetClick(widgetId)}
                            isVisible={isVisible}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
});

// ============================================
// Detail View (Full Screen Widget) - Memoized
// ============================================

interface DetailViewProps {
    widgetId: string;
    onClose: () => void;
}

const DetailView = memo(function DetailView({ widgetId, onClose }: DetailViewProps) {
    const widgetDef = getWidgetById(widgetId);
    const config = getWidgetConfig(widgetId);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const hasSettings = getWidgetSettingsSchema(widgetId) !== null;
    const title = widgetDef?.title || config?.title || widgetId;

    const handleDragEnd = useCallback(
        (_: unknown, info: PanInfo) => {
            if (info.offset.y > 100 || info.velocity.y > 500) {
                vibrate(10);
                onClose();
            }
        },
        [onClose]
    );

    const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
    const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="fixed inset-0 z-50"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
                onClick={onClose}
                role="dialog"
                aria-modal="true"
                aria-label={`${title} widget details`}
            >
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={EASE_OUT_TRANSITION}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0.1, bottom: 0.3 }}
                    onDragEnd={handleDragEnd}
                    className="absolute inset-x-0 bottom-0 top-[env(safe-area-inset-top)] flex flex-col overflow-hidden"
                    style={{
                        backgroundColor: "var(--ui-bg-primary)",
                        borderTopLeftRadius: "1.5rem",
                        borderTopRightRadius: "1.5rem",
                        willChange: "transform",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Drag Handle */}
                    <div className="flex justify-center py-3 flex-shrink-0">
                        <div
                            className="w-10 h-1 rounded-full"
                            style={{ backgroundColor: "var(--ui-border-secondary)" }}
                        />
                    </div>

                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-4 pb-3 border-b flex-shrink-0"
                        style={{ borderColor: "var(--ui-border-primary)" }}
                    >
                        <div className="flex-1 min-w-0">
                            <h2
                                className="text-lg font-semibold truncate"
                                style={{ color: "var(--ui-text-primary)" }}
                            >
                                {title}
                            </h2>
                            {config?.category && (
                                <span className="text-xs" style={{ color: "var(--ui-text-muted)" }}>
                                    {config.category}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            {hasSettings && (
                                <button
                                    onClick={handleOpenSettings}
                                    className="p-2 rounded-full transition-colors active:scale-95"
                                    style={{
                                        backgroundColor: "var(--ui-bg-tertiary)",
                                        color: "var(--ui-text-secondary)",
                                    }}
                                    aria-label="Widget Settings"
                                >
                                    <MdTune className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full transition-colors active:scale-95"
                                style={{
                                    backgroundColor: "var(--ui-bg-tertiary)",
                                    color: "var(--ui-text-secondary)",
                                }}
                                aria-label="Close"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Widget Content */}
                    <div
                        className="flex-1 overflow-auto p-4"
                        style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom))" }}
                    >
                        {widgetDef && (
                            <WidgetErrorBoundary widgetName={widgetDef.title || widgetDef.id}>
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
                            </WidgetErrorBoundary>
                        )}
                    </div>

                    {/* Swipe hint */}
                    <motion.div
                        className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none"
                        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 0.8, y: 0 }}
                        transition={{ delay: 1.5 }}
                    >
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                            style={{
                                backgroundColor: "var(--ui-bg-tertiary)",
                                color: "var(--ui-text-muted)",
                            }}
                        >
                            <MdExpandMore className="w-4 h-4" />
                            <span className="text-xs font-medium">Swipe down to close</span>
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>

            {hasSettings && (
                <WidgetSettingsDialog
                    widgetId={widgetId}
                    widgetTitle={title}
                    isOpen={settingsOpen}
                    onClose={handleCloseSettings}
                />
            )}
        </>
    );
});

// ============================================
// Mobile Widget Picker - Memoized
// ============================================

interface MobileWidgetPickerProps {
    enabledWidgetIds: string[];
    onToggleWidget: (widgetId: string) => void;
    onClose: () => void;
}

const MobileWidgetPicker = memo(function MobileWidgetPicker({
    enabledWidgetIds,
    onToggleWidget,
    onClose,
}: MobileWidgetPickerProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | "all">("all");
    const { filterAccessibleWidgets } = useWidgetPermissions();

    const accessibleWidgets = useMemo(
        () => filterAccessibleWidgets(WIDGET_CONFIGS, "view") as WidgetConfig[],
        [filterAccessibleWidgets]
    );

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

    const categories = useMemo(() => getAvailableCategories(), []);
    const enabledSet = useMemo(() => new Set(enabledWidgetIds), [enabledWidgetIds]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    }, []);

    const handleClearSearch = useCallback(() => setSearchTerm(""), []);

    const handleToggle = useCallback(
        (widgetId: string) => {
            vibrate(10);
            onToggleWidget(widgetId);
        },
        [onToggleWidget]
    );

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={EASE_OUT_TRANSITION}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ backgroundColor: "var(--ui-bg-primary)", willChange: "transform" }}
            role="dialog"
            aria-modal="true"
            aria-label="Add widgets"
        >
            {/* Header */}
            <div
                className="flex-shrink-0 border-b safe-top"
                style={{ borderColor: "var(--ui-border-primary)" }}
            >
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <MdWidgets className="w-5 h-5" style={{ color: "var(--ui-accent-primary)" }} />
                        <div>
                            <h2
                                className="text-lg font-semibold"
                                style={{ color: "var(--ui-text-primary)" }}
                            >
                                Add Widgets
                            </h2>
                            <p className="text-xs" style={{ color: "var(--ui-text-muted)" }}>
                                {enabledSet.size} selected
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg active:scale-95 transition-transform"
                        style={{ color: "var(--ui-text-secondary)" }}
                        aria-label="Close"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <MdSearch
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                            style={{ color: "var(--ui-text-muted)" }}
                        />
                        <input
                            type="text"
                            placeholder="Search widgets..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm"
                            style={{
                                backgroundColor: "var(--ui-bg-secondary)",
                                borderColor: "var(--ui-border-primary)",
                                color: "var(--ui-text-primary)",
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={handleClearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                style={{ color: "var(--ui-text-muted)" }}
                                aria-label="Clear search"
                            >
                                <MdClose className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Pills */}
                <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
                    <div className="flex gap-2" role="tablist" aria-label="Widget categories">
                        <button
                            onClick={() => setSelectedCategory("all")}
                            role="tab"
                            aria-selected={selectedCategory === "all"}
                            className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-95"
                            style={
                                selectedCategory === "all"
                                    ? { backgroundColor: "var(--ui-accent-primary)", color: "#ffffff" }
                                    : { backgroundColor: "var(--ui-bg-tertiary)", color: "var(--ui-text-secondary)" }
                            }
                        >
                            All
                        </button>
                        {categories.map((category) => {
                            const IconComponent = CATEGORY_ICONS[category];
                            return (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    role="tab"
                                    aria-selected={selectedCategory === category}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-95"
                                    style={
                                        selectedCategory === category
                                            ? { backgroundColor: "var(--ui-accent-primary)", color: "#ffffff" }
                                            : { backgroundColor: "var(--ui-bg-tertiary)", color: "var(--ui-text-secondary)" }
                                    }
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
                            style={{ color: "var(--ui-text-tertiary)" }}
                        />
                        <p className="font-medium" style={{ color: "var(--ui-text-secondary)" }}>
                            No widgets found
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2 pb-8">
                        {filteredWidgets.map((widget) => {
                            const isEnabled = enabledSet.has(widget.id);
                            const TypeIcon = getWidgetTypeIcon(widget.id);

                            return (
                                <motion.button
                                    key={widget.id}
                                    onClick={() => handleToggle(widget.id)}
                                    className="w-full flex items-start gap-3 p-4 rounded-xl border text-left"
                                    style={
                                        isEnabled
                                            ? {
                                                backgroundColor: "var(--ui-accent-primary-bg)",
                                                borderColor: "var(--ui-accent-primary-border)",
                                            }
                                            : {
                                                backgroundColor: "var(--ui-bg-secondary)",
                                                borderColor: "var(--ui-border-primary)",
                                            }
                                    }
                                    aria-pressed={isEnabled}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                >
                                    <div
                                        className="flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center mt-0.5 transition-all"
                                        style={
                                            isEnabled
                                                ? {
                                                    backgroundColor: "var(--ui-accent-primary)",
                                                    borderColor: "var(--ui-accent-primary)",
                                                }
                                                : {
                                                    borderColor: "var(--ui-border-secondary)",
                                                }
                                        }
                                    >
                                        {isEnabled && <MdCheck className="w-4 h-4 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3
                                            className="font-semibold truncate"
                                            style={{
                                                color: isEnabled
                                                    ? "var(--ui-accent-primary)"
                                                    : "var(--ui-text-primary)",
                                            }}
                                        >
                                            {widget.title}
                                        </h3>
                                        <p
                                            className="text-sm line-clamp-2"
                                            style={{ color: "var(--ui-text-muted)" }}
                                        >
                                            {widget.description}
                                        </p>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div
                className="flex-shrink-0 border-t p-4 safe-bottom"
                style={{ borderColor: "var(--ui-border-primary)" }}
            >
                <motion.button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl font-semibold"
                    style={{ backgroundColor: "var(--ui-accent-primary)", color: "#ffffff" }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                    Done
                </motion.button>
            </div>
        </motion.div>
    );
});

// ============================================
// Preset Name Dialog - Memoized
// ============================================

interface PresetNameDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    initialName?: string;
    title?: string;
}

const PresetNameDialog = memo(function PresetNameDialog({
    isOpen,
    onClose,
    onSave,
    initialName = "",
    title = "Save Preset",
}: PresetNameDialogProps) {
    const [name, setName] = useState(initialName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setName(initialName);
    }, [initialName, isOpen]);

    // Focus input when dialog opens
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => inputRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleSave = useCallback(() => {
        if (name.trim()) {
            onSave(name.trim());
            onClose();
        }
    }, [name, onSave, onClose]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                handleSave();
            } else if (e.key === "Escape") {
                onClose();
            }
        },
        [handleSave, onClose]
    );

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="w-full max-w-sm rounded-2xl p-6"
                style={{ backgroundColor: "var(--ui-bg-primary)" }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3
                    className="text-lg font-semibold mb-4"
                    style={{ color: "var(--ui-text-primary)" }}
                >
                    {title}
                </h3>
                <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Preset name..."
                    className="w-full px-4 py-3 rounded-lg border text-sm mb-4"
                    style={{
                        backgroundColor: "var(--ui-bg-secondary)",
                        borderColor: "var(--ui-border-primary)",
                        color: "var(--ui-text-primary)",
                    }}
                    maxLength={32}
                />
                <div className="flex gap-3">
                    <motion.button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-lg font-medium"
                        style={{
                            backgroundColor: "var(--ui-bg-tertiary)",
                            color: "var(--ui-text-secondary)",
                        }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                        Cancel
                    </motion.button>
                    <motion.button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="flex-1 py-3 rounded-lg font-medium disabled:opacity-50"
                        style={{ backgroundColor: "var(--ui-accent-primary)", color: "#ffffff" }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                        Save
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
});

// ============================================
// Static Widget Card (for non-active presets)
// ============================================

interface StaticWidgetCardProps {
    widgetId: string;
    isVisible?: boolean;
}

const StaticWidgetCard = memo(function StaticWidgetCard({ widgetId, isVisible = true }: StaticWidgetCardProps) {
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
            <div className="mobile-widget-card-header">
                <div className="mobile-widget-card-icon">
                    <TypeIcon className="w-4 h-4" />
                </div>
                <span className="mobile-widget-card-title">{title}</span>
            </div>
            <WidgetComplication widgetId={widgetId} isVisible={isVisible} />
        </motion.div>
    );
});

// ============================================
// Main Component
// ============================================

export default function MobileDashboard({ onSettingsClick }: MobileDashboardProps) {
    const { hasAccess } = useWidgetPermissions();
    const { settings: privacySettings, toggle: togglePrivacy } = usePrivacy();

    // State
    const [presetsState, setPresetsState] = useState<MobilePresetsState>(() => readMobilePresets());
    const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
    const [widgetPickerOpen, setWidgetPickerOpen] = useState(false);
    const [presetNameDialogOpen, setPresetNameDialogOpen] = useState(false);
    const [pendingPresetSlot, setPendingPresetSlot] = useState<number | null>(null);
    const [visiblePresetIndex, setVisiblePresetIndex] = useState<number>(() => readMobilePresets().activePresetIndex);

    // Refs
    const swiperRef = useRef<SwiperType | null>(null);
    const lastSyncedIndex = useRef(-1);

    // Subscribe to remote preset changes
    useEffect(() => {
        const unsubscribe = subscribeMobilePresets((newState) => {
            setPresetsState(newState);
        });
        return unsubscribe;
    }, []);

    // Derived state
    const activePreset = presetsState.presets[presetsState.activePresetIndex];

    const enabledWidgetIds = useMemo(() => {
        if (!activePreset) return [];
        return activePreset.widgetIds.filter((id) => hasAccess(id, "view"));
    }, [activePreset, hasAccess]);

    const nonNullPresets = useMemo(
        () =>
            presetsState.presets
                .map((preset, index) => ({ preset, index }))
                .filter(({ preset }) => preset !== null) as { preset: MobilePreset; index: number }[],
        [presetsState.presets]
    );

    const currentSwiperIndex = useMemo(
        () => nonNullPresets.findIndex(({ index }) => index === presetsState.activePresetIndex),
        [nonNullPresets, presetsState.activePresetIndex]
    );

    // ============================================
    // Handlers - Memoized
    // ============================================

    const handlePresetChange = useCallback((index: number) => {
        if (presetsState.presets[index] === null) return;
        vibrate(10);
        setPresetsState((prev) => {
            const newState = { ...prev, activePresetIndex: index };
            saveMobilePresets(newState);
            return newState;
        });
    }, [presetsState.presets]);

    const handleWidgetClick = useCallback(
        (widgetId: string) => {
            setSelectedWidgetId(widgetId);
        },
        []
    );

    const handleToggleWidget = useCallback((widgetId: string) => {
        setPresetsState((prev) => {
            const newState = toggleWidgetInActivePreset(prev, widgetId);
            saveMobilePresets(newState);
            return newState;
        });
    }, []);

    const handleRemoveWidget = useCallback((widgetId: string) => {
        const widgetDef = getWidgetById(widgetId);
        const config = getWidgetConfig(widgetId);
        const widgetName = widgetDef?.title || config?.title || widgetId;

        setPresetsState((prev) => {
            const newState = toggleWidgetInActivePreset(prev, widgetId);
            saveMobilePresets(newState);
            return newState;
        });
        toast.success(`Removed "${widgetName}"`);
    }, []);

    const handleReorder = useCallback((newOrder: string[]) => {
        setPresetsState((prev) => {
            const newState = updateActivePresetWidgets(prev, newOrder);
            saveMobilePresets(newState);
            return newState;
        });
    }, []);

    const handleRefresh = useCallback(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        window.dispatchEvent(new CustomEvent("refresh-widgets"));
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

    const handleSaveNewPreset = useCallback(
        (name: string) => {
            if (pendingPresetSlot === null) return;

            const existingPreset = presetsState.presets[pendingPresetSlot];

            setPresetsState((prev) => {
                if (existingPreset) {
                    // Renaming existing preset - keep widgets
                    const newPresets = [...prev.presets];
                    newPresets[pendingPresetSlot] = { ...existingPreset, name };
                    const newState = { ...prev, presets: newPresets };
                    saveMobilePresets(newState);
                    return newState;
                } else {
                    // Creating new preset
                    const newState = savePreset(prev, pendingPresetSlot, name, []);
                    const withActiveChange = { ...newState, activePresetIndex: pendingPresetSlot };
                    saveMobilePresets(withActiveChange);
                    return withActiveChange;
                }
            });
            toast.success(existingPreset ? `Renamed to "${name}"` : `Created "${name}"`);
            setPendingPresetSlot(null);
        },
        [pendingPresetSlot, presetsState.presets]
    );

    const handleRenamePreset = useCallback((index: number) => {
        setPendingPresetSlot(index);
        setPresetNameDialogOpen(true);
    }, []);

    const handleDeletePreset = useCallback((index: number) => {
        const preset = presetsState.presets[index];
        if (!preset) return;

        // Count non-null presets
        const nonNullCount = presetsState.presets.filter(p => p !== null).length;
        if (nonNullCount <= 1) {
            toast.error("Cannot delete the last preset");
            return;
        }

        setPresetsState((prev) => {
            const newPresets = [...prev.presets];
            newPresets[index] = null;

            // If deleting active preset, switch to first available
            let newActiveIndex = prev.activePresetIndex;
            if (index === prev.activePresetIndex) {
                newActiveIndex = newPresets.findIndex(p => p !== null);
            }

            const newState = { ...prev, presets: newPresets, activePresetIndex: newActiveIndex };
            saveMobilePresets(newState);
            return newState;
        });
        toast.success(`Deleted "${preset.name}"`);
        vibrate(20);
    }, [presetsState.presets]);

    const handleUseStarter = useCallback(() => {
        const starterPresets = getStarterPresets();
        setPresetsState(starterPresets);
        saveMobilePresets(starterPresets);
        toast.success("Loaded starter presets!");
    }, []);

    const handleClosePresetDialog = useCallback(() => {
        setPresetNameDialogOpen(false);
        setPendingPresetSlot(null);
    }, []);

    const handleCloseDetailView = useCallback(() => setSelectedWidgetId(null), []);
    const handleCloseWidgetPicker = useCallback(() => setWidgetPickerOpen(false), []);
    const handleOpenWidgetPicker = useCallback(() => setWidgetPickerOpen(true), []);

    // Computed values for preset dialog
    const pendingPresetName = pendingPresetSlot !== null ? presetsState.presets[pendingPresetSlot]?.name ?? "" : "";
    const isRenamingPreset = pendingPresetSlot !== null && presetsState.presets[pendingPresetSlot] !== null;
    const presetDialogTitle = isRenamingPreset ? "Rename Preset" : "New Preset";

    // ============================================
    // Swiper Handlers
    // ============================================

    // Sync swiper when preset changes externally (e.g., from tabs)
    useEffect(() => {
        if (swiperRef.current && currentSwiperIndex >= 0 && currentSwiperIndex !== lastSyncedIndex.current) {
            const swiperActiveIndex = swiperRef.current.activeIndex;
            if (swiperActiveIndex !== currentSwiperIndex) {
                swiperRef.current.slideTo(currentSwiperIndex, 300);
            }
            lastSyncedIndex.current = currentSwiperIndex;
        }
    }, [currentSwiperIndex]);

    const handleSlideChange = useCallback(
        (swiper: SwiperType) => {
            const targetPresetIndex = nonNullPresets[swiper.activeIndex]?.index;
            if (targetPresetIndex !== undefined && targetPresetIndex !== presetsState.activePresetIndex) {
                lastSyncedIndex.current = swiper.activeIndex;
                setPresetsState((prev) => {
                    const newState = { ...prev, activePresetIndex: targetPresetIndex };
                    saveMobilePresets(newState);
                    return newState;
                });
                vibrate(10);
            }
        },
        [nonNullPresets, presetsState.activePresetIndex]
    );

    const handleTransitionEnd = useCallback(() => {
        // Set visible preset index to trigger fade-in on the new active preset
        setVisiblePresetIndex(presetsState.activePresetIndex);
    }, [presetsState.activePresetIndex]);

    const handleSwiperInit = useCallback((swiper: SwiperType) => {
        swiperRef.current = swiper;
    }, []);

    // ============================================
    // Empty State - No Presets
    // ============================================

    if (presetsState.presets.every((p) => p === null)) {
        return (
            <div className="mobile-dashboard-empty">
                <div className="mobile-empty-state">
                    <MdBookmarks className="w-16 h-16 text-ui-text-tertiary opacity-40 mb-4" />
                    <h2 className="text-xl font-medium text-ui-text-secondary mb-2">
                        Welcome to OlyDash
                    </h2>
                    <p className="text-sm text-ui-text-tertiary mb-6 text-center px-4">
                        Create presets to organize your widgets into different views
                    </p>
                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        <motion.button
                            onClick={handleUseStarter}
                            className="mobile-nav-button justify-center"
                            style={{ backgroundColor: "var(--ui-accent-primary)", color: "#ffffff" }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                            <MdBookmarks className="w-5 h-5" />
                            <span>Use Starter Presets</span>
                        </motion.button>
                        <motion.button
                            onClick={handleAddPreset}
                            className="mobile-nav-button justify-center"
                            style={{ backgroundColor: "var(--ui-bg-tertiary)", color: "var(--ui-text-secondary)" }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                            <MdAdd className="w-5 h-5" />
                            <span>Create Empty Preset</span>
                        </motion.button>
                    </div>
                </div>

                <PresetNameDialog
                    isOpen={presetNameDialogOpen}
                    onClose={handleClosePresetDialog}
                    onSave={handleSaveNewPreset}
                    initialName={pendingPresetName}
                    title={presetDialogTitle}
                />
            </div>
        );
    }

    // ============================================
    // Empty Preset State
    // ============================================

    if (!activePreset || enabledWidgetIds.length === 0) {
        return (
            <>
                <div className="mobile-dashboard-grid">
                    {/* Header */}
                    <div className="mobile-grid-header">
                        <div className="flex items-center gap-3">
                            <MdBookmarks className="w-5 h-5" style={{ color: "var(--ui-accent-primary)" }} />
                            <div>
                                <h1
                                    className="text-lg font-semibold"
                                    style={{ color: "var(--ui-text-primary)" }}
                                >
                                    {activePreset?.name || "No Preset"}
                                </h1>
                                <p className="text-xs" style={{ color: "var(--ui-text-muted)" }}>
                                    No widgets
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <motion.button
                                onClick={onSettingsClick}
                                className="mobile-header-button"
                                aria-label="Settings"
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            >
                                <MdSettings className="w-5 h-5" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Preset Tabs */}
                    <PresetTabs
                        presets={presetsState}
                        onPresetChange={handlePresetChange}
                        onAddPreset={handleAddPreset}
                        onRenamePreset={handleRenamePreset}
                        onDeletePreset={handleDeletePreset}
                        currentSwiperIndex={currentSwiperIndex}
                        nonNullPresetsCount={nonNullPresets.length}
                    />

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
                                <motion.button
                                    onClick={handleOpenWidgetPicker}
                                    className="px-6 py-3 rounded-xl font-medium"
                                    style={{ backgroundColor: "var(--ui-accent-primary)", color: "#ffffff" }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                >
                                    <MdAdd className="w-5 h-5 inline mr-2" />
                                    Add Widgets
                                </motion.button>
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
                            onClose={handleCloseWidgetPicker}
                        />
                    )}
                </AnimatePresence>

                <PresetNameDialog
                    isOpen={presetNameDialogOpen}
                    onClose={handleClosePresetDialog}
                    onSave={handleSaveNewPreset}
                    initialName={pendingPresetName}
                    title={presetDialogTitle}
                />
            </>
        );
    }

    // ============================================
    // Main Dashboard View
    // ============================================

    return (
        <div className="mobile-dashboard-grid">
            {/* Header */}
            <div className="mobile-grid-header">
                <div className="flex items-center gap-3">
                    <MdBookmarks className="w-5 h-5" style={{ color: "var(--ui-accent-primary)" }} />
                    <div>
                        <h1 className="text-lg font-semibold" style={{ color: "var(--ui-text-primary)" }}>
                            {activePreset.name}
                        </h1>
                        <p className="text-xs" style={{ color: "var(--ui-text-muted)" }}>
                            {enabledWidgetIds.length} widget{enabledWidgetIds.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Privacy Toggle */}
                    <motion.button
                        onClick={togglePrivacy}
                        className={`mobile-header-button ${privacySettings.enabled ? "bg-ui-accent-secondary text-white" : ""
                            }`}
                        aria-label={privacySettings.enabled ? "Disable privacy mode" : "Enable privacy mode"}
                        aria-pressed={privacySettings.enabled}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                        {privacySettings.enabled ? (
                            <MdVisibilityOff className="w-5 h-5" />
                        ) : (
                            <MdVisibility className="w-5 h-5" />
                        )}
                    </motion.button>
                    {/* Add Widget */}
                    <motion.button
                        onClick={handleOpenWidgetPicker}
                        className="mobile-header-button"
                        aria-label="Add widgets"
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                        <MdAdd className="w-5 h-5" />
                    </motion.button>
                    {/* Settings */}
                    <motion.button
                        onClick={onSettingsClick}
                        className="mobile-header-button"
                        aria-label="Settings"
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                        <MdSettings className="w-5 h-5" />
                    </motion.button>
                </div>
            </div>

            {/* Preset Tabs */}
            <PresetTabs
                presets={presetsState}
                onPresetChange={handlePresetChange}
                onAddPreset={handleAddPreset}
                onRenamePreset={handleRenamePreset}
                onDeletePreset={handleDeletePreset}
                currentSwiperIndex={currentSwiperIndex}
                nonNullPresetsCount={nonNullPresets.length}
            />

            {/* Main Content - Swiper Carousel */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <Swiper
                    onSwiper={handleSwiperInit}
                    onSlideChange={handleSlideChange}
                    onTransitionEnd={handleTransitionEnd}
                    initialSlide={currentSwiperIndex >= 0 ? currentSwiperIndex : 0}
                    spaceBetween={0}
                    slidesPerView={1}
                    speed={300}
                    followFinger={true}
                    shortSwipes={true}
                    longSwipes={true}
                    longSwipesRatio={0.25}
                    longSwipesMs={150}
                    resistance={true}
                    resistanceRatio={0.65}
                    touchRatio={1}
                    touchAngle={45}
                    threshold={5}
                    touchStartPreventDefault={false}
                    touchMoveStopPropagation={false}
                    passiveListeners={true}
                    allowTouchMove={true}
                    edgeSwipeDetection={true}
                    edgeSwipeThreshold={20}
                    modules={[Pagination]}
                    className="h-full w-full"
                >
                    {nonNullPresets.map(({ preset, index: presetIndex }) => {
                        const presetWidgetIds = preset.widgetIds.filter((id) => hasAccess(id, "view"));
                        const isActivePreset = presetIndex === presetsState.activePresetIndex;
                        const isPresetVisible = presetIndex === visiblePresetIndex;

                        return (
                            <SwiperSlide key={presetIndex} style={{ height: "100%", overflow: "hidden" }}>
                                <div
                                    className="h-full overflow-y-auto overflow-x-hidden"
                                    style={{ WebkitOverflowScrolling: "touch" }}
                                >
                                    <div className="mobile-grid-content">
                                        {presetWidgetIds.length === 0 ? (
                                            <div className="flex-1 flex items-center justify-center p-4 min-h-[300px]">
                                                <div className="text-center">
                                                    <MdWidgets className="w-16 h-16 text-ui-text-tertiary opacity-40 mb-4 mx-auto" />
                                                    <h2 className="text-lg font-medium text-ui-text-secondary mb-2">
                                                        No widgets yet
                                                    </h2>
                                                    <p className="text-sm text-ui-text-tertiary mb-6">
                                                        Add widgets to this preset
                                                    </p>
                                                    {isActivePreset && (
                                                        <motion.button
                                                            onClick={handleOpenWidgetPicker}
                                                            className="px-6 py-3 rounded-xl font-medium"
                                                            style={{
                                                                backgroundColor: "var(--ui-accent-primary)",
                                                                color: "#ffffff",
                                                            }}
                                                            whileTap={{ scale: 0.95 }}
                                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                        >
                                                            <MdAdd className="w-5 h-5 inline mr-2" />
                                                            Add Widgets
                                                        </motion.button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {isActivePreset ? (
                                                    <DraggableWidgetGrid
                                                        widgetIds={presetWidgetIds}
                                                        onReorder={handleReorder}
                                                        onWidgetClick={handleWidgetClick}
                                                        onRemoveWidget={handleRemoveWidget}
                                                        isVisible={isPresetVisible}
                                                    />
                                                ) : (
                                                    /* Non-active presets show static grid to reduce re-renders */
                                                    <div className="mobile-widget-grid">
                                                        {presetWidgetIds.map((widgetId) => (
                                                            <StaticWidgetCard
                                                                key={widgetId}
                                                                widgetId={widgetId}
                                                                isVisible={isPresetVisible}
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Add Widget hint - shown at bottom */}
                                                {isActivePreset && presetWidgetIds.length < 8 && (
                                                    <motion.button
                                                        onClick={handleOpenWidgetPicker}
                                                        className="w-full mt-4 p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2"
                                                        style={{
                                                            borderColor: "var(--ui-border-secondary)",
                                                            color: "var(--ui-text-muted)",
                                                        }}
                                                        whileTap={{ scale: 0.98 }}
                                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                    >
                                                        <MdAdd className="w-5 h-5" />
                                                        <span className="font-medium">Add Widget</span>
                                                    </motion.button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </SwiperSlide>
                        );
                    })}
                </Swiper>
            </div>

            {/* Pagination dots indicator */}
            {nonNullPresets.length > 1 && (
                <div className="flex justify-center gap-1.5 py-2" role="tablist" aria-label="Preset pages">
                    {nonNullPresets.map((_, idx) => (
                        <div
                            key={idx}
                            role="tab"
                            aria-selected={idx === currentSwiperIndex}
                            className={`w-2 h-2 rounded-full transition-all duration-200 ${idx === currentSwiperIndex ? "bg-ui-accent-primary w-4" : "bg-ui-border-secondary"
                                }`}
                        />
                    ))}
                </div>
            )}

            {/* Detail View Modal */}
            <AnimatePresence>
                {selectedWidgetId && (
                    <DetailView widgetId={selectedWidgetId} onClose={handleCloseDetailView} />
                )}
            </AnimatePresence>

            {/* Widget Picker */}
            <AnimatePresence>
                {widgetPickerOpen && (
                    <MobileWidgetPicker
                        enabledWidgetIds={enabledWidgetIds}
                        onToggleWidget={handleToggleWidget}
                        onClose={handleCloseWidgetPicker}
                    />
                )}
            </AnimatePresence>

            {/* Preset Name Dialog */}
            <PresetNameDialog
                isOpen={presetNameDialogOpen}
                onClose={handleClosePresetDialog}
                onSave={handleSaveNewPreset}
                initialName={pendingPresetName}
                title={presetDialogTitle}
            />
        </div>
    );
}
