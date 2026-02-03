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
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer } from "vaul";
import { getWidgetById } from "@/constants/widgets";

// Swiper - native-feeling carousel
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/pagination";

// dnd-kit for drag and drop
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
    MdDragIndicator,
    MdArrowUpward,
    MdArrowDownward,
    MdRemove,
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
// Widget Complication Previews
// Each widget can have a custom preview component
// ============================================

interface ComplicationPreviewProps {
    data: {
        value?: string;
        label?: string;
        trend?: 'up' | 'down' | 'neutral';
        trendValue?: string;
        status?: 'good' | 'warning' | 'error' | 'neutral';
        secondaryValue?: string;
        icon?: string;
        chartData?: number[];
    };
}

// --- Clock Preview: Live analog clock ---
const ClockPreview = memo(function ClockPreview({ data }: ComplicationPreviewProps) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const hours = time.getHours() % 12;
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();

    const hourDeg = (hours * 30) + (minutes * 0.5);
    const minuteDeg = minutes * 6;
    const secondDeg = seconds * 6;

    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="relative w-16 h-16">
                {/* Face */}
                <div
                    className="absolute inset-0 rounded-full border-2"
                    style={{
                        borderColor: 'var(--ui-border-primary)',
                        background: 'var(--ui-bg-primary)'
                    }}
                />
                {/* Hour markers */}
                {[0, 90, 180, 270].map((deg) => (
                    <div
                        key={deg}
                        className="absolute w-0.5 h-1.5 left-1/2"
                        style={{
                            background: 'var(--ui-text-muted)',
                            top: '4px',
                            transformOrigin: 'center 28px',
                            transform: `translateX(-50%) rotate(${deg}deg)`,
                        }}
                    />
                ))}
                {/* Hour hand */}
                <div
                    className="absolute w-1 h-4 rounded-full left-1/2 top-1/2 origin-bottom"
                    style={{
                        background: 'var(--ui-text-primary)',
                        transform: `translateX(-50%) translateY(-100%) rotate(${hourDeg}deg)`
                    }}
                />
                {/* Minute hand */}
                <div
                    className="absolute w-0.5 h-5 rounded-full left-1/2 top-1/2 origin-bottom"
                    style={{
                        background: 'var(--ui-text-secondary)',
                        transform: `translateX(-50%) translateY(-100%) rotate(${minuteDeg}deg)`
                    }}
                />
                {/* Second hand */}
                <div
                    className="absolute w-px h-5 rounded-full left-1/2 top-1/2 origin-bottom"
                    style={{
                        background: 'var(--ui-accent-primary)',
                        transform: `translateX(-50%) translateY(-100%) rotate(${secondDeg}deg)`
                    }}
                />
                {/* Center */}
                <div
                    className="absolute w-2 h-2 rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ background: 'var(--ui-text-primary)' }}
                />
            </div>
        </div>
    );
});

// --- Date Preview: Calendar page style ---
const DatePreview = memo(function DatePreview({ data }: ComplicationPreviewProps) {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const dayNum = now.getDate();
    const month = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="relative w-14 h-16 rounded-lg overflow-hidden" style={{ boxShadow: '0 4px 12px var(--shadow-dark)' }}>
                {/* Header */}
                <div
                    className="h-5 flex items-center justify-center"
                    style={{ background: 'var(--ui-danger)' }}
                >
                    <span className="text-[9px] font-bold text-white tracking-wider">{dayName}</span>
                </div>
                {/* Body */}
                <div
                    className="h-11 flex flex-col items-center justify-center"
                    style={{ background: 'var(--ui-bg-tertiary)' }}
                >
                    <span className="text-2xl font-bold leading-none" style={{ color: 'var(--ui-text-primary)' }}>{dayNum}</span>
                    <span className="text-[8px] font-semibold tracking-wider" style={{ color: 'var(--ui-text-muted)' }}>{month}</span>
                </div>
            </div>
        </div>
    );
});

