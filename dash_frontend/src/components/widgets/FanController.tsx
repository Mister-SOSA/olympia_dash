/**
 * FanController Widget
 *
 * A multi-instance widget for monitoring AC Infinity fan controllers.
 * Users can add multiple instances and configure each to monitor a different controller.
 *
 * Fetches real data from the AC Infinity cloud API via the backend.
 */

import React, { useState, useEffect, useCallback } from "react";
import Widget from "./Widget";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";
import { useWidgetSettingsDialog } from "@/contexts/WidgetSettingsDialogContext";
import {
    Fan,
    Settings2,
    Thermometer,
    Droplets,
    AlertCircle,
    Wifi,
    WifiOff,
    RefreshCw,
    Leaf,
    Settings,
} from "lucide-react";
import { authService } from "@/lib/auth";

// Widget type ID (used for settings schema lookup)
const WIDGET_TYPE = "FanController";

// API endpoint
const AC_INFINITY_API = `/api/ac-infinity/controllers`;

// Props interface - multi-instance widgets receive widgetId
interface FanControllerProps {
    widgetId?: string;
}

// API response types
interface ACInfinityPort {
    portIndex: number;
    portName: string;
    deviceType: number;
    isOnline: boolean;
    currentPower: number;
}

interface ACInfinityController {
    deviceId: string;
    deviceName: string;
    deviceCode: string;
    macAddress: string;
    deviceType: number;
    deviceTypeName: string;
    firmwareVersion: string;
    isOnline: boolean;
    temperature: number;
    temperatureF: number;
    humidity: number;
    vpd: number;
    ports: ACInfinityPort[];
}

interface APIResponse {
    success: boolean;
    data: ACInfinityController[];
    error?: string;
    timestamp?: string;
}

// Fan display content component
interface FanContentProps {
    widgetId: string;
}

