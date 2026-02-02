/**
 * FanController Widget - AC Infinity Controller
 * 
 * Responsive 3-view design:
 * - Small: Compact monitoring (temp, humidity, VPD, fan speeds)
 * - Medium: Expandable ports with touch-friendly control panels
 * - Large: Full dashboard with all ports and controls visible
 * 
 * Uses shared ACInfinityContext to avoid duplicate API calls across widget instances.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Widget from "./Widget";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";
import { useWidgetSettingsDialog } from "@/contexts/WidgetSettingsDialogContext";
import { useACInfinity, ACInfinityController, ACInfinityPort, PortSettings, TempUnit } from "@/contexts/ACInfinityContext";
import {
    Fan, Thermometer, Droplets, Leaf, AlertCircle, RefreshCw, Settings,
    Power, Activity, Wind, Minus, Plus, X, ChevronRight, Check
} from "lucide-react";

const WIDGET_TYPE = "FanController";

// =============================================================================
// TYPES (Types imported from ACInfinityContext, local types below)
// =============================================================================

type ViewSize = 'small' | 'medium' | 'large';

const MODES = [
    { id: 1, name: "Off", shortName: "OFF", icon: Power, color: 'var(--ui-text-muted)' },
    { id: 2, name: "On", shortName: "ON", icon: Wind, color: 'var(--ui-accent-primary)' },
    { id: 3, name: "Auto", shortName: "AUTO", icon: Activity, color: 'var(--ui-success)' },
    { id: 8, name: "VPD", shortName: "VPD", icon: Leaf, color: 'var(--chart-3)' },
] as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getModeColor = (mode: number): string => {
    return MODES.find(m => m.id === mode)?.color || 'var(--ui-text-muted)';
};

const getModeInfo = (mode: number) => {
    return MODES.find(m => m.id === mode) || MODES[0];
};

const getVpdColor = (vpd: number): string => {
    if (vpd < 0.4) return "var(--ui-info)";
    if (vpd < 1.2) return "var(--ui-success)";
    if (vpd < 1.6) return "var(--ui-warning)";
    return "var(--ui-danger)";
};

// Temperature conversion utilities
const celsiusToFahrenheit = (c: number): number => (c * 9 / 5) + 32;
const fahrenheitToCelsius = (f: number): number => (f - 32) * 5 / 9;

const formatTemp = (tempF: number, unit: TempUnit): string => {
    if (unit === 'C') {
        return Math.round(fahrenheitToCelsius(tempF)).toString();
    }
    return Math.round(tempF).toString();
};

const getTempUnit = (unit: TempUnit): string => unit === 'C' ? '°C' : '°F';

// =============================================================================
// SMALL VIEW - Compact Monitoring Only
// =============================================================================

interface SmallViewProps {
    controller: ACInfinityController;
    ports: ACInfinityPort[];
    portSettings: Record<number, PortSettings>;
    name: string;
    tempUnit: TempUnit;
    showTemperature: boolean;
    showHumidity: boolean;
    showVPD: boolean;
    enableAnimations: boolean;
}

const SmallView: React.FC<SmallViewProps> = ({
    controller, ports, portSettings, name, tempUnit,
    showTemperature, showHumidity, showVPD, enableAnimations
}) => {
    const vpdColor = getVpdColor(controller.vpd);

    // Calculate overall fan status
    const activePorts = ports.filter(p => {
        const ps = portSettings[p.portIndex];
        const mode = ps?.mode ?? p.currentMode ?? 2;
        return mode !== 1 && (p.currentPower ?? 0) > 0;
    });
    const avgSpeed = activePorts.length > 0
        ? Math.round(activePorts.reduce((sum, p) => sum + (p.currentPower ?? 0), 0) / activePorts.length)
        : 0;
    const isRunning = avgSpeed > 0;

    // Count how many readings we're showing
    const readings = [
        showTemperature,
        showHumidity,
        showVPD && controller.vpd > 0
    ].filter(Boolean).length;

    return (
        <div className="flex flex-col h-full w-full p-3">
            {/* Top: Fan speed - large and prominent */}
            <div className="flex-1 flex items-center justify-center gap-4">
                <Fan
                    className={`w-16 h-16 ${enableAnimations && isRunning ? 'animate-spin' : ''}`}
                    style={{
                        color: isRunning ? 'var(--ui-accent-primary)' : 'var(--ui-text-muted)',
                        animationDuration: '1s'
                    }}
                />
                <span className="text-5xl font-black tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                    {isRunning ? `${avgSpeed * 10}%` : 'OFF'}
                </span>
            </div>

            {/* Bottom: Sensor readings row */}
            <div
                className="flex items-center justify-around py-2 rounded-xl"
                style={{ backgroundColor: 'var(--ui-bg-secondary)' }}
            >
                {showTemperature && (
                    <div className="flex flex-col items-center">
                        <Thermometer className="w-6 h-6 mb-1" style={{ color: 'var(--ui-warning)' }} />
                        <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                            {formatTemp(controller.temperatureF, tempUnit)}°
                        </span>
                    </div>
                )}
                {showHumidity && (
                    <div className="flex flex-col items-center">
                        <Droplets className="w-6 h-6 mb-1" style={{ color: 'var(--ui-info)' }} />
                        <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                            {controller.humidity.toFixed(0)}%
                        </span>
                    </div>
                )}
                {showVPD && controller.vpd > 0 && (
                    <div className="flex flex-col items-center">
                        <Leaf className="w-6 h-6 mb-1" style={{ color: vpdColor }} />
                        <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                            {controller.vpd.toFixed(2)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// =============================================================================
// MONITORING VIEW - Large readable metrics, no controls
// =============================================================================

interface MonitoringViewProps {
    controller: ACInfinityController;
    ports: ACInfinityPort[];
    portSettings: Record<number, PortSettings>;
    name: string;
    tempUnit: TempUnit;
    showTemperature: boolean;
    showHumidity: boolean;
    showVPD: boolean;
    enableAnimations: boolean;
    size: { w: number; h: number };
}

const MonitoringView: React.FC<MonitoringViewProps> = ({
    controller, ports, portSettings, name, tempUnit,
    showTemperature, showHumidity, showVPD, enableAnimations, size
}) => {
    const vpdColor = getVpdColor(controller.vpd);

    // Calculate overall fan status
    const activePorts = ports.filter(p => {
        const ps = portSettings[p.portIndex];
        const mode = ps?.mode ?? p.currentMode ?? 2;
        return mode !== 1 && (p.currentPower ?? 0) > 0;
    });
    const avgSpeed = activePorts.length > 0
        ? Math.round(activePorts.reduce((sum, p) => sum + (p.currentPower ?? 0), 0) / activePorts.length)
        : 0;
    const isRunning = avgSpeed > 0;

    // Responsive sizing based on widget dimensions
    const isCompact = size.h < 250 || size.w < 350;
    const isLarge = size.h >= 400 && size.w >= 450;

    // Scale metrics based on available space
    const fanIconSize = isCompact ? 'w-12 h-12' : isLarge ? 'w-24 h-24' : 'w-16 h-16';
    const speedTextSize = isCompact ? 'text-4xl' : isLarge ? 'text-7xl' : 'text-5xl';
    const metricIconSize = isCompact ? 'w-6 h-6' : isLarge ? 'w-10 h-10' : 'w-8 h-8';
    const metricTextSize = isCompact ? 'text-2xl' : isLarge ? 'text-5xl' : 'text-3xl';
    const labelSize = isCompact ? 'text-[9px]' : isLarge ? 'text-sm' : 'text-xs';
    const padding = isCompact ? 'p-2' : isLarge ? 'p-6' : 'p-4';
    const gap = isCompact ? 'gap-2' : isLarge ? 'gap-6' : 'gap-4';

    // Count visible metrics for layout
    const visibleMetrics = [showTemperature, showHumidity, showVPD && controller.vpd > 0].filter(Boolean).length;
    const showPortSpeeds = ports.length > 1 && size.h >= 300;

    return (
        <div className={`flex flex-col h-full w-full ${padding} ${gap}`}>
            {/* Header - Name and status (always visible in monitoring mode) */}
            <div className="flex items-center justify-between flex-shrink-0">
                <span className={`font-bold ${isCompact ? 'text-lg' : isLarge ? 'text-2xl' : 'text-xl'} truncate`} style={{ color: 'var(--ui-text-primary)' }}>
                    {name}
                </span>
                {!isCompact && (
                    <span
                        className={`${labelSize} px-2 py-0.5 rounded-full font-medium flex-shrink-0`}
                        style={{ backgroundColor: 'var(--ui-success-bg)', color: 'var(--ui-success)' }}
                    >
                        Online
                    </span>
                )}
            </div>

            {/* Main Content - Fan speed large and centered */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                <div className="flex items-center justify-center gap-4">
                    <Fan
                        className={`${fanIconSize} ${enableAnimations && isRunning ? 'animate-spin' : ''}`}
                        style={{
                            color: isRunning ? 'var(--ui-accent-primary)' : 'var(--ui-text-muted)',
                            animationDuration: '1s'
                        }}
                    />
                    <span className={`${speedTextSize} font-black tabular-nums`} style={{ color: 'var(--ui-text-primary)' }}>
                        {isRunning ? `${avgSpeed * 10}%` : 'OFF'}
                    </span>
                </div>

                {/* Individual port speeds - shown if multiple ports and enough space */}
                {showPortSpeeds && (
                    <div className={`flex items-center justify-center ${size.w >= 350 ? 'flex-row gap-4 mt-4' : 'flex-col gap-3 mt-3'}`}>
                        {ports.map(port => {
                            const ps = portSettings[port.portIndex];
                            const mode = ps?.mode ?? port.currentMode ?? 2;
                            const speed = port.currentPower ?? 0;
                            const portRunning = mode !== 1 && speed > 0;
                            const fillPercent = speed * 10; // speed is 0-10, convert to 0-100%
                            return (
                                <div
                                    key={port.portIndex}
                                    className={`relative overflow-hidden ${isLarge ? 'px-4 py-2.5' : 'px-3 py-1.5'} rounded-xl border`}
                                    style={{
                                        backgroundColor: 'var(--ui-bg-primary)',
                                        borderColor: portRunning ? 'var(--ui-accent-primary)' : 'var(--ui-border-primary)'
                                    }}
                                >
                                    {/* Fill meter background */}
                                    <div
                                        className="absolute inset-0 transition-all duration-300 ease-out"
                                        style={{
                                            width: `${fillPercent}%`,
                                            backgroundColor: portRunning ? 'var(--ui-accent-primary)' : 'transparent',
                                            opacity: 0.35,
                                        }}
                                    />
                                    {/* Content */}
                                    <div className={`relative flex items-center ${isLarge ? 'gap-2.5' : 'gap-1'}`}>
                                        <Fan
                                            className={`${isLarge ? 'w-6 h-6' : 'w-5 h-5'} ${enableAnimations && portRunning ? 'animate-spin' : ''} drop-shadow-sm`}
                                            style={{
                                                color: portRunning ? 'var(--ui-accent-primary)' : 'var(--ui-text-muted)',
                                                animationDuration: '1s'
                                            }}
                                        />
                                        <span className={`${isLarge ? 'text-base' : 'text-sm'} font-semibold drop-shadow-sm`} style={{ color: 'var(--ui-text-primary)' }}>
                                            {port.portName.length > 10 ? port.portName.substring(0, 10) + '…' : port.portName}
                                        </span>
                                        <span className={`${isLarge ? 'text-xl' : 'text-base'} font-black tabular-nums drop-shadow-sm`} style={{ color: 'var(--ui-text-primary)' }}>
                                            {portRunning ? `${fillPercent}%` : 'OFF'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Sensor Readings - Large and prominent */}
            {visibleMetrics > 0 && (
                <div
                    className={`flex items-center justify-around ${isCompact ? 'py-2 px-2' : isLarge ? 'py-5 px-6' : 'py-3 px-4'} rounded-xl flex-shrink-0`}
                    style={{ backgroundColor: 'var(--ui-bg-secondary)' }}
                >
                    {showTemperature && (
                        <div className="flex flex-col items-center gap-1">
                            <Thermometer className={metricIconSize} style={{ color: 'var(--ui-warning)' }} />
                            <span className={`${metricTextSize} font-bold tabular-nums`} style={{ color: 'var(--ui-text-primary)' }}>
                                {formatTemp(controller.temperatureF, tempUnit)}°
                            </span>
                            {!isCompact && (
                                <span className={`${labelSize} font-medium uppercase tracking-wide`} style={{ color: 'var(--ui-text-muted)' }}>
                                    Temp
                                </span>
                            )}
                        </div>
                    )}
                    {showTemperature && showHumidity && !isCompact && (
                        <div className={`w-px ${isLarge ? 'h-16' : 'h-12'}`} style={{ backgroundColor: 'var(--ui-bg-tertiary)' }} />
                    )}
                    {showHumidity && (
                        <div className="flex flex-col items-center gap-1">
                            <Droplets className={metricIconSize} style={{ color: 'var(--ui-info)' }} />
                            <span className={`${metricTextSize} font-bold tabular-nums`} style={{ color: 'var(--ui-text-primary)' }}>
                                {controller.humidity.toFixed(0)}%
                            </span>
                            {!isCompact && (
                                <span className={`${labelSize} font-medium uppercase tracking-wide`} style={{ color: 'var(--ui-text-muted)' }}>
                                    Humidity
                                </span>
                            )}
                        </div>
                    )}
                    {showVPD && controller.vpd > 0 && (
                        <>
                            {(showTemperature || showHumidity) && !isCompact && (
                                <div className={`w-px ${isLarge ? 'h-16' : 'h-12'}`} style={{ backgroundColor: 'var(--ui-bg-tertiary)' }} />
                            )}
                            <div className="flex flex-col items-center gap-1">
                                <Leaf className={metricIconSize} style={{ color: vpdColor }} />
                                <span className={`${metricTextSize} font-bold tabular-nums`} style={{ color: 'var(--ui-text-primary)' }}>
                                    {controller.vpd.toFixed(2)}
                                </span>
                                {!isCompact && (
                                    <span className={`${labelSize} font-medium uppercase tracking-wide`} style={{ color: 'var(--ui-text-muted)' }}>
                                        VPD
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

// =============================================================================
// SPEED SLIDER - Touch-friendly
// =============================================================================

interface SpeedSliderProps {
    speed: number;           // Configured speed (for control)
    displaySpeed?: number;   // Actual running speed (for display) - if provided, shows this in meter
    onChange: (speed: number) => void;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const SpeedSlider: React.FC<SpeedSliderProps> = ({ speed, displaySpeed, onChange, disabled, size = 'md' }) => {
    const barRef = useRef<HTMLDivElement>(null);
    const heights = { sm: 'h-8', md: 'h-10', lg: 'h-12' };
    const btnSizes = { sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-11 h-11' };
    const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };

    // Use displaySpeed for meter visualization if provided, otherwise use configured speed
    const meterSpeed = displaySpeed ?? speed;

    const handleInteraction = useCallback((clientX: number) => {
        if (disabled || !barRef.current) return;
        const rect = barRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        onChange(Math.round(percentage * 10));
    }, [disabled, onChange]);

    return (
        <div className="flex items-center gap-2 w-full">
            {!disabled && (
                <button
                    onClick={() => onChange(Math.max(0, speed - 1))}
                    disabled={speed <= 0}
                    className={`${btnSizes[size]} rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 flex-shrink-0`}
                    style={{ backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--ui-text-primary)' }}
                >
                    <Minus className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
                </button>
            )}
            <div
                ref={barRef}
                onPointerDown={(e) => {
                    if (disabled) return;
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    handleInteraction(e.clientX);
                }}
                onPointerMove={(e) => {
                    if (e.buttons !== 1 || disabled) return;
                    handleInteraction(e.clientX);
                }}
                className={`relative flex-1 ${heights[size]} rounded-lg overflow-hidden ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
                style={{ backgroundColor: 'var(--ui-bg-tertiary)', touchAction: 'none' }}
            >
                <div
                    className="absolute inset-y-0 left-0 transition-all duration-100 rounded-lg"
                    style={{
                        width: `${(meterSpeed / 10) * 100}%`,
                        backgroundColor: meterSpeed > 0 ? 'var(--ui-accent-primary)' : 'transparent',
                        opacity: disabled ? 0.6 : 1,
                    }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`${textSizes[size]} font-bold tabular-nums`} style={{
                        color: meterSpeed > 0 ? 'white' : 'var(--ui-text-muted)',
                        textShadow: meterSpeed > 0 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                    }}>
                        {meterSpeed === 0 ? 'OFF' : `${meterSpeed * 10}%`}
                    </span>
                </div>
            </div>
            {!disabled && (
                <button
                    onClick={() => onChange(Math.min(10, speed + 1))}
                    disabled={speed >= 10}
                    className={`${btnSizes[size]} rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 flex-shrink-0`}
                    style={{ backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--ui-text-primary)' }}
                >
                    <Plus className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
                </button>
            )}
        </div>
    );
};

// =============================================================================
// THRESHOLD EDITOR - Full-width takeover when editing a threshold
// =============================================================================

interface ThresholdEditorProps {
    value: number;
    onConfirm: (v: number) => void;  // Only called when user confirms
    onCancel: () => void;
    min: number;
    max: number;
    step: number;
    unit: string;
    label: string;  // e.g., "Set Lower Temp"
    color: string;
}

const ThresholdEditor: React.FC<ThresholdEditorProps> = ({
    value: initialValue, onConfirm, onCancel, min, max, step, unit, label, color
}) => {
    // Local state - only sent to API on confirm
    const [localValue, setLocalValue] = useState(initialValue);

    const formatValue = (v: number) => {
        if (step < 1) return v.toFixed(1);
        return Math.round(v).toString();
    };

    // Hold to repeat functionality
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const startRepeat = (action: () => void) => {
        action();
        intervalRef.current = setInterval(action, 100);
    };

    const stopRepeat = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    useEffect(() => {
        return () => stopRepeat();
    }, []);

    const handleConfirm = () => {
        onConfirm(localValue);
    };

    return (
        <div
            className="flex flex-col gap-3 p-3 rounded-xl"
            style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}
        >
            {/* Label with Cancel */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onCancel}
                    className="text-xs px-2 py-1 rounded-lg transition-all active:scale-95"
                    style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-muted)' }}
                >
                    Cancel
                </button>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
                    {label}
                </span>
                <div className="w-12" /> {/* Spacer for centering */}
            </div>

            {/* Big Controls Row */}
            <div className="flex items-center justify-center gap-4">
                {/* Minus Button */}
                <button
                    onMouseDown={() => startRepeat(() => setLocalValue(v => Math.max(min, v - step)))}
                    onMouseUp={stopRepeat}
                    onMouseLeave={stopRepeat}
                    onTouchStart={() => startRepeat(() => setLocalValue(v => Math.max(min, v - step)))}
                    onTouchEnd={stopRepeat}
                    className="w-12 h-12 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                    style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}
                >
                    <Minus className="w-6 h-6" />
                </button>

                {/* Value Display */}
                <div
                    className="min-w-[80px] text-center py-2 px-4 rounded-xl font-bold text-2xl tabular-nums"
                    style={{ backgroundColor: color, color: 'white' }}
                >
                    {formatValue(localValue)}{unit}
                </div>

                {/* Plus Button */}
                <button
                    onMouseDown={() => startRepeat(() => setLocalValue(v => Math.min(max, v + step)))}
                    onMouseUp={stopRepeat}
                    onMouseLeave={stopRepeat}
                    onTouchStart={() => startRepeat(() => setLocalValue(v => Math.min(max, v + step)))}
                    onTouchEnd={stopRepeat}
                    className="w-12 h-12 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                    style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            {/* Confirm Button */}
            <button
                onClick={handleConfirm}
                className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all"
                style={{ backgroundColor: color, color: 'white' }}
            >
                <Check className="w-4 h-4" />
                Confirm
            </button>
        </div>
    );
};

// =============================================================================
// TRIGGERS SECTION - Shows threshold rows or editor when editing
// =============================================================================

interface TriggerConfig {
    key: string;
    low: number;
    high: number;
    onLowChange: (v: number) => void;
    onHighChange: (v: number) => void;
    min: number;
    max: number;
    step: number;
    unit: string;
    icon: React.ReactNode;
    label: string;
    lowColor: string;   // Blue for lower thresholds
    highColor: string;  // Red/orange for upper thresholds
}

interface TriggersSectionProps {
    triggers: TriggerConfig[];
}

const TriggersSection: React.FC<TriggersSectionProps> = ({ triggers }) => {
    const [editing, setEditing] = useState<{ key: string; bound: 'low' | 'high' } | null>(null);

    const formatValue = (v: number, step: number) => {
        if (step < 1) return v.toFixed(1);
        return Math.round(v).toString();
    };

    // If editing, show full-width editor
    if (editing) {
        const trigger = triggers.find(t => t.key === editing.key);
        if (!trigger) return null;

        const isLow = editing.bound === 'low';
        const value = isLow ? trigger.low : trigger.high;
        const onChange = isLow ? trigger.onLowChange : trigger.onHighChange;
        const boundMin = isLow ? trigger.min : trigger.low + trigger.step;
        const boundMax = isLow ? trigger.high - trigger.step : trigger.max;
        const editColor = isLow ? trigger.lowColor : trigger.highColor;

        return (
            <ThresholdEditor
                value={value}
                onConfirm={(newValue) => {
                    onChange(newValue);  // Only sends to API when confirmed
                    setEditing(null);
                }}
                onCancel={() => setEditing(null)}
                min={boundMin}
                max={boundMax}
                step={trigger.step}
                unit={trigger.unit}
                label={`Set ${isLow ? 'Lower' : 'Upper'} ${trigger.label}`}
                color={editColor}
            />
        );
    }

    // Normal view - compact rows
    return (
        <div className="space-y-1.5">
            {triggers.map(trigger => (
                <div key={trigger.key} className="flex items-center gap-2">
                    {/* Icon + Label */}
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0" style={{ color: 'var(--ui-text-muted)' }}>
                            {trigger.icon}
                        </div>
                        <span className="text-[11px] font-medium" style={{ color: 'var(--ui-text-muted)' }}>
                            {trigger.label}
                        </span>
                    </div>

                    {/* Tappable Values - Color coded low/high */}
                    <div className="flex items-center gap-1.5 ml-auto">
                        <button
                            onClick={() => setEditing({ key: trigger.key, bound: 'low' })}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums transition-all active:scale-95 border"
                            style={{
                                backgroundColor: 'var(--ui-bg-tertiary)',
                                borderColor: trigger.lowColor,
                                color: trigger.lowColor
                            }}
                        >
                            {formatValue(trigger.low, trigger.step)}{trigger.unit}
                        </button>
                        <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>→</span>
                        <button
                            onClick={() => setEditing({ key: trigger.key, bound: 'high' })}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums transition-all active:scale-95 border"
                            style={{
                                backgroundColor: 'var(--ui-bg-tertiary)',
                                borderColor: trigger.highColor,
                                color: trigger.highColor
                            }}
                        >
                            {formatValue(trigger.high, trigger.step)}{trigger.unit}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

// =============================================================================
// PORT CONTROL PANEL - Touch-friendly slide-out panel
// =============================================================================

interface PortControlPanelProps {
    port: ACInfinityPort;
    settings: PortSettings | undefined;
    onModeChange: (mode: number) => void;
    onSpeedChange: (speed: number) => void;
    onSettingsChange: (settings: Partial<PortSettings>) => void;
    onClose: () => void;
    isLargeView?: boolean;
    tempUnit: TempUnit;
    enableAnimations?: boolean;
}

const PortControlPanel: React.FC<PortControlPanelProps> = ({
    port, settings, onModeChange, onSpeedChange, onSettingsChange, onClose, isLargeView, tempUnit, enableAnimations = true
}) => {
    const mode = settings?.mode ?? port.currentMode ?? 2;
    const actualSpeed = port.currentPower ?? 0; // Actual running speed for display
    const configuredSpeed = settings?.onSpeed ?? port.currentPower ?? 0; // For slider control
    const isRunning = mode !== 1 && actualSpeed > 0;

    const content = (
        <div className="flex flex-col gap-3">
            {/* Panel Header - More compact */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Fan
                        className={`w-4 h-4 ${enableAnimations && isRunning ? 'animate-spin' : ''}`}
                        style={{
                            color: isRunning ? 'var(--ui-accent-primary)' : 'var(--ui-text-muted)',
                            animationDuration: '1s'
                        }}
                    />
                    <span className="font-semibold text-sm" style={{ color: 'var(--ui-text-primary)' }}>
                        {port.portName}
                    </span>
                </div>
                {!isLargeView && (
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
                        style={{ backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--ui-text-muted)' }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Mode Selection - Horizontal compact pills */}
            <div className="flex gap-1.5">
                {MODES.map(m => {
                    const Icon = m.icon;
                    const isActive = mode === m.id;
                    return (
                        <button
                            key={m.id}
                            onClick={() => onModeChange(m.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all active:scale-95"
                            style={{
                                backgroundColor: isActive ? m.color : 'var(--ui-bg-tertiary)',
                                color: isActive && m.id !== 1 ? 'white' : 'var(--ui-text-primary)',
                            }}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-semibold">{m.shortName}</span>
                        </button>
                    );
                })}
            </div>

            {/* Speed Control - Shows actual speed, editable only in "On" mode */}
            <div className="space-y-1.5">
                <span className="text-xs font-medium" style={{ color: 'var(--ui-text-muted)' }}>
                    {mode === 2 ? 'Speed' : 'Current Speed'}
                </span>
                <SpeedSlider
                    speed={configuredSpeed}
                    displaySpeed={actualSpeed}
                    onChange={onSpeedChange}
                    disabled={mode !== 2}
                    size={isLargeView ? 'sm' : 'md'}
                />
            </div>

            {/* Auto/VPD Thresholds - Full takeover editing */}
            {(mode === 3 || mode === 8) && (
                <div className="pt-2 border-t" style={{ borderColor: 'var(--ui-bg-tertiary)' }}>
                    <div className="mb-2">
                        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
                            Triggers
                        </span>
                    </div>

                    {!settings ? (
                        <div className="flex items-center justify-center py-4">
                            <span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>Loading triggers...</span>
                        </div>
                    ) : (
                        <TriggersSection
                            triggers={[
                                {
                                    key: 'temp',
                                    // Use native C or F values from API - no conversion needed
                                    low: tempUnit === 'F' ? settings.tempLowF : settings.tempLow,
                                    high: tempUnit === 'F' ? settings.tempHighF : settings.tempHigh,
                                    // When saving, send both C and F values to avoid rounding issues
                                    onLowChange: (v) => {
                                        if (tempUnit === 'F') {
                                            // User entered F, calculate C
                                            onSettingsChange({
                                                tempLowF: v,
                                                tempLow: Math.round((v - 32) * 5 / 9)
                                            });
                                        } else {
                                            // User entered C, calculate F
                                            onSettingsChange({
                                                tempLow: v,
                                                tempLowF: Math.round(v * 9 / 5 + 32)
                                            });
                                        }
                                    },
                                    onHighChange: (v) => {
                                        if (tempUnit === 'F') {
                                            onSettingsChange({
                                                tempHighF: v,
                                                tempHigh: Math.round((v - 32) * 5 / 9)
                                            });
                                        } else {
                                            onSettingsChange({
                                                tempHigh: v,
                                                tempHighF: Math.round(v * 9 / 5 + 32)
                                            });
                                        }
                                    },
                                    min: tempUnit === 'C' ? 0 : 32,
                                    max: tempUnit === 'C' ? 50 : 120,
                                    step: 1,
                                    unit: getTempUnit(tempUnit),
                                    icon: <Thermometer className="w-3.5 h-3.5" />,
                                    label: 'Temp',
                                    lowColor: 'var(--ui-info)',      // Blue for lower
                                    highColor: 'var(--ui-danger)',   // Red for upper
                                },
                                {
                                    key: 'humidity',
                                    low: settings.humidityLow,
                                    high: settings.humidityHigh,
                                    onLowChange: (v) => onSettingsChange({ humidityLow: v }),
                                    onHighChange: (v) => onSettingsChange({ humidityHigh: v }),
                                    min: 0,
                                    max: 100,
                                    step: 1,
                                    unit: '%',
                                    icon: <Droplets className="w-3.5 h-3.5" />,
                                    label: 'Humidity',
                                    lowColor: 'var(--ui-info)',      // Blue for lower
                                    highColor: 'var(--ui-danger)',   // Red for upper
                                },
                                ...(mode === 8 ? [{
                                    key: 'vpd',
                                    low: settings.vpdLow,
                                    high: settings.vpdHigh,
                                    onLowChange: (v: number) => onSettingsChange({ vpdLow: v }),
                                    onHighChange: (v: number) => onSettingsChange({ vpdHigh: v }),
                                    min: 0,
                                    max: 3.0,
                                    step: 0.1,
                                    unit: ' kPa',
                                    icon: <Leaf className="w-3.5 h-3.5" />,
                                    label: 'VPD',
                                    lowColor: 'var(--ui-info)',      // Blue for lower
                                    highColor: 'var(--ui-danger)',   // Red for upper
                                }] : []),
                            ]}
                        />
                    )}
                </div>
            )}
        </div>
    );

    if (isLargeView) {
        return <div className="p-2.5">{content}</div>;
    }

    // Slide-out panel overlay for medium view
    return (
        <div
            className="absolute inset-0 z-10 flex"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={onClose}
        >
            <div
                className="ml-auto w-full max-w-xs h-full overflow-y-auto p-3"
                style={{ backgroundColor: 'var(--ui-bg-primary)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {content}
            </div>
        </div>
    );
};

// =============================================================================
// PORT TILE - Clickable tile for medium view with speed meter
// =============================================================================

interface PortTileProps {
    port: ACInfinityPort;
    settings: PortSettings | undefined;
    onClick: () => void;
    compact?: boolean;
    enableAnimations?: boolean;
}

const PortTile: React.FC<PortTileProps> = ({ port, settings, onClick, compact, enableAnimations = true }) => {
    const mode = settings?.mode ?? port.currentMode ?? 2;
    const actualSpeed = port.currentPower ?? 0; // Always show actual running speed
    const isRunning = mode !== 1 && actualSpeed > 0;
    const modeInfo = getModeInfo(mode);
    const speedPercent = (actualSpeed / 10) * 100;

    return (
        <button
            onClick={onClick}
            className={`relative overflow-hidden rounded-xl transition-all active:scale-[0.98] w-full text-left`}
            style={{ backgroundColor: 'var(--ui-bg-secondary)' }}
        >
            {/* Speed meter background fill */}
            <div
                className="absolute inset-0 transition-all duration-300"
                style={{
                    width: `${speedPercent}%`,
                    backgroundColor: isRunning ? 'var(--ui-accent-primary)' : 'transparent',
                    opacity: 0.15
                }}
            />

            {/* Content */}
            <div className={`relative flex items-center gap-2 ${compact ? 'px-2 py-1.5' : 'px-3 py-2.5'}`}>
                <Fan
                    className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0 ${enableAnimations && isRunning ? 'animate-spin' : ''}`}
                    style={{
                        color: isRunning ? 'var(--ui-accent-primary)' : 'var(--ui-text-muted)',
                        animationDuration: '1s'
                    }}
                />
                <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${compact ? 'text-xs' : 'text-sm'}`} style={{ color: 'var(--ui-text-primary)' }}>
                        {port.portName}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span
                            className={`${compact ? 'text-[9px]' : 'text-[10px]'} px-1.5 py-0.5 rounded font-semibold`}
                            style={{ backgroundColor: getModeColor(mode), color: mode === 1 ? 'var(--ui-text-primary)' : 'white' }}
                        >
                            {modeInfo.shortName}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`font-bold tabular-nums ${compact ? 'text-sm' : 'text-lg'}`} style={{ color: 'var(--ui-text-primary)' }}>
                        {mode === 1 ? 'OFF' : `${actualSpeed * 10}%`}
                    </span>
                    <ChevronRight className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: 'var(--ui-text-muted)' }} />
                </div>
            </div>
        </button>
    );
};

// =============================================================================
// SENSOR DISPLAY - Environmental readings
// =============================================================================

interface SensorDisplayProps {
    temperature: number;  // Always in Fahrenheit from API
    humidity: number;
    vpd: number;
    size: ViewSize;
    tempUnit: TempUnit;
}

const SensorDisplay: React.FC<SensorDisplayProps> = ({ temperature, humidity, vpd, size, tempUnit }) => {
    const vpdColor = getVpdColor(vpd);

    const isSmall = size === 'small';
    const iconSize = isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5';
    const textSize = isSmall ? 'text-xs' : 'text-sm';
    const gap = isSmall ? 'gap-2' : 'gap-3';
    const padding = isSmall ? 'py-1 px-1.5' : 'py-1.5 px-2.5';

    return (
        <div
            className={`flex items-center ${gap} ${padding} rounded-lg`}
            style={{ backgroundColor: 'var(--ui-bg-secondary)' }}
        >
            <div className="flex items-center gap-1">
                <Thermometer className={iconSize} style={{ color: 'var(--ui-warning)' }} />
                <span className={`${textSize} font-bold tabular-nums`} style={{ color: 'var(--ui-text-primary)' }}>
                    {formatTemp(temperature, tempUnit)}{getTempUnit(tempUnit)}
                </span>
            </div>
            <div className="flex items-center gap-1">
                <Droplets className={iconSize} style={{ color: 'var(--ui-info)' }} />
                <span className={`${textSize} font-bold tabular-nums`} style={{ color: 'var(--ui-text-primary)' }}>
                    {humidity.toFixed(0)}%
                </span>
            </div>
            {vpd > 0 && (
                <div className="flex items-center gap-1">
                    <Leaf className={iconSize} style={{ color: vpdColor }} />
                    <span className={`${textSize} font-bold tabular-nums`} style={{ color: 'var(--ui-text-primary)' }}>
                        {vpd.toFixed(2)}
                    </span>
                </div>
            )}
        </div>
    );
};

// =============================================================================
// MEDIUM VIEW - Expandable ports with control panel
// =============================================================================

interface MediumViewProps {
    controller: ACInfinityController;
    ports: ACInfinityPort[];
    portSettings: Record<number, PortSettings>;
    name: string;
    tempUnit: TempUnit;
    onModeChange: (portIndex: number, mode: number) => void;
    onSpeedChange: (portIndex: number, speed: number) => void;
    onSettingsChange: (portIndex: number, settings: Partial<PortSettings>) => void;
    enableAnimations: boolean;
    defaultExpandedPort: string;
}

const MediumView: React.FC<MediumViewProps> = ({
    controller, ports, portSettings, name, tempUnit, onModeChange, onSpeedChange, onSettingsChange,
    enableAnimations, defaultExpandedPort
}) => {
    // Initialize selected port based on setting
    const getInitialPort = (): number | null => {
        if (defaultExpandedPort === 'first' && ports.length > 0) return ports[0].portIndex;
        if (defaultExpandedPort === 'last' && ports.length > 0) return ports[ports.length - 1].portIndex;
        return null;
    };
    const [selectedPort, setSelectedPort] = useState<number | null>(getInitialPort);
    const selectedPortData = ports.find(p => p.portIndex === selectedPort);
    const vpdColor = getVpdColor(controller.vpd);

    return (
        <div className="relative flex flex-col h-full p-3 gap-3 overflow-hidden">
            {/* Header with name */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: 'var(--ui-text-primary)' }}>{name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{
                        backgroundColor: 'var(--ui-success-bg)', color: 'var(--ui-success)'
                    }}>
                        Online
                    </span>
                </div>
            </div>

            {/* Prominent Sensor Display */}
            <div
                className="flex items-center justify-around py-3 px-4 rounded-xl flex-shrink-0"
                style={{ backgroundColor: 'var(--ui-bg-secondary)' }}
            >
                <div className="flex flex-col items-center gap-1">
                    <Thermometer className="w-5 h-5" style={{ color: 'var(--ui-warning)' }} />
                    <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                        {formatTemp(controller.temperatureF, tempUnit)}°
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
                        Temp
                    </span>
                </div>
                <div className="w-px h-10" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }} />
                <div className="flex flex-col items-center gap-1">
                    <Droplets className="w-5 h-5" style={{ color: 'var(--ui-info)' }} />
                    <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                        {controller.humidity.toFixed(0)}%
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
                        Humidity
                    </span>
                </div>
                {controller.vpd > 0 && (
                    <>
                        <div className="w-px h-10" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }} />
                        <div className="flex flex-col items-center gap-1">
                            <Leaf className="w-5 h-5" style={{ color: vpdColor }} />
                            <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                                {controller.vpd.toFixed(2)}
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
                                VPD
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Port List */}
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0">
                {ports.length > 0 ? ports.map(port => (
                    <PortTile
                        key={port.portIndex}
                        port={port}
                        settings={portSettings[port.portIndex]}
                        onClick={() => setSelectedPort(port.portIndex)}
                        enableAnimations={enableAnimations}
                    />
                )) : (
                    <div
                        className="flex items-center justify-center flex-1 rounded-xl"
                        style={{ backgroundColor: 'var(--ui-bg-secondary)' }}
                    >
                        <span className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>
                            No ports configured
                        </span>
                    </div>
                )}
            </div>

            {/* Control Panel Overlay */}
            {selectedPort !== null && selectedPortData && (
                <PortControlPanel
                    port={selectedPortData}
                    settings={portSettings[selectedPort]}
                    onModeChange={(m) => onModeChange(selectedPort, m)}
                    onSpeedChange={(s) => onSpeedChange(selectedPort, s)}
                    onSettingsChange={(s) => onSettingsChange(selectedPort, s)}
                    onClose={() => setSelectedPort(null)}
                    tempUnit={tempUnit}
                />
            )}
        </div>
    );
};

// =============================================================================
// LARGE VIEW - Full dashboard with all controls visible
// =============================================================================

interface LargeViewProps {
    controller: ACInfinityController;
    ports: ACInfinityPort[];
    portSettings: Record<number, PortSettings>;
    name: string;
    tempUnit: TempUnit;
    onModeChange: (portIndex: number, mode: number) => void;
    onSpeedChange: (portIndex: number, speed: number) => void;
    onSettingsChange: (portIndex: number, settings: Partial<PortSettings>) => void;
    enableAnimations: boolean;
}

const LargeView: React.FC<LargeViewProps> = ({
    controller, ports, portSettings, name, tempUnit, onModeChange, onSpeedChange, onSettingsChange,
    enableAnimations
}) => {
    const vpdColor = getVpdColor(controller.vpd);

    return (
        <div className="flex flex-col h-full p-3 gap-3 overflow-hidden">
            {/* Header with name */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-bold text-lg" style={{ color: 'var(--ui-text-primary)' }}>{name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{
                    backgroundColor: 'var(--ui-success-bg)', color: 'var(--ui-success)'
                }}>
                    Online
                </span>
            </div>

            {/* Prominent Sensor Display */}
            <div
                className="flex items-center justify-around py-3 px-4 rounded-xl flex-shrink-0"
                style={{ backgroundColor: 'var(--ui-bg-secondary)' }}
            >
                <div className="flex flex-col items-center gap-1">
                    <Thermometer className="w-5 h-5" style={{ color: 'var(--ui-warning)' }} />
                    <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                        {formatTemp(controller.temperatureF, tempUnit)}°
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
                        Temp
                    </span>
                </div>
                <div className="w-px h-10" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }} />
                <div className="flex flex-col items-center gap-1">
                    <Droplets className="w-5 h-5" style={{ color: 'var(--ui-info)' }} />
                    <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                        {controller.humidity.toFixed(0)}%
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
                        Humidity
                    </span>
                </div>
                {controller.vpd > 0 && (
                    <>
                        <div className="w-px h-10" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }} />
                        <div className="flex flex-col items-center gap-1">
                            <Leaf className="w-5 h-5" style={{ color: vpdColor }} />
                            <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                                {controller.vpd.toFixed(2)}
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
                                VPD
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Port Grid */}
            <div className="flex-1 grid gap-2 overflow-y-auto min-h-0" style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
            }}>
                {ports.length > 0 ? ports.map(port => (
                    <div
                        key={port.portIndex}
                        className="rounded-2xl overflow-hidden"
                        style={{ backgroundColor: 'var(--ui-bg-secondary)' }}
                    >
                        <PortControlPanel
                            port={port}
                            settings={portSettings[port.portIndex]}
                            onModeChange={(m) => onModeChange(port.portIndex, m)}
                            onSpeedChange={(s) => onSpeedChange(port.portIndex, s)}
                            onSettingsChange={(s) => onSettingsChange(port.portIndex, s)}
                            onClose={() => { }}
                            isLargeView
                            tempUnit={tempUnit}
                            enableAnimations={enableAnimations}
                        />
                    </div>
                )) : (
                    <div
                        className="flex items-center justify-center rounded-2xl col-span-full"
                        style={{ backgroundColor: 'var(--ui-bg-secondary)', minHeight: '120px' }}
                    >
                        <span className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>
                            No ports configured on this controller
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// =============================================================================
// MAIN WIDGET CONTENT
// =============================================================================

interface FanControllerProps {
    widgetId?: string;
}

const FanContent: React.FC<{ widgetId: string }> = ({ widgetId }) => {
    // Use shared AC Infinity context - data is fetched once and shared across all widgets
    const {
        globalSettings,
        controllers,
        loading,
        error,
        refresh,
        updatePortMode,
        updatePortSpeed,
        updatePortSettings,
        getEffectiveSettings,
        registerConsumer,
    } = useACInfinity();

    // Register this widget as an active consumer of AC Infinity data
    // This tells the context to start/continue polling
    useEffect(() => {
        const unregister = registerConsumer();
        return () => unregister();
    }, [registerConsumer]);

    const [size, setSize] = useState({ w: 300, h: 200 });
    const ref = useRef<HTMLDivElement>(null);

    const { settings } = useWidgetSettings(widgetId);

    // Instance-specific settings (per widget)
    const controllerId = settings.selectedFan as string;
    const customName = settings.customName as string;
    const showInactivePorts = settings.showInactivePorts === true; // default false
    const defaultExpandedPort = (settings.defaultExpandedPort as string) || 'none';
    const monitoringMode = settings.monitoringMode === true; // default false

    // Global settings from context (shared across all instances)
    const tempUnit = globalSettings.temperatureUnit;
    const showVPD = globalSettings.showVPD;
    const showHumidity = globalSettings.showHumidity;
    const showTemperature = globalSettings.showTemperature;
    const enableAnimations = globalSettings.enableAnimations;

    const { openSettings } = useWidgetSettingsDialog();

    // Find the controller for this widget instance
    const controller = useMemo(() =>
        controllers.find(c => c.deviceId === controllerId),
        [controllers, controllerId]
    );

    // Build port settings from shared context
    const portSettings = useMemo(() => {
        if (!controllerId) return {};
        const result: Record<number, PortSettings> = {};
        controller?.ports.forEach(port => {
            const settings = getEffectiveSettings(controllerId, port.portIndex);
            if (settings) {
                result[port.portIndex] = settings;
            }
        });
        return result;
    }, [controllerId, controller?.ports, getEffectiveSettings]);

    // Determine view size based on dimensions
    const viewSize: ViewSize = useMemo(() => {
        if (size.h < 250 || size.w < 300) return 'small';
        if (size.h >= 450 && size.w >= 500) return 'large';
        return 'medium';
    }, [size.w, size.h]);

    // Resize observer
    useEffect(() => {
        if (!ref.current) return;
        const obs = new ResizeObserver(([entry]) => {
            setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
        });
        obs.observe(ref.current);
        return () => obs.disconnect();
    }, []);

    // ==========================================================================
    // ACTION HANDLERS - delegate to shared context
    // ==========================================================================

    const setMode = useCallback((portIndex: number, mode: number) => {
        if (!controllerId) return;
        updatePortMode(controllerId, portIndex, mode);
    }, [controllerId, updatePortMode]);

    const setSpeed = useCallback((portIndex: number, speed: number) => {
        if (!controllerId) return;
        updatePortSpeed(controllerId, portIndex, speed);
    }, [controllerId, updatePortSpeed]);

    const handleSettingsChange = useCallback((portIndex: number, newSettings: Partial<PortSettings>) => {
        if (!controllerId) return;
        updatePortSettings(controllerId, portIndex, newSettings);
    }, [controllerId, updatePortSettings]);

    // Derived values
    const name = customName || controller?.deviceName || "AC Infinity";

    // Filter ports based on showInactivePorts setting
    const allPorts = useMemo(() => {
        const ports = controller?.ports || [];
        if (showInactivePorts) return ports;
        return ports.filter(p => {
            const isDefaultName = /^Port \d+$/.test(p.portName);
            return !isDefaultName || p.isOnline;
        });
    }, [controller?.ports, showInactivePorts]);

    // ==========================================================================
    // LOADING STATE
    // ==========================================================================
    if (loading && !controllers.length) {
        return (
            <div ref={ref} className="flex items-center justify-center h-full">
                <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "var(--ui-text-muted)" }} />
            </div>
        );
    }

    // ==========================================================================
    // ERROR STATE
    // ==========================================================================
    if (error && !controllers.length) {
        return (
            <div ref={ref} className="flex flex-col items-center justify-center h-full gap-2 p-4">
                <AlertCircle className="w-6 h-6" style={{ color: "var(--ui-danger)" }} />
                <span className="text-xs text-center" style={{ color: "var(--ui-text-muted)" }}>
                    Connection failed
                </span>
                <button
                    onClick={refresh}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all active:scale-95"
                    style={{ backgroundColor: "var(--ui-bg-tertiary)", color: "var(--ui-text-primary)" }}
                >
                    Retry
                </button>
            </div>
        );
    }

    // ==========================================================================
    // NOT CONFIGURED
    // ==========================================================================
    if (!controllerId) {
        return (
            <div ref={ref} className="flex flex-col items-center justify-center h-full gap-3 p-4">
                <Fan className="w-8 h-8" style={{ color: "var(--ui-text-muted)" }} />
                <div className="text-center">
                    <div className="font-medium text-sm" style={{ color: "var(--ui-text-primary)" }}>
                        No Controller Selected
                    </div>
                    <div className="text-xs" style={{ color: "var(--ui-text-muted)" }}>
                        Configure to get started
                    </div>
                </div>
                <button
                    onClick={() => openSettings(widgetId, "Fan Controller")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium active:scale-95 transition-transform"
                    style={{ backgroundColor: "var(--ui-accent-primary)", color: "white" }}
                >
                    <Settings className="w-3.5 h-3.5" />
                    Configure
                </button>
            </div>
        );
    }

    // ==========================================================================
    // OFFLINE
    // ==========================================================================
    if (!controller?.isOnline) {
        return (
            <div ref={ref} className="flex flex-col items-center justify-center h-full gap-2 p-4">
                <Fan className="w-6 h-6" style={{ color: "var(--ui-text-muted)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--ui-text-primary)" }}>{name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    backgroundColor: "var(--ui-danger-bg)", color: "var(--ui-danger)"
                }}>
                    Offline
                </span>
            </div>
        );
    }

    // ==========================================================================
    // RENDER APPROPRIATE VIEW
    // ==========================================================================

    // Monitoring mode - show large readable metrics without controls
    if (monitoringMode) {
        return (
            <div ref={ref} className="h-full w-full overflow-hidden">
                <MonitoringView
                    controller={controller}
                    ports={allPorts}
                    portSettings={portSettings}
                    name={name}
                    tempUnit={tempUnit}
                    showTemperature={showTemperature}
                    showHumidity={showHumidity}
                    showVPD={showVPD}
                    enableAnimations={enableAnimations}
                    size={size}
                />
            </div>
        );
    }

    return (
        <div ref={ref} className="h-full w-full overflow-hidden">
            {viewSize === 'small' && (
                <SmallView
                    controller={controller}
                    ports={allPorts}
                    portSettings={portSettings}
                    name={name}
                    tempUnit={tempUnit}
                    showTemperature={showTemperature}
                    showHumidity={showHumidity}
                    showVPD={showVPD}
                    enableAnimations={enableAnimations}
                />
            )}
            {viewSize === 'medium' && (
                <MediumView
                    controller={controller}
                    ports={allPorts}
                    portSettings={portSettings}
                    name={name}
                    tempUnit={tempUnit}
                    onModeChange={setMode}
                    onSpeedChange={setSpeed}
                    onSettingsChange={handleSettingsChange}
                    enableAnimations={enableAnimations}
                    defaultExpandedPort={defaultExpandedPort}
                />
            )}
            {viewSize === 'large' && (
                <LargeView
                    controller={controller}
                    ports={allPorts}
                    portSettings={portSettings}
                    name={name}
                    tempUnit={tempUnit}
                    onModeChange={setMode}
                    onSpeedChange={setSpeed}
                    onSettingsChange={handleSettingsChange}
                    enableAnimations={enableAnimations}
                />
            )}
        </div>
    );
};

// =============================================================================
// WIDGET WRAPPER
// =============================================================================

const FanController: React.FC<FanControllerProps> = ({ widgetId }) => (
    <Widget
        endpoint={undefined}
        payload={undefined}
        title=""
        refreshInterval={undefined}
        widgetId={widgetId || WIDGET_TYPE}
    >
        {() => <FanContent widgetId={widgetId || WIDGET_TYPE} />}
    </Widget>
);

export default FanController;