// --- Gauge Preview: Circular progress for humidity/percentages ---
const GaugePreview = memo(function GaugePreview({ data }: ComplicationPreviewProps) {
    const numericMatch = data.value?.match(/(\d+)/);
    const percentage = numericMatch ? Math.min(100, Math.max(0, parseInt(numericMatch[1], 10))) : 50;

    const radius = 26;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const getColor = () => {
        if (data.status === 'warning') return 'var(--ui-warning)';
        if (data.status === 'error') return 'var(--ui-danger)';
        if (data.status === 'good') return 'var(--ui-success)';
        return 'var(--ui-accent-primary)';
    };

    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="relative w-16 h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r={radius} fill="none" stroke="var(--ui-bg-tertiary)" strokeWidth="4" />
                    <circle
                        cx="30" cy="30" r={radius}
                        fill="none"
                        stroke={getColor()}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold tabular-nums" style={{ color: getColor() }}>{data.value}</span>
                    {data.label && <span className="text-[8px] font-medium" style={{ color: 'var(--ui-text-muted)' }}>{data.label}</span>}
                </div>
            </div>
        </div>
    );
});

// --- Default Text Preview: Standard value + label + trend ---
const DefaultPreview = memo(function DefaultPreview({ data }: ComplicationPreviewProps) {
    const getTrendColor = () => {
        if (data.trend === 'up') return 'var(--ui-success-text)';
        if (data.trend === 'down') return 'var(--ui-danger-text)';
        return 'var(--ui-text-muted)';
    };

    const getValueColor = () => {
        if (data.status === 'warning') return 'var(--ui-warning-text)';
        if (data.status === 'error') return 'var(--ui-danger-text)';
        if (data.status === 'good') return 'var(--ui-success-text)';
        return 'var(--ui-text-primary)';
    };

    return (
        <div className="flex-1 flex flex-col justify-end">
            {/* Main Value */}
            <span
                className="text-[1.75rem] font-bold tracking-tight leading-none tabular-nums"
                style={{ color: getValueColor() }}
            >
                {data.value}
            </span>

            {/* Footer: Label + Trend */}
            <div className="flex items-center gap-2 mt-1">
                {data.label && (
                    <span className="text-[11px] font-medium" style={{ color: 'var(--ui-text-muted)' }}>
                        {data.label}
                    </span>
                )}
                {data.trend && data.trendValue && (
                    <span
                        className="text-[11px] font-bold flex items-center gap-0.5"
                        style={{ color: getTrendColor() }}
                    >
                        {data.trend === 'up' ? <MdArrowUpward className="w-3 h-3" /> :
                            data.trend === 'down' ? <MdArrowDownward className="w-3 h-3" /> : null}
                        {data.trendValue}
                    </span>
                )}
            </div>
        </div>
    );
});

// --- YTD Sales Preview: Robinhood-style ---
const SalesYTDPreview = memo(function SalesYTDPreview({ data }: ComplicationPreviewProps) {
    const isPositive = !data.trend || data.trend === 'up' || data.trend === 'neutral';
    const trendColor = isPositive ? 'var(--ui-success)' : 'var(--ui-danger)';

    // Generate SVG path from real chart data
    const chartPath = useMemo(() => {
        const points = data.chartData;
        if (!points || points.length < 2) return null;

        const width = 100;
        const height = 32;
        const maxVal = Math.max(...points);
        const minVal = Math.min(...points);
        const range = maxVal - minVal || 1;

        const linePoints = points.map((val, i) => {
            const x = (i / (points.length - 1)) * width;
            const y = height - ((val - minVal) / range) * (height - 4) - 2;
            return `${x},${y}`;
        });

        const linePath = `M${linePoints.join(' L')}`;
        const areaPath = `${linePath} L100,${height} L0,${height} Z`;

        return { linePath, areaPath, endY: linePoints[linePoints.length - 1].split(',')[1] };
    }, [data.chartData]);

    return (
        <div className="flex-1 flex flex-col">
            {/* Value row */}
            <div className="flex items-baseline gap-1.5">
                <span
                    className="text-[22px] font-semibold tracking-tight leading-none tabular-nums"
                    style={{ color: 'var(--ui-text-primary)' }}
                >
                    {data.value}
                </span>
                {data.delta && (
                    <span
                        className="text-xs font-medium tabular-nums"
                        style={{ color: trendColor }}
                    >
                        {data.delta}
                    </span>
                )}
            </div>

            {/* Sparkline fills remaining space */}
            <div className="relative flex-1 min-h-[28px] mt-1.5 -mx-1">
                {chartPath ? (
                    <svg
                        className="absolute inset-0 w-full h-full"
                        viewBox="0 0 100 32"
                        preserveAspectRatio="none"
                    >
                        <defs>
                            <linearGradient id="rhGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={trendColor} stopOpacity="0.15" />
                                <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d={chartPath.areaPath} fill="url(#rhGradient)" />
                        <path
                            d={chartPath.linePath}
                            fill="none"
                            stroke={trendColor}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                ) : (
                    <div
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                        style={{ background: 'var(--ui-border-secondary)' }}
                    />
                )}
            </div>
        </div>
    );
});

