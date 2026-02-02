'use client';

import { memo, useMemo } from 'react';
import type { BaseVisualizationProps } from './utils';
import {
    EmptyState,
    ErrorState,
    getFieldValue,
    formatNumber,
    getPrimaryColor,
} from './utils';
import { cn } from '@/lib/utils';

/**
 * GaugeViz - A radial gauge/meter visualization component
 * 
 * Supports:
 * - Configurable min/max values
 * - Color zones (danger, warning, success)
 * - Target line
 * - Multiple arc styles
 * - Custom formatting
 */

interface GaugeZone {
    min: number;
    max: number;
    color: string;
}

function GaugeVizComponent({ data, config, loading, error }: BaseVisualizationProps) {
    // Extract configuration
    const {
        valueField,
        minValue = 0,
        maxValue = 100,
        startAngle = 180,
        endAngle = 0,
        arcWidth = 12,
        showValue = true,
        showMinMax = true,
        valueFormat = 'number',
        decimals = 0,
        label,
        suffix = '',
        target,
        zones,
    } = config;

    // Calculate value
    const value = useMemo(() => {
        const firstItem = data?.[0];
        if (!firstItem) return null;
        return getFieldValue(firstItem, valueField);
    }, [data, valueField]);

    // Calculate percentage and angle
    const { percentage, currentAngle } = useMemo(() => {
        if (value === null || typeof value !== 'number') {
            return { percentage: 0, currentAngle: startAngle };
        }

        const clampedValue = Math.min(Math.max(value, minValue), maxValue);
        const pct = (clampedValue - minValue) / (maxValue - minValue);
        const angle = startAngle + (endAngle - startAngle) * pct;

        return { percentage: pct * 100, currentAngle: angle };
    }, [value, minValue, maxValue, startAngle, endAngle]);

    // Format value for display
    const formattedValue = useMemo(() => {
        if (value === null || value === undefined) return '—';
        return formatNumber(value, valueFormat as any, decimals);
    }, [value, valueFormat, decimals]);

    // Default zones if not provided
    const defaultZones: GaugeZone[] = useMemo(() => {
        if (zones?.length) return zones;

        const range = maxValue - minValue;
        return [
            { min: minValue, max: minValue + range * 0.33, color: 'var(--ui-danger)' },
            { min: minValue + range * 0.33, max: minValue + range * 0.66, color: 'var(--ui-warning)' },
            { min: minValue + range * 0.66, max: maxValue, color: 'var(--ui-success)' },
        ];
    }, [zones, minValue, maxValue]);

    // Get current zone color
    const currentColor = useMemo(() => {
        if (value === null || typeof value !== 'number') {
            return 'var(--ui-border-primary)';
        }

        for (const zone of defaultZones) {
            if (value >= zone.min && value <= zone.max) {
                return zone.color;
            }
        }

        return getPrimaryColor(config);
    }, [value, defaultZones, config]);

    // SVG calculations
    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    const radius = (size - arcWidth * 2) / 2;

    // Convert angle to radians (SVG uses clockwise from 3 o'clock)
    const polarToCartesian = (angle: number, r: number) => {
        const angleInRadians = ((angle - 90) * Math.PI) / 180;
        return {
            x: cx + r * Math.cos(angleInRadians),
            y: cy + r * Math.sin(angleInRadians),
        };
    };

    // Create arc path
    const createArc = (fromAngle: number, toAngle: number, r: number) => {
        const start = polarToCartesian(fromAngle, r);
        const end = polarToCartesian(toAngle, r);
        const largeArcFlag = Math.abs(toAngle - fromAngle) > 180 ? 1 : 0;
        const sweepFlag = toAngle > fromAngle ? 1 : 0;

        return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
    };

    // Handle states
    if (error) return <ErrorState error={error} />;
    if (!loading && value === null) return <EmptyState />;

    return (
        <div className="w-full h-full flex items-center justify-center p-2">
            <div className="relative w-full max-w-[200px] aspect-square">
                <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
                    {/* Background arc */}
                    <path
                        d={createArc(startAngle, endAngle, radius)}
                        fill="none"
                        stroke="var(--ui-border-primary)"
                        strokeWidth={arcWidth}
                        strokeLinecap="round"
                    />

                    {/* Zone arcs */}
                    {defaultZones.map((zone, idx) => {
                        const zoneStartPct = (zone.min - minValue) / (maxValue - minValue);
                        const zoneEndPct = (zone.max - minValue) / (maxValue - minValue);
                        const zoneStartAngle = startAngle + (endAngle - startAngle) * zoneStartPct;
                        const zoneEndAngle = startAngle + (endAngle - startAngle) * zoneEndPct;

                        // Only show the filled portion up to the current value
                        if (percentage === 0) return null;

                        const fillEndAngle = Math.min(
                            zoneEndAngle,
                            Math.max(zoneStartAngle, currentAngle)
                        );

                        if (fillEndAngle <= zoneStartAngle) return null;

                        return (
                            <path
                                key={idx}
                                d={createArc(zoneStartAngle, fillEndAngle, radius)}
                                fill="none"
                                stroke={zone.color}
                                strokeWidth={arcWidth}
                                strokeLinecap="round"
                                className="transition-all duration-500"
                            />
                        );
                    })}

                    {/* Target marker */}
                    {target !== undefined && (
                        <>
                            {(() => {
                                const targetPct = (target - minValue) / (maxValue - minValue);
                                const targetAngle = startAngle + (endAngle - startAngle) * targetPct;
                                const outer = polarToCartesian(targetAngle, radius + arcWidth / 2 + 4);
                                const inner = polarToCartesian(targetAngle, radius - arcWidth / 2 - 4);

                                return (
                                    <line
                                        x1={outer.x}
                                        y1={outer.y}
                                        x2={inner.x}
                                        y2={inner.y}
                                        stroke="var(--ui-text-primary)"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                    />
                                );
                            })()}
                        </>
                    )}

                    {/* Needle/indicator */}
                    {value !== null && (
                        <circle
                            cx={polarToCartesian(currentAngle, radius).x}
                            cy={polarToCartesian(currentAngle, radius).y}
                            r={arcWidth / 2 + 2}
                            fill={currentColor}
                            stroke="var(--ui-background-primary)"
                            strokeWidth={2}
                            className="transition-all duration-500"
                        />
                    )}

                    {/* Min/Max labels */}
                    {showMinMax && (
                        <>
                            <text
                                x={polarToCartesian(startAngle, radius + arcWidth + 10).x}
                                y={polarToCartesian(startAngle, radius + arcWidth + 10).y}
                                textAnchor="middle"
                                className="fill-muted text-[10px]"
                            >
                                {formatNumber(minValue, valueFormat as any, 0)}
                            </text>
                            <text
                                x={polarToCartesian(endAngle, radius + arcWidth + 10).x}
                                y={polarToCartesian(endAngle, radius + arcWidth + 10).y}
                                textAnchor="middle"
                                className="fill-muted text-[10px]"
                            >
                                {formatNumber(maxValue, valueFormat as any, 0)}
                            </text>
                        </>
                    )}
                </svg>

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {showValue && (
                        <div
                            className="text-2xl font-bold tracking-tight"
                            style={{ color: currentColor }}
                        >
                            {formattedValue}{suffix}
                        </div>
                    )}
                    {label && (
                        <div className="text-xs text-muted mt-0.5">
                            {label}
                        </div>
                    )}
                    {target !== undefined && (
                        <div className="text-[10px] text-muted mt-1">
                            Target: {formatNumber(target, valueFormat as any, decimals)}{suffix}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export const GaugeViz = memo(GaugeVizComponent);
export default GaugeViz;
