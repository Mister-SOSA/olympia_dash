/**
 * FanController Widget
 * 
 * A multi-instance widget for controlling AC Infinity fan controllers.
 * Users can add multiple instances and configure each to control a different fan.
 * 
 * This is an example of a multi-instance widget pattern.
 */

import React, { useState, useEffect, useRef } from "react";
import Widget from "./Widget";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";
import { Fan, Settings2, Thermometer, Droplets, Power, AlertCircle } from "lucide-react";
import { getWidgetType } from "@/utils/widgetInstanceUtils";

// Widget type ID (used for settings schema lookup)
const WIDGET_TYPE = 'FanController';

// Props interface - multi-instance widgets receive widgetId
interface FanControllerProps {
    widgetId?: string;
}

// Mock fan data - in real implementation this would come from an API
interface FanDevice {
    id: string;
    name: string;
    model: string;
    location?: string;
}

// Mock list of available fans
const AVAILABLE_FANS: FanDevice[] = [
    { id: 'fan-1', name: 'Grow Room Fan', model: 'AC Infinity CLOUDLINE T6', location: 'Room A' },
    { id: 'fan-2', name: 'Drying Room Fan', model: 'AC Infinity CLOUDLINE S4', location: 'Room B' },
    { id: 'fan-3', name: 'Ventilation Fan', model: 'AC Infinity CLOUDLINE T8', location: 'Warehouse' },
    { id: 'fan-4', name: 'Server Room Fan', model: 'AC Infinity CLOUDLINE S6', location: 'IT' },
];

// Fan status interface
interface FanStatus {
    isOnline: boolean;
    currentSpeed: number;  // 0-10
    targetSpeed: number;   // 0-10
    temperature: number;   // Celsius
    humidity: number;      // Percentage
    mode: 'auto' | 'manual' | 'off';
}

// Mock fan status
const getMockFanStatus = (fanId: string): FanStatus => {
    // Generate semi-random but consistent status based on fan ID
    const hash = fanId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return {
        isOnline: hash % 10 !== 0, // 90% online
        currentSpeed: Math.floor((hash % 10) + 1),
        targetSpeed: Math.floor((hash % 10) + 1),
        temperature: 20 + (hash % 10),
        humidity: 40 + (hash % 20),
        mode: ['auto', 'manual', 'off'][hash % 3] as 'auto' | 'manual' | 'off',
    };
};

// Fan display content component
interface FanContentProps {
    widgetId: string;
}

