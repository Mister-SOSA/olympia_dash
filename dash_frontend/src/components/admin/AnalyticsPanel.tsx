'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { authService } from '@/lib/auth';
import { API_BASE_URL } from '@/config';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/utils/dateUtils';
import {
    MdTrendingUp, MdPeople, MdAccessTime, MdDevices,
    MdRefresh, MdWidgets, MdVisibility, MdTimer, MdInsights,
    MdArrowUpward, MdArrowDownward, MdShowChart, MdToday
} from 'react-icons/md';

/* -------------------------------------- */
/* 📊 Types                               */
/* -------------------------------------- */
interface AnalyticsData {
    active_users: number;
    daily_active_users: Array<{ day: string; users: number }>;
    total_page_views: number;
    page_views_by_page: Array<{ page: string; count: number }>;
    total_widget_interactions: number;
    widget_interactions_by_type: Array<{ widget_type: string; count: number }>;
    interaction_types: Array<{ interaction_type: string; count: number }>;
    avg_session_duration_minutes: number;
    sessions_by_device: Array<{ device_type: string; count: number }>;
    hourly_activity: Array<{ hour: string; count: number }>;
    top_users: Array<{ id: number; email: string; name: string; page_views: number; widget_interactions: number }>;
    feature_usage: Array<{ feature_name: string; total_uses: number; unique_users: number }>;
    returning_users: number;
    user_types: Array<{ user_type: string; count: number }>;
    weekly_trends: Array<{ week: string; users: number; views: number }>;
}

interface RealtimeData {
    currently_active: number;
    hourly_views: Array<{ time_slot: string; count: number }>;
    recent_widget_activity: Array<{ widget_type: string; count: number }>;
    recent_sessions: Array<{ user_id: number; email: string; name: string; session_start: string; device_type: string }>;
    peak_concurrent_today: number;
}

type TimeRange = '7d' | '30d' | '90d';

/* -------------------------------------- */
/* 🎨 Color Palette                       */
/* -------------------------------------- */
const CHART_COLORS = [
    'var(--line-chart-1)',
    'var(--line-chart-2)',
    'var(--line-chart-3)',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#F59E0B',
    '#6366F1',
];

/* -------------------------------------- */
/* 📊 Custom Area Chart Component         */
/* -------------------------------------- */
interface AreaChartData {
    label: string;
    value: number;
}

interface CustomAreaChartProps {
    data: AreaChartData[];
    color?: string;
    height?: number;
}