const FanContent: React.FC<FanContentProps> = ({ widgetId }) => {
    const [controllers, setControllers] = useState<ACInfinityController[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    // Use widget-specific settings with the full instance ID
    const { settings, updateSetting } = useWidgetSettings(widgetId);
    const selectedControllerId = settings.selectedFan as string;
    const showTemperature = settings.showTemperature !== false;
    const showHumidity = settings.showHumidity !== false;
    const displayMode = (settings.displayMode as "compact" | "detailed") || "detailed";
    const customName = settings.customName as string;

    // Settings dialog context
    const { openSettings } = useWidgetSettingsDialog();

    // Fetch controllers from API
    const fetchControllers = useCallback(async () => {
        try {
            const response = await authService.fetchWithAuth(AC_INFINITY_API);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data: APIResponse = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to fetch controllers");
            }

            setControllers(data.data || []);
            setLastUpdate(new Date());
            setError(null);
        } catch (err) {
            console.error("Error fetching AC Infinity controllers:", err);
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch and polling
    useEffect(() => {
        fetchControllers();

        // Poll every 30 seconds
        const interval = setInterval(fetchControllers, 30000);

        return () => clearInterval(interval);
    }, [fetchControllers]);

    // Find the selected controller
    const selectedController = controllers.find(
        (c) => c.deviceId === selectedControllerId
    );

    // Loading state
    if (loading && controllers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
                <RefreshCw
                    className="w-8 h-8 animate-spin"
                    style={{ color: "var(--ui-text-muted)" }}
                />
                <p className="text-sm" style={{ color: "var(--ui-text-muted)" }}>
                    Loading controllers...
                </p>
            </div>
        );
    }

    // Error state (but no cached data)
    if (error && controllers.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center h-full gap-2 p-4"
                style={{ color: "var(--ui-danger)" }}
            >
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm font-medium">Connection Error</p>
                <p
                    className="text-xs text-center"
                    style={{ color: "var(--ui-text-muted)" }}
                >
                    {error}
                </p>
                <button
                    onClick={fetchControllers}
                    className="mt-2 px-3 py-1 text-xs rounded-md"
                    style={{
                        backgroundColor: "var(--ui-bg-tertiary)",
                        color: "var(--ui-text-secondary)",
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    // No controller selected state - show button to open settings
    if (!selectedControllerId) {
        return (
            <div
                className="flex flex-col items-center justify-center h-full gap-3 p-4"
                style={{ color: "var(--ui-text-muted)" }}
            >
                <Fan className="w-10 h-10 opacity-50" />
                <p className="text-sm font-medium" style={{ color: "var(--ui-text-primary)" }}>
                    No Controller Selected
                </p>
                <p className="text-xs text-center opacity-70">
                    {controllers.length > 0
                        ? `${controllers.length} controller${controllers.length !== 1 ? "s" : ""} available`
                        : "Loading controllers..."
                    }
                </p>
                <button
                    onClick={() => openSettings(widgetId, "Fan Controller")}
                    className="mt-2 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    style={{
                        backgroundColor: "var(--ui-accent-primary)",
                        color: "var(--ui-bg-primary)",
                    }}
                >
                    <Settings className="w-4 h-4" />
                    Configure
                </button>
            </div>
        );
    }

    // Controller not found
    if (!selectedController) {
        return (
            <div
                className="flex flex-col items-center justify-center h-full gap-2 p-4"
                style={{ color: "var(--ui-warning)" }}
            >
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm font-medium">Controller Not Found</p>
                <p
                    className="text-xs text-center"
                    style={{ color: "var(--ui-text-muted)" }}
                >
                    The selected controller is no longer available
                </p>
            </div>
        );
    }

    // Offline state
    if (!selectedController.isOnline) {
        return (
            <div
                className="flex flex-col items-center justify-center h-full gap-2 p-4"
                style={{ color: "var(--ui-danger)" }}
            >
                <WifiOff className="w-8 h-8" />
                <p className="text-sm font-medium">
                    {customName || selectedController.deviceName}
                </p>
                <p className="text-xs" style={{ color: "var(--ui-text-muted)" }}>
                    Offline
                </p>
            </div>
        );
    }

    const displayName = customName || selectedController.deviceName;

    // Compact display mode
    if (displayMode === "compact") {
        return (
            <div className="flex items-center justify-between h-full p-3 gap-3">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: "var(--ui-success-bg)" }}
                    >
                        <Fan
                            className="w-5 h-5 animate-spin"
                            style={{
                                color: "var(--ui-success)",
                                animationDuration: "1.5s",
                            }}
                        />
                    </div>
                    <div>
                        <p
                            className="text-sm font-medium"
                            style={{ color: "var(--ui-text-primary)" }}
                        >
                            {displayName}
                        </p>
                        <p className="text-xs" style={{ color: "var(--ui-text-muted)" }}>
                            {selectedController.deviceTypeName}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {showTemperature && (
                        <div
                            className="flex items-center gap-1 text-xs"
                            style={{ color: "var(--ui-text-secondary)" }}
                        >
                            <Thermometer className="w-3 h-3" />
                            {selectedController.temperature.toFixed(1)}°C
                        </div>
                    )}
                    {showHumidity && (
                        <div
                            className="flex items-center gap-1 text-xs"
                            style={{ color: "var(--ui-text-secondary)" }}
                        >
                            <Droplets className="w-3 h-3" />
                            {selectedController.humidity.toFixed(0)}%
                        </div>
                    )}
                    <Wifi className="w-3 h-3" style={{ color: "var(--ui-success)" }} />
                </div>
            </div>
        );
    }

    // Detailed display mode
    return (
        <div className="flex flex-col h-full p-4 gap-3 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: "var(--ui-success-bg)" }}
                    >
                        <Fan
                            className="w-6 h-6 animate-spin"
                            style={{
                                color: "var(--ui-success)",
                                animationDuration: "1.5s",
                            }}
                        />
                    </div>
                    <div>
                        <p
                            className="font-semibold"
                            style={{ color: "var(--ui-text-primary)" }}
                        >
                            {displayName}
                        </p>
                        <p className="text-xs" style={{ color: "var(--ui-text-muted)" }}>
                            {selectedController.deviceTypeName}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4" style={{ color: "var(--ui-success)" }} />
                    {error && (
                        <span title="Showing cached data">
                            <AlertCircle
                                className="w-4 h-4"
                                style={{ color: "var(--ui-warning)" }}
                            />
                        </span>
                    )}
                </div>
            </div>

            {/* Environment readings */}
            <div className="flex gap-3 flex-wrap">
                {showTemperature && (
                    <div
                        className="flex-1 min-w-[100px] p-3 rounded-lg"
                        style={{ backgroundColor: "var(--ui-bg-tertiary)" }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Thermometer
                                className="w-4 h-4"
                                style={{ color: "var(--ui-text-muted)" }}
                            />
                            <span
                                className="text-xs"
                                style={{ color: "var(--ui-text-muted)" }}
                            >
                                Temperature
                            </span>
                        </div>
                        <p
                            className="text-lg font-semibold"
                            style={{ color: "var(--ui-text-primary)" }}
                        >
                            {selectedController.temperature.toFixed(1)}°C
                        </p>
                        <p
                            className="text-xs"
                            style={{ color: "var(--ui-text-muted)" }}
                        >
                            {selectedController.temperatureF.toFixed(1)}°F
                        </p>
                    </div>
                )}
                {showHumidity && (
                    <div
                        className="flex-1 min-w-[100px] p-3 rounded-lg"
                        style={{ backgroundColor: "var(--ui-bg-tertiary)" }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Droplets
                                className="w-4 h-4"
                                style={{ color: "var(--ui-text-muted)" }}
                            />
                            <span
                                className="text-xs"
                                style={{ color: "var(--ui-text-muted)" }}
                            >
                                Humidity
                            </span>
                        </div>
                        <p
                            className="text-lg font-semibold"
                            style={{ color: "var(--ui-text-primary)" }}
                        >
                            {selectedController.humidity.toFixed(0)}%
                        </p>
                    </div>
                )}
                {selectedController.vpd > 0 && (
                    <div
                        className="flex-1 min-w-[100px] p-3 rounded-lg"
                        style={{ backgroundColor: "var(--ui-bg-tertiary)" }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Leaf
                                className="w-4 h-4"
                                style={{ color: "var(--ui-text-muted)" }}
                            />
                            <span
                                className="text-xs"
                                style={{ color: "var(--ui-text-muted)" }}
                            >
                                VPD
                            </span>
                        </div>
                        <p
                            className="text-lg font-semibold"
                            style={{ color: "var(--ui-text-primary)" }}
                        >
                            {selectedController.vpd.toFixed(2)}
                        </p>
                    </div>
                )}
            </div>

            {/* Ports/Fans */}
            {selectedController.ports.length > 0 && (
                <div className="flex-1 overflow-auto">
                    <p
                        className="text-xs mb-2"
                        style={{ color: "var(--ui-text-muted)" }}
                    >
                        Connected Devices
                    </p>
                    <div className="space-y-2">
                        {selectedController.ports.map((port) => (
                            <div
                                key={port.portIndex}
                                className="flex items-center justify-between p-2 rounded-lg"
                                style={{ backgroundColor: "var(--ui-bg-tertiary)" }}
                            >
                                <div className="flex items-center gap-2">
                                    <Fan
                                        className={`w-4 h-4 ${port.currentPower > 0 ? "animate-spin" : ""}`}
                                        style={{
                                            color:
                                                port.currentPower > 0
                                                    ? "var(--ui-success)"
                                                    : "var(--ui-text-muted)",
                                            animationDuration: `${1.5 - port.currentPower / 15}s`,
                                        }}
                                    />
                                    <span
                                        className="text-sm"
                                        style={{ color: "var(--ui-text-primary)" }}
                                    >
                                        {port.portName}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="text-xs"
                                        style={{ color: "var(--ui-text-muted)" }}
                                    >
                                        {port.currentPower}/10
                                    </span>
                                    <div
                                        className="w-16 h-2 rounded-full overflow-hidden"
                                        style={{ backgroundColor: "var(--ui-bg-secondary)" }}
                                    >
                                        <div
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{
                                                width: `${(port.currentPower / 10) * 100}%`,
                                                backgroundColor:
                                                    port.currentPower > 0
                                                        ? "var(--ui-accent-primary)"
                                                        : "var(--ui-text-muted)",
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer with info */}
            <div
                className="text-xs flex items-center justify-between pt-2 border-t"
                style={{
                    color: "var(--ui-text-muted)",
                    borderColor: "var(--ui-border-primary)",
                }}
            >
                <span>FW: {selectedController.firmwareVersion}</span>
                {lastUpdate && (
                    <span>
                        Updated {lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                )}
            </div>
        </div>
    );
};

/**
 * FanController Widget Component
 * 
 * This is a multi-instance widget - each instance can be configured
 * to control a different fan. The widgetId prop is used to:
 * 1. Store instance-specific settings
 * 2. Track which fan this instance controls
 */
const FanController: React.FC<FanControllerProps> = ({ widgetId }) => {
    // Use the widget type for singleton behavior if no widgetId provided
    const instanceId = widgetId || WIDGET_TYPE;

    return (
        <Widget
            endpoint={undefined}
            payload={undefined}
            title=""
            refreshInterval={undefined}
            widgetId={instanceId}
        >
            {() => <FanContent widgetId={instanceId} />}
        </Widget>
    );
};

export default FanController;