const FanContent: React.FC<FanContentProps> = ({ widgetId }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [fanStatus, setFanStatus] = useState<FanStatus | null>(null);

    // Use widget-specific settings with the full instance ID
    const { settings } = useWidgetSettings(widgetId);
    const selectedFanId = settings.selectedFan as string;
    const showTemperature = settings.showTemperature as boolean;
    const showHumidity = settings.showHumidity as boolean;
    const displayMode = settings.displayMode as 'compact' | 'detailed';
    const customName = settings.customName as string;

    // Find the selected fan
    const selectedFan = AVAILABLE_FANS.find(f => f.id === selectedFanId);

    // Simulate fetching fan status
    useEffect(() => {
        if (!selectedFanId) {
            setFanStatus(null);
            return;
        }

        // Initial fetch
        setFanStatus(getMockFanStatus(selectedFanId));

        // Simulate periodic updates
        const interval = setInterval(() => {
            const status = getMockFanStatus(selectedFanId);
            // Add some randomness to make it look dynamic
            setFanStatus({
                ...status,
                currentSpeed: Math.max(0, Math.min(10, status.currentSpeed + (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.7 ? 1 : 0))),
                temperature: status.temperature + (Math.random() - 0.5) * 0.5,
                humidity: status.humidity + (Math.random() - 0.5) * 2,
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [selectedFanId]);

    // No fan selected state
    if (!selectedFanId || !selectedFan) {
        return (
            <div
                ref={containerRef}
                className="flex flex-col items-center justify-center h-full gap-2 p-4"
                style={{ color: 'var(--ui-text-muted)' }}
            >
                <Settings2 className="w-8 h-8 opacity-50" />
                <p className="text-sm text-center">No fan selected</p>
                <p className="text-xs text-center opacity-70">
                    Configure this widget to select a fan controller
                </p>
            </div>
        );
    }

    // Offline state
    if (fanStatus && !fanStatus.isOnline) {
        return (
            <div
                ref={containerRef}
                className="flex flex-col items-center justify-center h-full gap-2 p-4"
                style={{ color: 'var(--ui-danger)' }}
            >
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm font-medium">{customName || selectedFan.name}</p>
                <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>Offline</p>
            </div>
        );
    }

    // Compact display mode
    if (displayMode === 'compact') {
        return (
            <div ref={containerRef} className="flex items-center justify-between h-full p-3 gap-3">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                            backgroundColor: fanStatus?.mode === 'off'
                                ? 'var(--ui-bg-tertiary)'
                                : 'var(--ui-success-bg)',
                        }}
                    >
                        <Fan
                            className={`w-5 h-5 ${fanStatus?.mode !== 'off' ? 'animate-spin' : ''}`}
                            style={{
                                color: fanStatus?.mode === 'off'
                                    ? 'var(--ui-text-muted)'
                                    : 'var(--ui-success)',
                                animationDuration: fanStatus ? `${1.5 - (fanStatus.currentSpeed / 15)}s` : '1s',
                            }}
                        />
                    </div>
                    <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--ui-text-primary)' }}>
                            {customName || selectedFan.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                            Speed: {fanStatus?.currentSpeed || 0}/10
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {showTemperature && fanStatus && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ui-text-secondary)' }}>
                            <Thermometer className="w-3 h-3" />
                            {fanStatus.temperature.toFixed(1)}°C
                        </div>
                    )}
                    {showHumidity && fanStatus && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ui-text-secondary)' }}>
                            <Droplets className="w-3 h-3" />
                            {fanStatus.humidity.toFixed(0)}%
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Detailed display mode
    return (
        <div ref={containerRef} className="flex flex-col h-full p-4 gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                            backgroundColor: fanStatus?.mode === 'off'
                                ? 'var(--ui-bg-tertiary)'
                                : 'var(--ui-success-bg)',
                        }}
                    >
                        <Fan
                            className={`w-6 h-6 ${fanStatus?.mode !== 'off' ? 'animate-spin' : ''}`}
                            style={{
                                color: fanStatus?.mode === 'off'
                                    ? 'var(--ui-text-muted)'
                                    : 'var(--ui-success)',
                                animationDuration: fanStatus ? `${1.5 - (fanStatus.currentSpeed / 15)}s` : '1s',
                            }}
                        />
                    </div>
                    <div>
                        <p className="font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                            {customName || selectedFan.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                            {selectedFan.model}
                        </p>
                    </div>
                </div>
                <div
                    className="px-2 py-1 rounded-md text-xs font-medium capitalize"
                    style={{
                        backgroundColor: fanStatus?.mode === 'auto'
                            ? 'var(--ui-accent-primary-bg)'
                            : fanStatus?.mode === 'manual'
                                ? 'var(--ui-warning-bg)'
                                : 'var(--ui-bg-tertiary)',
                        color: fanStatus?.mode === 'auto'
                            ? 'var(--ui-accent-primary)'
                            : fanStatus?.mode === 'manual'
                                ? 'var(--ui-warning)'
                                : 'var(--ui-text-muted)',
                    }}
                >
                    {fanStatus?.mode || 'Unknown'}
                </div>
            </div>

            {/* Speed indicator */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>Fan Speed</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--ui-text-primary)' }}>
                        {fanStatus?.currentSpeed || 0}/10
                    </span>
                </div>
                <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                            width: `${((fanStatus?.currentSpeed || 0) / 10) * 100}%`,
                            backgroundColor: 'var(--ui-accent-primary)',
                        }}
                    />
                </div>
            </div>

            {/* Environment readings */}
            {(showTemperature || showHumidity) && (
                <div className="flex gap-4">
                    {showTemperature && fanStatus && (
                        <div
                            className="flex-1 p-3 rounded-lg"
                            style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Thermometer className="w-4 h-4" style={{ color: 'var(--ui-text-muted)' }} />
                                <span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>Temperature</span>
                            </div>
                            <p className="text-lg font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                                {fanStatus.temperature.toFixed(1)}°C
                            </p>
                        </div>
                    )}
                    {showHumidity && fanStatus && (
                        <div
                            className="flex-1 p-3 rounded-lg"
                            style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Droplets className="w-4 h-4" style={{ color: 'var(--ui-text-muted)' }} />
                                <span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>Humidity</span>
                            </div>
                            <p className="text-lg font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                                {fanStatus.humidity.toFixed(0)}%
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Location */}
            {selectedFan.location && (
                <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                    📍 {selectedFan.location}
                </div>
            )}
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