const CustomAreaChart: React.FC<CustomAreaChartProps> = ({
    data,
    color = 'var(--line-chart-1)',
    height = 200
}) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            const { width } = entries[0].contentRect;
            setDimensions({ width, height });
        });
        resizeObserver.observe(chartRef.current);
        return () => resizeObserver.disconnect();
    }, [height]);

    if (!data.length || !dimensions.width) {
        return <div ref={chartRef} style={{ width: "100%", height }} />;
    }

    const padding = { top: 20, right: 15, bottom: 30, left: 50 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const minValue = 0;

    const xScale = (index: number) => padding.left + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const yScale = (value: number) => padding.top + chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;

    const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ');
    const areaPoints = `${padding.left},${padding.top + chartHeight} ${points} ${padding.left + chartWidth},${padding.top + chartHeight}`;

    const gradientId = `areaGradient-${Math.random().toString(36).substr(2, 9)}`;

    // Y-axis labels
    const yAxisSteps = 5;
    const yLabels = Array.from({ length: yAxisSteps }, (_, i) => {
        return minValue + (maxValue - minValue) * (i / (yAxisSteps - 1));
    });

    return (
        <div ref={chartRef} style={{ width: "100%", height, position: "relative" }}>
            <svg width={dimensions.width} height={height} style={{ overflow: "visible" }}>
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Grid lines */}
                {yLabels.map((value, i) => {
                    const y = yScale(value);
                    return (
                        <g key={i}>
                            <line
                                x1={padding.left}
                                y1={y}
                                x2={dimensions.width - padding.right}
                                y2={y}
                                stroke="var(--border-light)"
                                strokeWidth="1"
                                opacity="0.3"
                            />
                            <text
                                x={padding.left - 8}
                                y={y}
                                textAnchor="end"
                                alignmentBaseline="middle"
                                fill="var(--text-secondary)"
                                fontSize="10"
                                fontWeight="500"
                            >
                                {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : Math.round(value)}
                            </text>
                        </g>
                    );
                })}

                {/* Area fill */}
                <polygon points={areaPoints} fill={`url(#${gradientId})`} />

                {/* Line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Endpoint pulse */}
                {data.length > 0 && (
                    <g className="endpoint-pulse">
                        <circle
                            cx={xScale(data.length - 1)}
                            cy={yScale(data[data.length - 1].value)}
                            r="8"
                            fill={color}
                            opacity="0.2"
                        />
                        <circle
                            cx={xScale(data.length - 1)}
                            cy={yScale(data[data.length - 1].value)}
                            r="4"
                            fill={color}
                        />
                    </g>
                )}

                {/* Hover indicator */}
                {hoveredIndex !== null && (
                    <g>
                        <line
                            x1={xScale(hoveredIndex)}
                            y1={padding.top}
                            x2={xScale(hoveredIndex)}
                            y2={padding.top + chartHeight}
                            stroke="var(--text-muted)"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                            opacity="0.5"
                        />
                        <circle
                            cx={xScale(hoveredIndex)}
                            cy={yScale(data[hoveredIndex].value)}
                            r="5"
                            fill={color}
                            stroke="var(--ui-bg-primary)"
                            strokeWidth="2"
                        />
                    </g>
                )}

                {/* X-axis labels - show every few */}
                {data.map((d, i) => {
                    const showLabel = data.length <= 10 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1;
                    if (!showLabel) return null;
                    return (
                        <text
                            key={i}
                            x={xScale(i)}
                            y={padding.top + chartHeight + 18}
                            textAnchor="middle"
                            fill="var(--text-secondary)"
                            fontSize="10"
                            fontWeight="500"
                        >
                            {d.label}
                        </text>
                    );
                })}

                {/* Interactive overlay */}
                <rect
                    x={padding.left}
                    y={padding.top}
                    width={chartWidth}
                    height={chartHeight}
                    fill="transparent"
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const index = Math.round((x / chartWidth) * (data.length - 1));
                        if (index >= 0 && index < data.length) {
                            setHoveredIndex(index);
                        }
                    }}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ cursor: 'crosshair' }}
                />
            </svg>

            {/* Tooltip */}
            {hoveredIndex !== null && (
                <div
                    style={{
                        position: "absolute",
                        top: yScale(data[hoveredIndex].value) - 50,
                        left: xScale(hoveredIndex),
                        transform: "translateX(-50%)",
                        backgroundColor: "var(--ui-bg-primary)",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--ui-border-primary)",
                        pointerEvents: "none",
                        zIndex: 1000,
                        whiteSpace: "nowrap",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    }}
                >
                    <div style={{ color: "var(--text-muted)", fontSize: "10px", marginBottom: "2px", fontWeight: 600 }}>
                        {data[hoveredIndex].label}
                    </div>
                    <div style={{ color, fontSize: "16px", fontWeight: 700 }}>
                        {data[hoveredIndex].value.toLocaleString()}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes endpoint-pulse-anim {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                .endpoint-pulse {
                    animation: endpoint-pulse-anim 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

/* -------------------------------------- */
/* 📊 Custom Bar Chart Component          */
/* -------------------------------------- */
interface BarChartData {
    label: string;
    value: number;
    color?: string;
}

interface CustomBarChartProps {
    data: BarChartData[];
    horizontal?: boolean;
    height?: number;
    showValues?: boolean;
}

const CustomBarChart: React.FC<CustomBarChartProps> = ({
    data,
    horizontal = false,
    height = 250,
    showValues = true
}) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            const { width } = entries[0].contentRect;
            setDimensions({ width, height });
        });
        resizeObserver.observe(chartRef.current);
        return () => resizeObserver.disconnect();
    }, [height]);

    if (!data.length || !dimensions.width) {
        return <div ref={chartRef} style={{ width: "100%", height }} />;
    }

    const maxValue = Math.max(...data.map(d => d.value), 1);

    if (horizontal) {
        const padding = { top: 10, right: 60, bottom: 10, left: 120 };
        const chartHeight = height - padding.top - padding.bottom;
        const barHeight = Math.min(30, (chartHeight / data.length) - 8);
        const barGap = 8;

        return (
            <div ref={chartRef} style={{ width: "100%", height, position: "relative" }}>
                <svg width={dimensions.width} height={height} style={{ overflow: "visible" }}>
                    {data.map((item, index) => {
                        const y = padding.top + index * (barHeight + barGap);
                        const barWidth = ((item.value / maxValue) * (dimensions.width - padding.left - padding.right));
                        const isHovered = hoveredIndex === index;
                        const color = item.color || CHART_COLORS[index % CHART_COLORS.length];

                        return (
                            <g key={index}>
                                {/* Label */}
                                <text
                                    x={padding.left - 8}
                                    y={y + barHeight / 2}
                                    textAnchor="end"
                                    alignmentBaseline="middle"
                                    fill="var(--text-primary)"
                                    fontSize="11"
                                    fontWeight="500"
                                    style={{
                                        maxWidth: padding.left - 16,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}
                                >
                                    {item.label.length > 15 ? item.label.slice(0, 15) + '...' : item.label}
                                </text>

                                {/* Bar background */}
                                <rect
                                    x={padding.left}
                                    y={y}
                                    width={dimensions.width - padding.left - padding.right}
                                    height={barHeight}
                                    fill="var(--ui-bg-tertiary)"
                                    rx="4"
                                />

                                {/* Bar */}
                                <rect
                                    x={padding.left}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    fill={isHovered ? color : color}
                                    rx="4"
                                    opacity={isHovered ? 1 : 0.85}
                                    style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                />

                                {/* Value */}
                                {showValues && (
                                    <text
                                        x={padding.left + barWidth + 8}
                                        y={y + barHeight / 2}
                                        alignmentBaseline="middle"
                                        fill="var(--text-secondary)"
                                        fontSize="11"
                                        fontWeight="600"
                                    >
                                        {item.value.toLocaleString()}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
        );
    }

    // Vertical bars
    const padding = { top: 30, right: 10, bottom: 50, left: 10 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = Math.min(50, (chartWidth / data.length) - 12);
    const barGap = (chartWidth - barWidth * data.length) / (data.length + 1);

    return (
        <div ref={chartRef} style={{ width: "100%", height, position: "relative" }}>
            <svg width={dimensions.width} height={height} style={{ overflow: "visible" }}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const y = padding.top + chartHeight * (1 - ratio);
                    return (
                        <line
                            key={i}
                            x1={padding.left}
                            y1={y}
                            x2={dimensions.width - padding.right}
                            y2={y}
                            stroke="var(--border-light)"
                            strokeWidth="1"
                            opacity="0.3"
                        />
                    );
                })}

                {data.map((item, index) => {
                    const x = padding.left + barGap + index * (barWidth + barGap);
                    const barHeight = (item.value / maxValue) * chartHeight;
                    const y = padding.top + chartHeight - barHeight;
                    const isHovered = hoveredIndex === index;
                    const color = item.color || CHART_COLORS[index % CHART_COLORS.length];

                    return (
                        <g key={index}>
                            {/* Bar */}
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill={color}
                                rx="6"
                                ry="6"
                                opacity={isHovered ? 1 : 0.85}
                                style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />

                            {/* Value on top */}
                            {showValues && (
                                <text
                                    x={x + barWidth / 2}
                                    y={y - 8}
                                    textAnchor="middle"
                                    fill="var(--text-primary)"
                                    fontSize="12"
                                    fontWeight="700"
                                >
                                    {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
                                </text>
                            )}

                            {/* X-axis label */}
                            <text
                                x={x + barWidth / 2}
                                y={padding.top + chartHeight + 18}
                                textAnchor="middle"
                                fill="var(--text-secondary)"
                                fontSize="10"
                                fontWeight="500"
                            >
                                {item.label}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {/* Hover tooltip */}
            {hoveredIndex !== null && (
                <div
                    style={{
                        position: "absolute",
                        top: padding.top - 10,
                        left: padding.left + barGap + hoveredIndex * (barWidth + barGap) + barWidth / 2,
                        transform: "translateX(-50%)",
                        backgroundColor: "var(--ui-bg-primary)",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--ui-border-primary)",
                        pointerEvents: "none",
                        zIndex: 1000,
                        whiteSpace: "nowrap",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    }}
                >
                    <div style={{ color: "var(--text-muted)", fontSize: "10px", marginBottom: "2px", fontWeight: 600 }}>
                        {data[hoveredIndex].label}
                    </div>
                    <div style={{ color: data[hoveredIndex].color || CHART_COLORS[hoveredIndex % CHART_COLORS.length], fontSize: "16px", fontWeight: 700 }}>
                        {data[hoveredIndex].value.toLocaleString()}
                    </div>
                </div>
            )}
        </div>
    );
};

/* -------------------------------------- */
/* 📊 Custom Donut Chart Component        */
/* -------------------------------------- */
interface DonutChartData {
    label: string;
    value: number;
    color?: string;
}

interface CustomDonutChartProps {
    data: DonutChartData[];
    size?: number;
    strokeWidth?: number;
    showLegend?: boolean;
}

const CustomDonutChart: React.FC<CustomDonutChartProps> = ({
    data,
    size = 180,
    strokeWidth = 24,
    showLegend = true
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No data available
            </div>
        );
    }

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    let cumulativePercent = 0;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: size, height: size }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                    {/* Background circle */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="var(--ui-bg-tertiary)"
                        strokeWidth={strokeWidth}
                    />

                    {/* Data segments */}
                    {data.map((item, index) => {
                        const percent = item.value / total;
                        const strokeDasharray = `${percent * circumference} ${circumference}`;
                        const strokeDashoffset = -cumulativePercent * circumference;
                        const color = item.color || CHART_COLORS[index % CHART_COLORS.length];
                        cumulativePercent += percent;
                        const isHovered = hoveredIndex === index;

                        return (
                            <circle
                                key={index}
                                cx={center}
                                cy={center}
                                r={radius}
                                fill="none"
                                stroke={color}
                                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                style={{
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    opacity: hoveredIndex === null || isHovered ? 1 : 0.4
                                }}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                        );
                    })}
                </svg>

                {/* Center text */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {hoveredIndex !== null ? Math.round((data[hoveredIndex].value / total) * 100) : total.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {hoveredIndex !== null ? '%' : 'total'}
                    </div>
                </div>
            </div>

            {/* Legend */}
            {showLegend && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.map((item, index) => {
                        const color = item.color || CHART_COLORS[index % CHART_COLORS.length];
                        const percent = Math.round((item.value / total) * 100);
                        const isHovered = hoveredIndex === index;

                        return (
                            <div
                                key={index}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    backgroundColor: isHovered ? 'var(--ui-bg-tertiary)' : 'transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    opacity: hoveredIndex === null || isHovered ? 1 : 0.5
                                }}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '3px',
                                    backgroundColor: color,
                                    boxShadow: isHovered ? `0 0 0 3px ${color}30` : 'none',
                                    transition: 'box-shadow 0.2s ease'
                                }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {item.label}
                                    </div>
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {item.value.toLocaleString()} ({percent}%)
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* -------------------------------------- */
/* 📊 Stat Card Component                 */
/* -------------------------------------- */
interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: number;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, trend, color }) => {
    return (
        <div style={{
            backgroundColor: 'var(--ui-bg-secondary)',
            border: '1px solid var(--ui-border-primary)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
        }}>
            <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    {title}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </span>
                    {trend !== undefined && trend !== 0 && (
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: trend >= 0 ? 'var(--success)' : 'var(--error)'
                        }}>
                            {trend >= 0 ? <MdArrowUpward size={14} /> : <MdArrowDownward size={14} />}
                            {Math.abs(trend)}%
                        </span>
                    )}
                </div>
                {subtitle && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {subtitle}
                    </div>
                )}
            </div>
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: `${color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color
            }}>
                {icon}
            </div>
        </div>
    );
};

/* -------------------------------------- */
/* 📊 Time Range Selector                 */
/* -------------------------------------- */
interface TimeRangeSelectorProps {
    selected: TimeRange;
    onChange: (range: TimeRange) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ selected, onChange }) => {
    const ranges: { value: TimeRange; label: string }[] = [
        { value: '7d', label: '7 Days' },
        { value: '30d', label: '30 Days' },
        { value: '90d', label: '90 Days' },
    ];

    return (
        <div style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--ui-bg-tertiary)', borderRadius: '8px', padding: '3px' }}>
            {ranges.map((range) => (
                <button
                    key={range.value}
                    onClick={() => onChange(range.value)}
                    style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: selected === range.value ? 'white' : 'var(--text-secondary)',
                        backgroundColor: selected === range.value ? 'var(--accent-primary)' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                    }}
                >
                    {range.label}
                </button>
            ))}
        </div>
    );
};

/* -------------------------------------- */
/* 📊 Section Header Component            */
/* -------------------------------------- */
interface SectionProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon, children }) => {
    return (
        <div style={{
            backgroundColor: 'var(--ui-bg-secondary)',
            border: '1px solid var(--ui-border-primary)',
            borderRadius: '12px',
            overflow: 'hidden'
        }}>
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--ui-border-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                {icon && <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>}
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {title}
                </h3>
            </div>
            <div style={{ padding: '20px' }}>
                {children}
            </div>
        </div>
    );
};

/* -------------------------------------- */
/* 📊 Main Analytics Panel                */
/* -------------------------------------- */
export function AnalyticsPanel() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [realtime, setRealtime] = useState<RealtimeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('30d');
    const [activeTab, setActiveTab] = useState<'overview' | 'engagement' | 'widgets' | 'users'>('overview');

    useEffect(() => {
        loadData();
    }, [timeRange]);

    useEffect(() => {
        loadRealtimeData();
        const interval = setInterval(loadRealtimeData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
            const response = await authService.fetchWithAuth(
                `${API_BASE_URL}/api/auth/admin/analytics?days=${days}`
            );
            const data = await response.json();
            if (data.success) {
                setAnalytics(data.analytics);
            } else {
                toast.error('Failed to load analytics data');
            }
        } catch (error) {
            toast.error('Error loading analytics');
            console.error('Analytics error:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRealtimeData = async () => {
        try {
            const response = await authService.fetchWithAuth(
                `${API_BASE_URL}/api/auth/admin/analytics/realtime`
            );
            const data = await response.json();
            if (data.success) {
                setRealtime(data.realtime);
            }
        } catch (error) {
            console.error('Realtime analytics error:', error);
        }
    };

    const engagementRate = useMemo(() => {
        if (!analytics || analytics.total_page_views === 0) return 0;
        return Math.round((analytics.total_widget_interactions / analytics.total_page_views) * 100);
    }, [analytics]);

    const retentionRate = useMemo(() => {
        if (!analytics || analytics.active_users === 0) return 0;
        return Math.round((analytics.returning_users / analytics.active_users) * 100);
    }, [analytics]);

    const dauChartData = useMemo(() => {
        if (!analytics?.daily_active_users) return [];
        return analytics.daily_active_users.map(d => ({
            label: d.day.slice(5),
            value: d.users
        }));
    }, [analytics]);

    const hourlyChartData = useMemo(() => {
        if (!analytics?.hourly_activity) return [];
        return analytics.hourly_activity.map(h => ({
            label: `${h.hour}:00`,
            value: h.count,
            color: 'var(--line-chart-2)'
        }));
    }, [analytics]);

    const deviceChartData = useMemo(() => {
        if (!analytics?.sessions_by_device) return [];
        return analytics.sessions_by_device.map((d, i) => ({
            label: d.device_type || 'Unknown',
            value: d.count,
            color: CHART_COLORS[i % CHART_COLORS.length]
        }));
    }, [analytics]);

    const widgetChartData = useMemo(() => {
        if (!analytics?.widget_interactions_by_type) return [];
        return analytics.widget_interactions_by_type.slice(0, 10).map((w, i) => ({
            label: w.widget_type,
            value: w.count,
            color: CHART_COLORS[i % CHART_COLORS.length]
        }));
    }, [analytics]);

    const pageChartData = useMemo(() => {
        if (!analytics?.page_views_by_page) return [];
        return analytics.page_views_by_page.slice(0, 8).map((p, i) => ({
            label: p.page === '/' ? 'Dashboard' : p.page.replace(/^\//, ''),
            value: p.count,
            color: CHART_COLORS[i % CHART_COLORS.length]
        }));
    }, [analytics]);

    if (loading && !analytics) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px' }}>
                <div className="loader-spinner" />
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <MdInsights size={18} /> },
        { id: 'engagement', label: 'Engagement', icon: <MdTrendingUp size={18} /> },
        { id: 'widgets', label: 'Widgets', icon: <MdWidgets size={18} /> },
        { id: 'users', label: 'Users', icon: <MdPeople size={18} /> },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Analytics Dashboard
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                        Real insights into user behavior and engagement
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
                    <button
                        onClick={loadData}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            backgroundColor: 'var(--ui-bg-tertiary)',
                            border: '1px solid var(--ui-border-primary)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <MdRefresh size={16} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--ui-border-primary)', paddingBottom: '0' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 18px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            marginBottom: '-1px'
                        }}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Realtime Banner */}
            {realtime && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    backgroundColor: 'var(--ui-bg-secondary)',
                    border: '1px solid var(--ui-border-primary)',
                    borderRadius: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--success)',
                                animation: 'pulse 2s ease-in-out infinite'
                            }} />
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {realtime.currently_active} active now
                            </span>
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Peak today: <strong>{realtime.peak_concurrent_today}</strong> concurrent
                        </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updates every 30s</span>
                </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && analytics && (
                <>
                    {/* Stat Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                        <StatCard
                            title="Active Users"
                            value={analytics.active_users}
                            subtitle={`${retentionRate}% returning`}
                            icon={<MdPeople size={24} />}
                            trend={retentionRate > 50 ? retentionRate - 50 : undefined}
                            color="var(--line-chart-1)"
                        />
                        <StatCard
                            title="Page Views"
                            value={analytics.total_page_views}
                            icon={<MdVisibility size={24} />}
                            color="var(--line-chart-2)"
                        />
                        <StatCard
                            title="Widget Interactions"
                            value={analytics.total_widget_interactions}
                            subtitle={`${engagementRate}% engagement`}
                            icon={<MdWidgets size={24} />}
                            color="var(--line-chart-3)"
                        />
                        <StatCard
                            title="Avg. Session"
                            value={`${analytics.avg_session_duration_minutes} min`}
                            icon={<MdTimer size={24} />}
                            color="#8B5CF6"
                        />
                    </div>

                    {/* DAU Chart */}
                    <Section title="Daily Active Users" icon={<MdShowChart size={18} />}>
                        <CustomAreaChart data={dauChartData} color="var(--line-chart-1)" height={280} />
                    </Section>

                    {/* Two-column layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                        <Section title="Device Breakdown" icon={<MdDevices size={18} />}>
                            <CustomDonutChart data={deviceChartData} />
                        </Section>
                        <Section title="Activity by Hour" icon={<MdAccessTime size={18} />}>
                            <CustomBarChart data={hourlyChartData} height={220} />
                        </Section>
                    </div>
                </>
            )}

            {/* Engagement Tab */}
            {activeTab === 'engagement' && analytics && (
                <>
                    <Section title="Top Pages" icon={<MdVisibility size={18} />}>
                        <CustomBarChart data={pageChartData} horizontal height={Math.max(200, pageChartData.length * 45)} />
                    </Section>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        <Section title="User Retention" icon={<MdTrendingUp size={18} />}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--ui-bg-tertiary)', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--line-chart-1)' }}>{analytics.active_users}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Total Active</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--ui-bg-tertiary)', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--success)' }}>{analytics.returning_users}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Returning</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--ui-bg-tertiary)', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--line-chart-2)' }}>{retentionRate}%</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Retention</div>
                                </div>
                            </div>
                        </Section>

                        {analytics.interaction_types.length > 0 && (
                            <Section title="Interaction Types" icon={<MdWidgets size={18} />}>
                                <CustomDonutChart
                                    data={analytics.interaction_types.map((t, i) => ({
                                        label: t.interaction_type,
                                        value: t.count,
                                        color: CHART_COLORS[i % CHART_COLORS.length]
                                    }))}
                                    size={160}
                                />
                            </Section>
                        )}
                    </div>
                </>
            )}

            {/* Widgets Tab */}
            {activeTab === 'widgets' && analytics && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <StatCard
                            title="Widget Types Used"
                            value={analytics.widget_interactions_by_type.length}
                            icon={<MdWidgets size={24} />}
                            color="var(--line-chart-1)"
                        />
                        <StatCard
                            title="Total Interactions"
                            value={analytics.total_widget_interactions}
                            icon={<MdTrendingUp size={24} />}
                            color="var(--line-chart-2)"
                        />
                        <StatCard
                            title="Avg per User"
                            value={analytics.active_users > 0 ? Math.round(analytics.total_widget_interactions / analytics.active_users) : 0}
                            icon={<MdPeople size={24} />}
                            color="var(--line-chart-3)"
                        />
                    </div>

                    <Section title="Widget Popularity" icon={<MdWidgets size={18} />}>
                        <CustomBarChart data={widgetChartData} horizontal height={Math.max(250, widgetChartData.length * 40)} />
                    </Section>
                </>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && analytics && (
                <>
                    <Section title="Most Active Users" icon={<MdPeople size={18} />}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--ui-border-primary)' }}>
                                        <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rank</th>
                                        <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>User</th>
                                        <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Page Views</th>
                                        <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Interactions</th>
                                        <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.top_users.map((user, idx) => (
                                        <tr key={user.id} style={{ borderBottom: '1px solid var(--ui-border-primary)' }}>
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    backgroundColor: idx < 3 ? 'var(--accent-primary)' : 'var(--ui-bg-tertiary)',
                                                    color: idx < 3 ? 'white' : 'var(--text-secondary)'
                                                }}>
                                                    {idx + 1}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name || user.email}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.email}</div>
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>{user.page_views.toLocaleString()}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>{user.widget_interactions.toLocaleString()}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)' }}>{(user.page_views + user.widget_interactions).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>

                    {realtime && realtime.recent_sessions.length > 0 && (
                        <Section title="Recent Sessions" icon={<MdToday size={18} />}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {realtime.recent_sessions.map((session, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        backgroundColor: 'var(--ui-bg-tertiary)',
                                        borderRadius: '8px'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{session.name || session.email}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                backgroundColor: 'var(--ui-bg-secondary)',
                                                borderRadius: '4px',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                {session.device_type || 'unknown'}
                                            </span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {formatRelativeTime(session.session_start)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}
                </>
            )}

            {/* Empty State */}
            {analytics && analytics.active_users === 0 && analytics.total_page_views === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: 'var(--ui-bg-secondary)',
                    border: '1px solid var(--ui-border-primary)',
                    borderRadius: '12px'
                }}>
                    <MdInsights size={64} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                    <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        No Analytics Data Yet
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', maxWidth: '400px', marginInline: 'auto' }}>
                        Analytics data will appear here as users interact with the dashboard.
                        Make sure the analytics tracking service is enabled.
                    </p>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.1); }
                }
            `}</style>
        </div>
    );
}
