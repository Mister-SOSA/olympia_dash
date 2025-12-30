/**
 * FanController Widget - AC Infinity Controller
 * 
 * Responsive 3-view design:
 * - Small: Compact monitoring (temp, humidity, VPD, fan speeds)
 * - Medium: Expandable ports with touch-friendly control panels
 * - Large: Full dashboard with all ports and controls visible
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Widget from "./Widget";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";
import { useWidgetSettingsDialog } from "@/contexts/WidgetSettingsDialogContext";
import {
    Fan, Thermometer, Droplets, Leaf, AlertCircle, RefreshCw, Settings,
    Power, Activity, Wind, Minus, Plus, X, ChevronRight, Check
} from "lucide-react";
import { authService } from "@/lib/auth";

const WIDGET_TYPE = "FanController";
const AC_INFINITY_API = `/api/ac-infinity/controllers`;

// =============================================================================
// TYPES
// =============================================================================

interface ACInfinityPort {
    portIndex: number;
    portName: string;
    deviceType: number;
    isOnline: boolean;
    currentPower: number;
    currentMode: number;
    currentModeName: string;
}

interface ACInfinityController {
    deviceId: string;
    deviceName: string;
    isOnline: boolean;
    temperature: number;
    temperatureF: number;
    humidity: number;
    vpd: number;
    ports: ACInfinityPort[];
}

interface PortSettings {
    mode: number;
    modeName: string;
    onSpeed: number;
    offSpeed: number;
    tempHigh: number;       // Celsius
    tempLow: number;        // Celsius
    tempHighF: number;      // Fahrenheit (from API directly)
    tempLowF: number;       // Fahrenheit (from API directly)
    tempHighEnabled: boolean;
    tempLowEnabled: boolean;
    humidityHigh: number;
    humidityLow: number;
    humidityHighEnabled: boolean;
    humidityLowEnabled: boolean;
    targetVpd: number;
    vpdHigh: number;
    vpdLow: number;
}

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

type TempUnit = 'C' | 'F';

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
}

const SmallView: React.FC<SmallViewProps> = ({ controller, ports, portSettings, name, tempUnit }) => {
    const vpdColor = getVpdColor(controller.vpd);

    return (
        <div className="flex flex-col h-full p-2 gap-1.5">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs font-semibold truncate" style={{ color: 'var(--ui-text-primary)' }}>
                    {name}
                </span>
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--ui-success-bg)' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--ui-success)' }} />
                </div>
            </div>

            {/* Environmental Readings - Always visible */}
            <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-1">
                    <Thermometer className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--ui-warning)' }} />
                    <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                        {formatTemp(controller.temperatureF, tempUnit)}{getTempUnit(tempUnit)}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Droplets className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--ui-info)' }} />
                    <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                        {controller.humidity.toFixed(0)}%
                    </span>
                </div>
                {controller.vpd > 0 && (
                    <div className="flex items-center gap-1">
                        <Leaf className="w-3 h-3 flex-shrink-0" style={{ color: vpdColor }} />
                        <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                            {controller.vpd.toFixed(2)}
                        </span>
                    </div>
                )}
            </div>

            {/* Fan Speeds Row */}
            <div className="flex items-center gap-1.5 flex-wrap">
                {ports.map(port => {
                    const ps = portSettings[port.portIndex];
                    const mode = ps?.mode ?? port.currentMode ?? 2;
                    const actualSpeed = port.currentPower ?? 0; // Always show actual running speed
                    const isRunning = mode !== 1 && actualSpeed > 0;

                    return (
                        <div
                            key={port.portIndex}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--ui-bg-secondary)' }}
                        >
                            <Fan
                                className={`w-3 h-3 flex-shrink-0 ${isRunning ? 'animate-spin' : ''}`}
                                style={{
                                    color: isRunning ? 'var(--ui-accent-primary)' : 'var(--ui-text-muted)',
                                    animationDuration: '1s'
                                }}
                            />
                            <span className="text-[10px] font-bold tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                                {mode === 1 ? 'OFF' : `${actualSpeed * 10}%`}
                            </span>
                        </div>
                    );
                })}
            </div>
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
}