// --- Preview Registry: Maps widget IDs to their custom preview components ---
const WIDGET_PREVIEWS: Record<string, React.ComponentType<ComplicationPreviewProps>> = {
    ClockWidget: ClockPreview,
    DateWidget: DatePreview,
    Humidity: GaugePreview,
    FanController: GaugePreview,
    SalesYTDCumulativeLine: SalesYTDPreview,
};

// --- Main Complication Component ---
interface WidgetComplicationProps {
    widgetId: string;
    isVisible?: boolean;
    title: string;
    Icon: React.ComponentType<{ className?: string }>;
}

const WidgetComplication = memo(function WidgetComplication({ widgetId, isVisible = true, title, Icon }: WidgetComplicationProps) {
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

const SortableWidgetCard = memo(function SortableWidgetCard({
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
        opacity: isDragging ? 0.3 : 1, // Dim when dragging
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
            {/* 
               Pass header info down to complication for integrated layout 
               The 'mobile-widget-card' CSS class handles the container look (background/border)
            */}
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
// ============================================});

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

const SortableWidgetGrid = memo(function SortableWidgetGrid({
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
// Detail View (Full Screen Widget) - Using Vaul Drawer
// ============================================

interface DetailViewProps {
    isOpen: boolean;
    widgetId: string | null;
    onClose: () => void;
}

const DetailView = memo(function DetailView({ isOpen, widgetId, onClose }: DetailViewProps) {
    const widgetDef = widgetId ? getWidgetById(widgetId) : null;
    const config = widgetId ? getWidgetConfig(widgetId) : null;
    const [settingsOpen, setSettingsOpen] = useState(false);
    const hasSettings = widgetId ? getWidgetSettingsSchema(widgetId) !== null : false;
    const title = widgetDef?.title || config?.title || widgetId || '';

    const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
    const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);

    const handleOpenChange = useCallback((open: boolean) => {
        if (!open) {
            onClose();
        }
    }, [onClose]);

    return (
        <>
            <Drawer.Root
                open={isOpen}
                onOpenChange={handleOpenChange}
                shouldScaleBackground={false}
            >
                <Drawer.Portal>
                    <Drawer.Overlay
                        className="fixed inset-0 z-50 bg-black/60"
                    />
                    <Drawer.Content
                        className="fixed inset-x-0 bottom-0 z-50 flex flex-col outline-none"
                        style={{
                            top: "env(safe-area-inset-top, 0px)",
                            backgroundColor: "var(--ui-bg-primary)",
                            borderTopLeftRadius: "0.75rem",
                            borderTopRightRadius: "0.75rem",
                        }}
                        aria-label={`${title} widget details`}
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <Drawer.Handle
                                className="w-10 h-1 rounded-full"
                                style={{ backgroundColor: "var(--ui-border-secondary)" }}
                            />
                        </div>

                        {/* Header */}
                        <div
                            className="flex items-center gap-3 px-3 pb-2 border-b flex-shrink-0"
                            style={{ borderColor: "var(--ui-border-primary)" }}
                        >
                            {/* Settings button - left side */}
                            {hasSettings ? (
                                <button
                                    onClick={handleOpenSettings}
                                    className="p-1.5 -ml-1 rounded-full transition-colors active:scale-95"
                                    style={{ color: "var(--ui-text-secondary)" }}
                                    aria-label="Widget Settings"
                                >
                                    <MdTune className="w-5 h-5" />
                                </button>
                            ) : (
                                <div className="w-8" />
                            )}

                            {/* Title - centered */}
                            <Drawer.Title className="flex-1 min-w-0 text-center">
                                <span
                                    className="text-base font-semibold truncate leading-tight block"
                                    style={{ color: "var(--ui-text-primary)" }}
                                >
                                    {title}
                                </span>
                            </Drawer.Title>

                            {/* Close button - right side */}
                            <Drawer.Close asChild>
                                <button
                                    className="p-1.5 -mr-1 rounded-full transition-colors active:scale-95"
                                    style={{ color: "var(--ui-text-secondary)" }}
                                    aria-label="Close"
                                >
                                    <MdClose className="w-5 h-5" />
                                </button>
                            </Drawer.Close>
                        </div>

                        {/* Widget Content - maximized space */}
                        <div
                            className="flex-1 overflow-auto"
                            style={{
                                padding: "0.75rem",
                                paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))"
                            }}
                        >
                            {widgetDef && (
                                <WidgetErrorBoundary widgetName={widgetDef.title || widgetDef.id}>
                                    <Suspense
                                        fallback={
                                            <div className="flex items-center justify-center h-48">
                                                <Loader />
                                            </div>
                                        }
                                    >
                                        <div className="h-full w-full">
                                            <widgetDef.component />
                                        </div>
                                    </Suspense>
                                </WidgetErrorBoundary>
                            )}
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {hasSettings && widgetId && (
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
// Mobile Widget Picker - Using Vaul Drawer
// ============================================

interface MobileWidgetPickerProps {
    isOpen: boolean;
    enabledWidgetIds: string[];
    onToggleWidget: (widgetId: string) => void;
    onClose: () => void;
}

const MobileWidgetPicker = memo(function MobileWidgetPicker({
    isOpen,
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

    const handleOpenChange = useCallback((open: boolean) => {
        if (!open) {
            onClose();
        }
    }, [onClose]);

    return (
        <Drawer.Root
            open={isOpen}
            onOpenChange={handleOpenChange}
            shouldScaleBackground={false}
        >
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
                <Drawer.Content
                    className="fixed inset-x-0 bottom-0 z-50 flex flex-col outline-none"
                    style={{
                        top: "env(safe-area-inset-top, 0px)",
                        backgroundColor: "var(--ui-bg-primary)",
                        borderTopLeftRadius: "0.75rem",
                        borderTopRightRadius: "0.75rem",
                    }}
                    aria-label="Add widgets"
                >
                    {/* Drag handle */}
                    <div className="flex justify-center pt-3 pb-2">
                        <Drawer.Handle
                            className="w-10 h-1 rounded-full"
                            style={{ backgroundColor: "var(--ui-border-secondary)" }}
                        />
                    </div>

                    {/* Header */}
                    <div
                        className="flex-shrink-0 border-b"
                        style={{ borderColor: "var(--ui-border-primary)" }}
                    >
                        <div className="px-4 pb-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <MdWidgets className="w-5 h-5" style={{ color: "var(--ui-accent-primary)" }} />
                                <div>
                                    <Drawer.Title
                                        className="text-lg font-semibold"
                                        style={{ color: "var(--ui-text-primary)" }}
                                    >
                                        Add Widgets
                                    </Drawer.Title>
                                    <p className="text-xs" style={{ color: "var(--ui-text-muted)" }}>
                                        {enabledSet.size} selected
                                    </p>
                                </div>
                            </div>
                            <Drawer.Close asChild>
                                <button
                                    className="p-2 rounded-lg active:scale-95 transition-transform"
                                    style={{ color: "var(--ui-text-secondary)" }}
                                    aria-label="Close"
                                >
                                    <MdClose className="w-5 h-5" />
                                </button>
                            </Drawer.Close>
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
                        <Drawer.Close asChild>
                            <motion.button
                                className="w-full py-3 rounded-xl font-semibold"
                                style={{ backgroundColor: "var(--ui-accent-primary)", color: "#ffffff" }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            >
                                Done
                            </motion.button>
                        </Drawer.Close>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
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

    const handleOpenChange = useCallback((open: boolean) => {
        if (!open) {
            onClose();
        }
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <Drawer.Root
            open={isOpen}
            onOpenChange={handleOpenChange}
            shouldScaleBackground={false}
        >
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/60" />
                <Drawer.Content
                    className="fixed inset-x-0 bottom-0 z-[100] flex flex-col outline-none p-4"
                    style={{
                        backgroundColor: "var(--ui-bg-primary)",
                        borderTopLeftRadius: "1rem",
                        borderTopRightRadius: "1rem",
                        paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
                    }}
                    aria-label={title}
                >
                    {/* Drag handle */}
                    <div className="flex justify-center pt-1 pb-4">
                        <Drawer.Handle
                            className="w-10 h-1 rounded-full"
                            style={{ backgroundColor: "var(--ui-border-secondary)" }}
                        />
                    </div>

                    <Drawer.Title
                        className="text-lg font-semibold mb-4"
                        style={{ color: "var(--ui-text-primary)" }}
                    >
                        {title}
                    </Drawer.Title>
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
                        <Drawer.Close asChild>
                            <motion.button
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
                        </Drawer.Close>
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
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
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

    // *** Drag state - controls swiper blocking ***
    const [isWidgetDragging, setIsWidgetDragging] = useState(false);

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

    // Handle drag state changes - block swiper when dragging
    const handleDragStateChange = useCallback((isDragging: boolean) => {
        setIsWidgetDragging(isDragging);
        // Disable/enable swiper touch when drag state changes
        if (swiperRef.current) {
            swiperRef.current.allowTouchMove = !isDragging;
        }
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
                <MobileWidgetPicker
                    isOpen={widgetPickerOpen}
                    enabledWidgetIds={enabledWidgetIds}
                    onToggleWidget={handleToggleWidget}
                    onClose={handleCloseWidgetPicker}
                />

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
                    {/* Icon - simple crossfade without layout shift */}
                    <div className="relative w-5 h-5">
                        <MdBookmarks
                            className="w-5 h-5 absolute inset-0 transition-opacity duration-200"
                            style={{
                                color: "var(--ui-accent-primary)",
                                opacity: isWidgetDragging ? 0 : 1
                            }}
                        />
                        <MdDragIndicator
                            className="w-5 h-5 absolute inset-0 transition-opacity duration-200"
                            style={{
                                color: "var(--ui-accent-primary)",
                                opacity: isWidgetDragging ? 1 : 0
                            }}
                        />
                    </div>
                    <div>
                        <h1
                            className="text-lg font-semibold transition-opacity duration-200"
                            style={{ color: "var(--ui-text-primary)" }}
                        >
                            {isWidgetDragging ? "Editing Layout" : activePreset.name}
                        </h1>
                        <p
                            className="text-xs transition-opacity duration-200"
                            style={{ color: "var(--ui-text-muted)" }}
                        >
                            {isWidgetDragging
                                ? "Drag to reorder"
                                : `${enabledWidgetIds.length} widget${enabledWidgetIds.length !== 1 ? "s" : ""}`
                            }
                        </p>
                    </div>
                </div>

                {/* Header buttons - single container animation */}
                <div
                    className="flex items-center gap-2 transition-all duration-200 ease-out"
                    style={{
                        opacity: isWidgetDragging ? 0 : 1,
                        transform: isWidgetDragging ? 'scale(0.9)' : 'scale(1)',
                        pointerEvents: isWidgetDragging ? 'none' : 'auto',
                    }}
                >
                    {/* Privacy Toggle */}
                    <motion.button
                        onClick={togglePrivacy}
                        className={`mobile-header-button ${privacySettings.enabled ? "bg-ui-accent-secondary text-white" : ""}`}
                        aria-label={privacySettings.enabled ? "Disable privacy mode" : "Enable privacy mode"}
                        aria-pressed={privacySettings.enabled}
                        whileTap={{ scale: 0.9 }}
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
                    >
                        <MdAdd className="w-5 h-5" />
                    </motion.button>

                    {/* Settings */}
                    <motion.button
                        onClick={onSettingsClick}
                        className="mobile-header-button"
                        aria-label="Settings"
                        whileTap={{ scale: 0.9 }}
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
                    followFinger={!isWidgetDragging}
                    shortSwipes={!isWidgetDragging}
                    longSwipes={!isWidgetDragging}
                    longSwipesRatio={0.25}
                    longSwipesMs={150}
                    resistance={true}
                    resistanceRatio={0.65}
                    touchRatio={1}
                    touchAngle={45}
                    threshold={5}
                    touchStartPreventDefault={false}
                    touchMoveStopPropagation={isWidgetDragging}
                    passiveListeners={!isWidgetDragging}
                    allowTouchMove={!isWidgetDragging}
                    edgeSwipeDetection={!isWidgetDragging}
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
                                                    <SortableWidgetGrid
                                                        widgetIds={presetWidgetIds}
                                                        onReorder={handleReorder}
                                                        onWidgetClick={handleWidgetClick}
                                                        onRemoveWidget={handleRemoveWidget}
                                                        onDragStateChange={handleDragStateChange}
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
            <DetailView
                isOpen={!!selectedWidgetId}
                widgetId={selectedWidgetId}
                onClose={handleCloseDetailView}
            />

            {/* Widget Picker */}
            <MobileWidgetPicker
                isOpen={widgetPickerOpen}
                enabledWidgetIds={enabledWidgetIds}
                onToggleWidget={handleToggleWidget}
                onClose={handleCloseWidgetPicker}
            />

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
