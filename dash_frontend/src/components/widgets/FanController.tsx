/**
 * FanController Widget
 * AC Infinity controller with full mode and settings support
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Widget from "./Widget";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";
import { useWidgetSettingsDialog } from "@/contexts/WidgetSettingsDialogContext";
import { Fan, Thermometer, Droplets, Leaf, AlertCircle, RefreshCw, Settings, ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
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
    tempHigh: number;
    tempLow: number;
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

const MODES = [
    { id: 1, name: "Off", short: "OFF" },
    { id: 2, name: "On", short: "ON" },
    { id: 3, name: "Auto", short: "AUTO" },
    { id: 8, name: "VPD", short: "VPD" },
];

// =============================================================================
// NUMBER INPUT - Inline editable number
// =============================================================================

interface NumberInputProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    disabled?: boolean;
    compact?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({ 
    value, onChange, min = 0, max = 100, step = 1, unit = "", disabled, compact 
}) => {
    const decrement = () => {
        const newVal = Math.max(min, value - step);
        onChange(newVal);
    };
    
    const increment = () => {
        const newVal = Math.min(max, value + step);
        onChange(newVal);
    };
    
    return (
        <div className="flex items-center gap-1">
            <button
                onClick={decrement}
                disabled={disabled || value <= min}
                className={`p-0.5 rounded transition-colors ${disabled ? "opacity-30" : "hover:bg-[var(--ui-bg-tertiary)]"}`}
                style={{ color: "var(--ui-text-muted)" }}
            >
                <Minus className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
            </button>
            <span 
                className={`${compact ? "text-xs min-w-[32px]" : "text-sm min-w-[40px]"} text-center font-medium tabular-nums`}
                style={{ color: "var(--ui-text-primary)" }}
            >
                {value}{unit}
            </span>
            <button
                onClick={increment}
                disabled={disabled || value >= max}
                className={`p-0.5 rounded transition-colors ${disabled ? "opacity-30" : "hover:bg-[var(--ui-bg-tertiary)]"}`}
                style={{ color: "var(--ui-text-muted)" }}
            >
                <Plus className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
            </button>
        </div>
    );
};

// =============================================================================
// THRESHOLD ROW - Single threshold control row
// =============================================================================

interface ThresholdRowProps {
    icon: React.ReactNode;
    label: string;
    lowValue: number;
    highValue: number;
    onLowChange: (value: number) => void;
    onHighChange: (value: number) => void;
    min: number;
    max: number;
    unit: string;
    disabled?: boolean;
    compact?: boolean;
}

const ThresholdRow: React.FC<ThresholdRowProps> = ({
    icon, label, lowValue, highValue, onLowChange, onHighChange, min, max, unit, disabled, compact
}) => (
    <div className={`flex items-center justify-between ${compact ? "py-1.5" : "py-2"}`}>
        <div className="flex items-center gap-1.5">
            <span style={{ color: "var(--ui-text-muted)" }}>{icon}</span>
            <span className={`${compact ? "text-[10px]" : "text-xs"} font-medium`} style={{ color: "var(--ui-text-secondary)" }}>
                {label}
            </span>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
                <span className={`${compact ? "text-[9px]" : "text-[10px]"} uppercase`} style={{ color: "var(--ui-text-muted)" }}>Low</span>
                <NumberInput
                    value={lowValue}
                    onChange={onLowChange}
                    min={min}
                    max={highValue - 1}
                    unit={unit}
                    disabled={disabled}
                    compact={compact}
                />
            </div>
            <div className="flex items-center gap-1">
                <span className={`${compact ? "text-[9px]" : "text-[10px]"} uppercase`} style={{ color: "var(--ui-text-muted)" }}>High</span>
                <NumberInput
                    value={highValue}
                    onChange={onHighChange}
                    min={lowValue + 1}
                    max={max}
                    unit={unit}
                    disabled={disabled}
                    compact={compact}
                />
            </div>
        </div>
    </div>
);

// =============================================================================
// SPEED BAR - Visual speed indicator/control
// =============================================================================

interface SpeedBarProps {
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    compact?: boolean;
}

const SpeedBar: React.FC<SpeedBarProps> = ({ value, onChange, disabled, compact }) => {
    const levels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    return (
        <div className="flex gap-0.5 w-full">
            {levels.map((level) => (
                <button
                    key={level}
                    onClick={() => !disabled && onChange(level)}
                    disabled={disabled}
                    className={`
                        flex-1 rounded-sm transition-all
                        ${compact ? "h-5" : "h-7"}
                        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:opacity-80 active:scale-95"}
                    `}
                    style={{
                        backgroundColor: level <= value && value > 0
                            ? "var(--ui-accent-primary)"
                            : "var(--ui-bg-tertiary)",
                    }}
                    title={level === 0 ? "Off" : `${level * 10}%`}
                />
            ))}
        </div>
    );
};

// =============================================================================
// MODE SELECTOR - Dropdown for selecting operating mode
// =============================================================================

interface ModeSelectorProps {
    value: number;
    onChange: (mode: number) => void;
    disabled?: boolean;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ value, onChange, disabled }) => {
    const [open, setOpen] = useState(false);
    const current = MODES.find(m => m.id === value) || MODES[1];
    
    return (
        <div className="relative">
            <button
                onClick={() => !disabled && setOpen(!open)}
                disabled={disabled}
                className={`
                    flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all
                    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"}
                `}
                style={{ 
                    backgroundColor: "var(--ui-bg-tertiary)",
                    color: "var(--ui-text-primary)",
                }}
            >
                {current.short}
                <ChevronDown className="w-3 h-3" />
            </button>
            
            {open && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setOpen(false)}
                    />
                    <div 
                        className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg overflow-hidden min-w-[100px]"
                        style={{ backgroundColor: "var(--ui-bg-secondary)", border: "1px solid var(--ui-border-primary)" }}
                    >
                        {MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => {
                                    onChange(mode.id);
                                    setOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--ui-bg-tertiary)] transition-colors"
                                style={{ 
                                    color: mode.id === value ? "var(--ui-accent-primary)" : "var(--ui-text-primary)",
                                    fontWeight: mode.id === value ? 600 : 400,
                                }}
                            >
                                {mode.name}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// =============================================================================
// STAT CARD - Data display card
// =============================================================================

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue?: string;
    color?: string;
    compact?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subValue, color, compact }) => (
    <div
        className={`flex flex-col ${compact ? "gap-0 px-2 py-1.5" : "gap-0.5 px-3 py-2"} rounded-lg flex-1 min-w-0`}
        style={{ backgroundColor: "var(--ui-bg-secondary)" }}
    >
        <div className="flex items-center gap-1">
            <span style={{ color: color || "var(--ui-text-muted)" }}>{icon}</span>
            <span className={`${compact ? "text-[9px]" : "text-[10px]"} uppercase tracking-wide`} style={{ color: "var(--ui-text-muted)" }}>
                {label}
            </span>
        </div>
        <div className="flex items-baseline gap-1">
            <span className={`${compact ? "text-base" : "text-lg"} font-semibold tabular-nums`} style={{ color: color || "var(--ui-text-primary)" }}>
                {value}
            </span>
            {subValue && (
                <span className="text-xs tabular-nums" style={{ color: "var(--ui-text-muted)" }}>
                    {subValue}
                </span>
            )}
        </div>
    </div>
);

// =============================================================================
// PORT CONTROL - Individual port with mode and speed
// =============================================================================

interface PortControlProps {
    port: ACInfinityPort;
    settings: PortSettings | null;
    onSpeedChange: (speed: number) => void;
    onModeChange: (mode: number) => void;
    compact?: boolean;
}

const PortControl: React.FC<PortControlProps> = ({ port, settings, onSpeedChange, onModeChange, compact }) => {
    const mode = settings?.mode || port.currentMode || 2;
    const speed = settings?.onSpeed ?? port.currentPower;
    const isActive = speed > 0 && mode !== 1;
    
    // Show speed control for On mode only
    const showSpeedControl = mode === 2;
    
    return (
        <div 
            className={`${compact ? "py-2" : "py-3"} border-t first:border-t-0`} 
            style={{ borderColor: "var(--ui-border-primary)" }}
        >
            {/* Port header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Fan
                        className={`w-4 h-4 ${isActive ? "animate-spin" : ""}`}
                        style={{
                            color: isActive ? "var(--ui-accent-primary)" : "var(--ui-text-muted)",
                            animationDuration: isActive ? `${1.5 - speed / 15}s` : undefined,
                        }}
                    />
                    <span className="text-sm font-medium" style={{ color: "var(--ui-text-primary)" }}>
                        {port.portName}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {showSpeedControl && (
                        <span
                            className="text-sm font-semibold tabular-nums"
                            style={{ color: isActive ? "var(--ui-accent-primary)" : "var(--ui-text-muted)" }}
                        >
                            {speed === 0 ? "Off" : `${speed * 10}%`}
                        </span>
                    )}
                    <ModeSelector
                        value={mode}
                        onChange={onModeChange}
                        disabled={!port.isOnline}
                    />
                </div>
            </div>
            
            {/* Speed control - only for On mode */}
            {showSpeedControl && (
                <SpeedBar
                    value={speed}
                    onChange={onSpeedChange}
                    disabled={!port.isOnline}
                    compact={compact}
                />
            )}
            
            {/* Mode-specific info */}
            {mode === 3 && settings && (
                <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "var(--ui-text-muted)" }}>
                    <span>Temp: {settings.tempLow}°-{settings.tempHigh}°C</span>
                    <span>Hum: {settings.humidityLow}%-{settings.humidityHigh}%</span>
                </div>
            )}
            {mode === 8 && settings && (
                <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "var(--ui-text-muted)" }}>
                    <span>Target VPD: {settings.targetVpd.toFixed(1)}</span>
                    {settings.vpdLow > 0 && <span>Low: {settings.vpdLow.toFixed(1)}</span>}
                    {settings.vpdHigh > 0 && <span>High: {settings.vpdHigh.toFixed(1)}</span>}
                </div>
            )}
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
    const [portSettings, setPortSettings] = useState<Record<number, PortSettings>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [size, setSize] = useState({ w: 300, h: 200 });
    const ref = useRef<HTMLDivElement>(null);

    const { settings } = useWidgetSettings(widgetId);
    const controllerId = settings.selectedFan as string;
    const customName = settings.customName as string;
    const showInactive = settings.showInactivePorts === true;

    const { openSettings } = useWidgetSettingsDialog();

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
            if (!res.ok) throw new Error("Failed to fetch controllers");
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

    // Fetch port settings for selected controller
    const fetchPortSettings = useCallback(async (deviceId: string, ports: ACInfinityPort[]) => {
        const newSettings: Record<number, PortSettings> = {};
        for (const port of ports) {
            try {
                const res = await authService.fetchWithAuth(
                    `${AC_INFINITY_API}/${deviceId}/ports/${port.portIndex}/settings`
                );
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data) {
                        newSettings[port.portIndex] = json.data;
                    }
                }
            } catch (e) {
                console.error(`Failed to fetch settings for port ${port.portIndex}:`, e);
            }
        }
        setPortSettings(newSettings);
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

    // Fetch port settings when controller changes
    useEffect(() => {
        if (controller && controller.ports.length > 0) {
            fetchPortSettings(controller.deviceId, controller.ports);
        }
    }, [controller, fetchPortSettings]);

    // Set speed
    const setSpeed = useCallback(async (deviceId: string, portIndex: number, speed: number) => {
        // Optimistic update
        setPortSettings(prev => ({
            ...prev,
            [portIndex]: { ...prev[portIndex], onSpeed: speed }
        }));
        
        try {
            await authService.fetchWithAuth(
                `${AC_INFINITY_API}/${deviceId}/ports/${portIndex}/speed`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ speed }) }
            );
            // Refresh data after a delay
            setTimeout(fetchControllers, 2000);
        } catch (e) {
            console.error("Failed to set speed:", e);
        }
    }, [fetchControllers]);

    // Set mode
    const setMode = useCallback(async (deviceId: string, portIndex: number, mode: number) => {
        // Optimistic update
        setPortSettings(prev => ({
            ...prev,
            [portIndex]: { ...prev[portIndex], mode }
        }));
        
        try {
            await authService.fetchWithAuth(
                `${AC_INFINITY_API}/${deviceId}/ports/${portIndex}/mode`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) }
            );
            // Refresh data after a delay
            setTimeout(fetchControllers, 2000);
        } catch (e) {
            console.error("Failed to set mode:", e);
        }
    }, [fetchControllers]);

    // Filter ports
    const ports = useMemo(() => {
        if (!controller) return [];
        return showInactive
            ? controller.ports
            : controller.ports.filter(p => p.currentPower > 0 || p.deviceType > 0);
    }, [controller, showInactive]);

    const name = customName || controller?.deviceName || "Fan Controller";
    const humidity = controller?.humidity || 0;
    const vpd = controller?.vpd || 0;

    // VPD color coding
    const vpdColor = vpd < 0.4 ? "var(--ui-info)"
        : vpd < 1.2 ? "var(--ui-success)"
        : vpd < 1.6 ? "var(--ui-warning)"
        : "var(--ui-danger)";

    // Size thresholds
    const isCompact = size.h < 150;
    const isSmall = size.h < 220;

    // Loading state
    if (loading && !controllers.length) {
        return (
            <div ref={ref} className="flex items-center justify-center h-full">
                <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "var(--ui-text-muted)" }} />
            </div>
        );
    }

    // Error state
    if (error && !controllers.length) {
        return (
            <div ref={ref} className="flex flex-col items-center justify-center h-full gap-2">
                <AlertCircle className="w-5 h-5" style={{ color: "var(--ui-danger)" }} />
                <span className="text-xs" style={{ color: "var(--ui-text-muted)" }}>Connection error</span>
            </div>
        );
    }

    // Not configured
    if (!controllerId) {
        return (
            <div ref={ref} className="flex flex-col items-center justify-center h-full gap-3 p-4">
                <Fan className="w-8 h-8" style={{ color: "var(--ui-text-muted)" }} />
                <span className="text-sm" style={{ color: "var(--ui-text-muted)" }}>No controller selected</span>
                <button
                    onClick={() => openSettings(widgetId, "Fan Controller")}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: "var(--ui-accent-primary)", color: "white" }}
                >
                    <Settings className="w-3.5 h-3.5" />
                    Configure
                </button>
            </div>
        );
    }

    // Controller offline
    if (!controller?.isOnline) {
        return (
            <div ref={ref} className="flex flex-col items-center justify-center h-full gap-2 p-4">
                <Fan className="w-6 h-6" style={{ color: "var(--ui-text-muted)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--ui-text-primary)" }}>{name}</span>
                <span className="text-xs" style={{ color: "var(--ui-danger)" }}>Offline</span>
            </div>
        );
    }

    const primaryPort = ports[0];
    const primarySettings = primaryPort ? portSettings[primaryPort.portIndex] : null;
    const primarySpeed = primarySettings?.onSpeed ?? primaryPort?.currentPower ?? 0;
    const primaryMode = primarySettings?.mode ?? primaryPort?.currentMode ?? 2;
    const primaryActive = primarySpeed > 0 && primaryMode !== 1;

    // ==========================================================================
    // COMPACT VIEW
    // ==========================================================================
    if (isCompact) {
        return (
            <div ref={ref} className="flex flex-col h-full p-3 gap-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <Fan
                            className={`w-4 h-4 flex-shrink-0 ${primaryActive ? "animate-spin" : ""}`}
                            style={{
                                color: primaryActive ? "var(--ui-accent-primary)" : "var(--ui-text-muted)",
                                animationDuration: "1s",
                            }}
                        />
                        <span className="text-sm font-medium truncate" style={{ color: "var(--ui-text-primary)" }}>
                            {name}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs tabular-nums" style={{ color: "var(--ui-text-muted)" }}>
                            {controller.temperatureF.toFixed(0)}°F
                        </span>
                        {primaryPort && (
                            <ModeSelector
                                value={primaryMode}
                                onChange={(m) => setMode(controller.deviceId, primaryPort.portIndex, m)}
                                disabled={!primaryPort.isOnline}
                            />
                        )}
                    </div>
                </div>
                {primaryPort && primaryMode === 2 && (
                    <SpeedBar
                        value={primarySpeed}
                        onChange={(v) => setSpeed(controller.deviceId, primaryPort.portIndex, v)}
                        disabled={!primaryPort.isOnline}
                        compact
                    />
                )}
            </div>
        );
    }

    // ==========================================================================
    // SMALL VIEW - Single port with stats
    // ==========================================================================
    if (isSmall || ports.length <= 1) {
        return (
            <div ref={ref} className="flex flex-col h-full p-3 gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <Fan
                            className={`w-5 h-5 flex-shrink-0 ${primaryActive ? "animate-spin" : ""}`}
                            style={{
                                color: primaryActive ? "var(--ui-accent-primary)" : "var(--ui-text-muted)",
                                animationDuration: "1s",
                            }}
                        />
                        <span className="font-medium truncate" style={{ color: "var(--ui-text-primary)" }}>
                            {name}
                        </span>
                    </div>
                    {primaryPort && (
                        <ModeSelector
                            value={primaryMode}
                            onChange={(m) => setMode(controller.deviceId, primaryPort.portIndex, m)}
                            disabled={!primaryPort.isOnline}
                        />
                    )}
                </div>

                <div className="flex gap-2">
                    <StatCard
                        icon={<Thermometer className="w-3 h-3" />}
                        label="Temp"
                        value={`${controller.temperatureF.toFixed(0)}°F`}
                        subValue={`${controller.temperature.toFixed(0)}°C`}
                        compact
                    />
                    <StatCard
                        icon={<Droplets className="w-3 h-3" />}
                        label="Humidity"
                        value={`${humidity.toFixed(0)}%`}
                        compact
                    />
                    {vpd > 0 && (
                        <StatCard
                            icon={<Leaf className="w-3 h-3" />}
                            label="VPD"
                            value={vpd.toFixed(2)}
                            color={vpdColor}
                            compact
                        />
                    )}
                </div>

                {primaryPort && primaryMode === 2 && (
                    <div className="mt-auto">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs" style={{ color: "var(--ui-text-muted)" }}>Speed</span>
                            <span 
                                className="text-sm font-semibold tabular-nums"
                                style={{ color: primaryActive ? "var(--ui-accent-primary)" : "var(--ui-text-muted)" }}
                            >
                                {primarySpeed === 0 ? "Off" : `${primarySpeed * 10}%`}
                            </span>
                        </div>
                        <SpeedBar
                            value={primarySpeed}
                            onChange={(v) => setSpeed(controller.deviceId, primaryPort.portIndex, v)}
                            disabled={!primaryPort.isOnline}
                        />
                    </div>
                )}
            </div>
        );
    }

    // ==========================================================================
    // FULL VIEW - Multiple ports
    // ==========================================================================
    return (
        <div ref={ref} className="flex flex-col h-full p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="font-semibold" style={{ color: "var(--ui-text-primary)" }}>{name}</span>
                <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: "var(--ui-success-bg)", color: "var(--ui-success)" }}
                >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--ui-success)" }} />
                    Online
                </div>
            </div>

            <div className="flex gap-2 mb-3">
                <StatCard
                    icon={<Thermometer className="w-3.5 h-3.5" />}
                    label="Temp"
                    value={`${controller.temperatureF.toFixed(0)}°F`}
                    subValue={`${controller.temperature.toFixed(0)}°C`}
                />
                <StatCard
                    icon={<Droplets className="w-3.5 h-3.5" />}
                    label="Humidity"
                    value={`${humidity.toFixed(0)}%`}
                />
                {vpd > 0 && (
                    <StatCard
                        icon={<Leaf className="w-3.5 h-3.5" />}
                        label="VPD"
                        value={vpd.toFixed(2)}
                        color={vpdColor}
                    />
                )}
            </div>

            <div className="flex-1 overflow-auto -mx-4 px-4">
                {ports.map(port => (
                    <PortControl
                        key={port.portIndex}
                        port={port}
                        settings={portSettings[port.portIndex] || null}
                        onSpeedChange={(v) => setSpeed(controller.deviceId, port.portIndex, v)}
                        onModeChange={(m) => setMode(controller.deviceId, port.portIndex, m)}
                        compact={size.h < 350}
                    />
                ))}
            </div>
        </div>
    );
};

// =============================================================================
// WIDGET WRAPPER
// =============================================================================

const FanController: React.FC<FanControllerProps> = ({ widgetId }) => {
    return (
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
};

export default FanController;