const PortControlPanel: React.FC<PortControlPanelProps> = ({
    port, settings, onModeChange, onSpeedChange, onSettingsChange, onClose, isLargeView, tempUnit
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
                        className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`}
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
            {(mode === 3 || mode === 8) && settings && (
                <div className="pt-2 border-t" style={{ borderColor: 'var(--ui-bg-tertiary)' }}>
                    <div className="mb-2">
                        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
                            Triggers
                        </span>
                    </div>

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
// PORT TILE - Clickable tile for medium view
// =============================================================================

interface PortTileProps {
    port: ACInfinityPort;
    settings: PortSettings | undefined;
    onClick: () => void;
    compact?: boolean;
}

const PortTile: React.FC<PortTileProps> = ({ port, settings, onClick, compact }) => {
    const mode = settings?.mode ?? port.currentMode ?? 2;
    const actualSpeed = port.currentPower ?? 0; // Always show actual running speed
    const isRunning = mode !== 1 && actualSpeed > 0;
    const modeInfo = getModeInfo(mode);

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 ${compact ? 'px-2 py-1.5' : 'px-3 py-2.5'} rounded-xl transition-all active:scale-[0.98] w-full text-left`}
            style={{ backgroundColor: 'var(--ui-bg-secondary)' }}
        >
            <Fan
                className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0 ${isRunning ? 'animate-spin' : ''}`}
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
}

const MediumView: React.FC<MediumViewProps> = ({
    controller, ports, portSettings, name, tempUnit, onModeChange, onSpeedChange, onSettingsChange
}) => {
    const [selectedPort, setSelectedPort] = useState<number | null>(null);
    const selectedPortData = ports.find(p => p.portIndex === selectedPort);

    return (
        <div className="relative flex flex-col h-full p-3 gap-3 overflow-hidden">
            {/* Header */}
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

            {/* Sensors */}
            <SensorDisplay
                temperature={controller.temperatureF}
                humidity={controller.humidity}
                vpd={controller.vpd}
                size="medium"
                tempUnit={tempUnit}
            />

            {/* Port List */}
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0">
                {ports.length > 0 ? ports.map(port => (
                    <PortTile
                        key={port.portIndex}
                        port={port}
                        settings={portSettings[port.portIndex]}
                        onClick={() => setSelectedPort(port.portIndex)}
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
}

const LargeView: React.FC<LargeViewProps> = ({
    controller, ports, portSettings, name, tempUnit, onModeChange, onSpeedChange, onSettingsChange
}) => {
    return (
        <div className="flex flex-col h-full p-3 gap-2 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: 'var(--ui-text-primary)' }}>{name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{
                        backgroundColor: 'var(--ui-success-bg)', color: 'var(--ui-success)'
                    }}>
                        Online
                    </span>
                </div>
                <SensorDisplay
                    temperature={controller.temperatureF}
                    humidity={controller.humidity}
                    vpd={controller.vpd}
                    size="medium"
                    tempUnit={tempUnit}
                />
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
    const [controllers, setControllers] = useState<ACInfinityController[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [size, setSize] = useState({ w: 300, h: 200 });
    const ref = useRef<HTMLDivElement>(null);

    const { settings } = useWidgetSettings(widgetId);
    const controllerId = settings.selectedFan as string;
    const customName = settings.customName as string;
    const tempUnit: TempUnit = (settings.temperatureUnit as TempUnit) || 'F';

    const { openSettings } = useWidgetSettingsDialog();

    // ==========================================================================
    // OPTIMISTIC STATE MANAGEMENT
    // ==========================================================================
    // We maintain two layers:
    // 1. serverSettings - What the API last told us (source of truth for unmodified values)
    // 2. localOverrides - User changes that take precedence until cleared

    const [serverSettings, setServerSettings] = useState<Record<number, PortSettings>>({});
    const localOverridesRef = useRef<Record<number, Partial<PortSettings>>>({});
    const overrideTimestampsRef = useRef<Record<number, number>>({});

    // Version counter to trigger useMemo recomputation when overrides change
    const [overrideVersion, setOverrideVersion] = useState(0);

    // Merge server settings with local overrides for display
    const portSettings = useMemo(() => {
        const merged: Record<number, PortSettings> = {};
        for (const [portStr, settings] of Object.entries(serverSettings)) {
            const port = parseInt(portStr);
            const overrides = localOverridesRef.current[port];
            merged[port] = overrides ? { ...settings, ...overrides } : settings;
        }
        return merged;
    }, [serverSettings, overrideVersion]);

    // Determine view size based on dimensions
    const viewSize: ViewSize = useMemo(() => {
        // Small: compact monitoring only (1x1 or small 2x1)
        if (size.h < 250 || size.w < 300) return 'small';
        // Large: full dashboard (needs enough space for grid of controls)
        if (size.h >= 450 && size.w >= 500) return 'large';
        // Medium: expandable ports with slide-out panels
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

    // Fetch controllers
    const fetchControllers = useCallback(async () => {
        try {
            const res = await authService.fetchWithAuth(AC_INFINITY_API);
            if (!res.ok) throw new Error("Failed to fetch");
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Error");
            setControllers(json.data || []);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error");
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch port settings - updates server state, doesn't touch local overrides
    const fetchPortSettings = useCallback(async (deviceId: string, ports: ACInfinityPort[]) => {
        const newSettings: Record<number, PortSettings> = {};
        const now = Date.now();

        for (const port of ports) {
            try {
                const res = await authService.fetchWithAuth(
                    `${AC_INFINITY_API}/${deviceId}/ports/${port.portIndex}/settings`
                );
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data) {
                        newSettings[port.portIndex] = json.data;

                        // Clear local overrides if they're older than 5 seconds
                        // This means the API has had time to reflect our changes
                        const overrideTime = overrideTimestampsRef.current[port.portIndex];
                        if (overrideTime && now - overrideTime > 5000) {
                            delete localOverridesRef.current[port.portIndex];
                            delete overrideTimestampsRef.current[port.portIndex];
                        }
                    }
                }
            } catch (e) {
                console.error(`Failed to fetch settings for port ${port.portIndex}:`, e);
            }
        }
        setServerSettings(newSettings);
    }, []);

    useEffect(() => {
        fetchControllers();
        const id = setInterval(fetchControllers, 30000);
        return () => clearInterval(id);
    }, [fetchControllers]);

    const controller = useMemo(() =>
        controllers.find(c => c.deviceId === controllerId),
        [controllers, controllerId]
    );

    useEffect(() => {
        if (controller && controller.ports.length > 0) {
            fetchPortSettings(controller.deviceId, controller.ports);
        }
    }, [controller, fetchPortSettings]);

    // ==========================================================================
    // API ACTIONS WITH OPTIMISTIC UPDATES
    // ==========================================================================

    // Track debounce timers for settings
    const debounceTimerRef = useRef<Record<number, NodeJS.Timeout>>({});
    const pendingSettingsRef = useRef<Record<number, Partial<PortSettings>>>({});

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            Object.values(debounceTimerRef.current).forEach(clearTimeout);
        };
    }, []);

    // Apply local override and trigger re-render
    const applyLocalOverride = useCallback((portIndex: number, changes: Partial<PortSettings>) => {
        localOverridesRef.current[portIndex] = {
            ...localOverridesRef.current[portIndex],
            ...changes
        };
        overrideTimestampsRef.current[portIndex] = Date.now();
        setOverrideVersion(v => v + 1); // Trigger useMemo recomputation
    }, []);

    // Settings update with debouncing - for thresholds
    const updatePortSettings = useCallback((portIndex: number, newSettings: Partial<PortSettings>) => {
        if (!controller) return;

        // Immediately apply as local override
        applyLocalOverride(portIndex, newSettings);

        // Accumulate pending changes
        pendingSettingsRef.current[portIndex] = {
            ...pendingSettingsRef.current[portIndex],
            ...newSettings
        };

        // Clear existing debounce timer
        if (debounceTimerRef.current[portIndex]) {
            clearTimeout(debounceTimerRef.current[portIndex]);
        }

        // Debounce the API call
        debounceTimerRef.current[portIndex] = setTimeout(async () => {
            const settingsToSend = pendingSettingsRef.current[portIndex];
            if (!settingsToSend || Object.keys(settingsToSend).length === 0) return;

            // Clear pending
            delete pendingSettingsRef.current[portIndex];

            try {
                await authService.fetchWithAuth(
                    `${AC_INFINITY_API}/${controller.deviceId}/ports/${portIndex}/settings`,
                    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settingsToSend) }
                );
                // Success - override will be cleared after 5s by fetchPortSettings
            } catch (e) {
                console.error("Failed to update settings:", e);
                // On error, clear the override to show server state
                delete localOverridesRef.current[portIndex];
                delete overrideTimestampsRef.current[portIndex];
                setOverrideVersion(v => v + 1);
            }
        }, 500);
    }, [controller, applyLocalOverride]);

    // Speed changes - immediate with optimistic update
    const setSpeed = useCallback(async (portIndex: number, speed: number) => {
        if (!controller) return;

        // Apply optimistic update
        applyLocalOverride(portIndex, { onSpeed: speed });

        try {
            await authService.fetchWithAuth(
                `${AC_INFINITY_API}/${controller.deviceId}/ports/${portIndex}/speed`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ speed }) }
            );
        } catch (e) {
            console.error("Failed to set speed:", e);
            // Revert on error
            delete localOverridesRef.current[portIndex];
            delete overrideTimestampsRef.current[portIndex];
            setOverrideVersion(v => v + 1);
        }
    }, [controller, applyLocalOverride]);

    // Mode changes - immediate with optimistic update
    const setMode = useCallback(async (portIndex: number, mode: number) => {
        if (!controller) return;

        // Apply optimistic update
        applyLocalOverride(portIndex, { mode });

        try {
            await authService.fetchWithAuth(
                `${AC_INFINITY_API}/${controller.deviceId}/ports/${portIndex}/mode`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) }
            );
            // Refresh after mode change to get new thresholds
            setTimeout(() => {
                if (controller) fetchPortSettings(controller.deviceId, controller.ports);
            }, 2000);
        } catch (e) {
            console.error("Failed to set mode:", e);
            delete localOverridesRef.current[portIndex];
            delete overrideTimestampsRef.current[portIndex];
            setOverrideVersion(v => v + 1);
        }
    }, [controller, applyLocalOverride, fetchPortSettings]);

    // Derived values
    const name = customName || controller?.deviceName || "AC Infinity";
    const allPorts = controller?.ports || [];

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
                    onClick={fetchControllers}
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
    return (
        <div ref={ref} className="h-full w-full overflow-hidden">
            {viewSize === 'small' && (
                <SmallView
                    controller={controller}
                    ports={allPorts}
                    portSettings={portSettings}
                    name={name}
                    tempUnit={tempUnit}
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
                    onSettingsChange={updatePortSettings}
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
                    onSettingsChange={updatePortSettings}
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
