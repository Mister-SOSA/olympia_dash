"use client";

import React, { memo, useState, useEffect, useMemo } from "react";
import { MdArrowUpward, MdArrowDownward } from "react-icons/md";

// ============================================
// Types
// ============================================

export interface ComplicationPreviewProps {
    data: {
        value?: string;
        label?: string;
        trend?: 'up' | 'down' | 'neutral';
        trendValue?: string;
        delta?: string;
        status?: 'good' | 'warning' | 'error' | 'neutral';
        secondaryValue?: string;
        icon?: string;
        chartData?: number[];
    };
}

// ============================================
// Clock Preview: Live analog clock
// ============================================

export const ClockPreview = memo(function ClockPreview({ data }: ComplicationPreviewProps) {
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

// ============================================
// Date Preview: Calendar page style
// ============================================

export const DatePreview = memo(function DatePreview({ data }: ComplicationPreviewProps) {
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

// ============================================
// Gauge Preview: Circular progress for humidity/percentages
// ============================================

export const GaugePreview = memo(function GaugePreview({ data }: ComplicationPreviewProps) {
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

// ============================================
// Default Text Preview: Standard value + label + trend
// ============================================

export const DefaultPreview = memo(function DefaultPreview({ data }: ComplicationPreviewProps) {
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

// ============================================
// YTD Sales Preview: Robinhood-style
// ============================================

export const SalesYTDPreview = memo(function SalesYTDPreview({ data }: ComplicationPreviewProps) {
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

// ============================================
// Preview Registry: Maps widget IDs to their custom preview components
// ============================================

export const WIDGET_PREVIEWS: Record<string, React.ComponentType<ComplicationPreviewProps>> = {
    ClockWidget: ClockPreview,
    DateWidget: DatePreview,
    Humidity: GaugePreview,
    FanController: GaugePreview,
    SalesYTDCumulativeLine: SalesYTDPreview,
};
