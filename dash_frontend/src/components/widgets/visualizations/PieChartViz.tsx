'use client';

import { memo, useMemo } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Sector,
} from 'recharts';
import type { BaseVisualizationProps } from './utils';
import {
    EmptyState,
    ErrorState,
    getChartColors,
    getFieldValue,
    formatNumber,
} from './utils';
import { useState, useCallback } from 'react';

/**
 * PieChartViz - A versatile pie/donut chart visualization component
 * 
 * Supports:
 * - Pie and donut modes
 * - Interactive hover states
 * - Custom colors
 * - Inner labels
 * - Configurable formatting
 */

interface ActiveShapeProps {
    cx: number;
    cy: number;
    innerRadius: number;
    outerRadius: number;
    startAngle: number;
    endAngle: number;
    fill: string;
    payload: any;
    percent: number;
    value: number;
    name: string;
    valueFormat: string;
    decimals: number;
}

const RenderActiveShape = (props: ActiveShapeProps) => {
    const {
        cx,
        cy,
        innerRadius,
        outerRadius,
        startAngle,
        endAngle,
        fill,
        payload,
        percent,
        value,
        valueFormat,
        decimals,
    } = props;

    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 6}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 8}
                outerRadius={outerRadius + 10}
                fill={fill}
            />
            {innerRadius > 0 && (
                <>
                    <text
                        x={cx}
                        y={cy - 8}
                        textAnchor="middle"
                        fill="var(--ui-text-primary)"
                        fontSize={12}
                        fontWeight={600}
                    >
                        {payload.name}
                    </text>
                    <text
                        x={cx}
                        y={cy + 8}
                        textAnchor="middle"
                        fill="var(--ui-text-secondary)"
                        fontSize={11}
                    >
                        {formatNumber(value, valueFormat as any, decimals)}
                    </text>
                    <text
                        x={cx}
                        y={cy + 22}
                        textAnchor="middle"
                        fill="var(--ui-text-tertiary)"
                        fontSize={10}
                    >
                        {`${(percent * 100).toFixed(1)}%`}
                    </text>
                </>
            )}
        </g>
    );
};

function PieChartVizComponent({ data, config, loading, error }: BaseVisualizationProps) {
    const colors = useMemo(() => getChartColors(config), [config]);
    const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

    // Extract configuration
    const {
        nameField,
        valueField,
        donut = false,
        showLegend = true,
        showTooltip = true,
        showLabels = false,
        valueFormat = 'number',
        decimals = 0,
        innerRadius = donut ? 60 : 0,
        outerRadius = 80,
        paddingAngle = 2,
        startAngle = 90,
        endAngle = 450,
    } = config;

    // Process data
    const chartData = useMemo(() => {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return [];
        }

        return data.map((item, idx) => ({
            name: getFieldValue(item, nameField) || `Item ${idx + 1}`,
            value: getFieldValue(item, valueField) || 0,
            color: item.color || colors[idx % colors.length],
        })).filter(item => item.value > 0);
    }, [data, nameField, valueField, colors]);

    // Callbacks
    const onPieEnter = useCallback((_: any, index: number) => {
        setActiveIndex(index);
    }, []);

    const onPieLeave = useCallback(() => {
        setActiveIndex(undefined);
    }, []);

    // Format tooltip value
    const formatTooltipValue = (value: number) => {
        return formatNumber(value, valueFormat as any, decimals);
    };

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload[0] || !showTooltip) return null;

        const data = payload[0];
        const total = chartData.reduce((sum, item) => sum + item.value, 0);
        const percent = ((data.value / total) * 100).toFixed(1);

        return (
            <div className="rounded-md bg-ui-background-primary border border-ui-border-primary p-2 shadow-lg">
                <div className="flex items-center gap-2 text-xs">
                    <div
                        className="w-2 h-2 rounded-sm"
                        style={{ backgroundColor: data.payload.color }}
                    />
                    <span className="font-medium">{data.name}</span>
                </div>
                <div className="mt-1 text-xs text-muted">
                    {formatTooltipValue(data.value)} ({percent}%)
                </div>
            </div>
        );
    };

    // Custom label
    const renderLabel = ({
        cx,
        cy,
        midAngle,
        innerRadius,
        outerRadius,
        percent,
        name,
    }: any) => {
        if (!showLabels || percent < 0.05) return null;

        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={500}
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    // Custom legend
    const renderLegend = ({ payload }: any) => {
        return (
            <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs mt-2">
                {payload.map((entry: any, index: number) => (
                    <li key={`legend-${index}`} className="flex items-center gap-1">
                        <span
                            className="w-2 h-2 rounded-sm"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted truncate max-w-[80px]">
                            {entry.value}
                        </span>
                    </li>
                ))}
            </ul>
        );
    };

    // Handle states
    if (error) return <ErrorState error={error} />;
    if (!loading && chartData.length === 0) return <EmptyState />;

    // Calculate responsive radius
    const effectiveInnerRadius = donut ? `${innerRadius}%` : 0;
    const effectiveOuterRadius = `${outerRadius}%`;

    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 5, right: 5, left: 5, bottom: showLegend ? 25 : 5 }}>
                    <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy={showLegend ? "45%" : "50%"}
                        innerRadius={effectiveInnerRadius}
                        outerRadius={effectiveOuterRadius}
                        paddingAngle={paddingAngle}
                        startAngle={startAngle}
                        endAngle={endAngle}
                        activeIndex={activeIndex}
                        activeShape={(props: any) => (
                            <RenderActiveShape
                                {...props}
                                valueFormat={valueFormat}
                                decimals={decimals}
                            />
                        )}
                        onMouseEnter={onPieEnter}
                        onMouseLeave={onPieLeave}
                        label={showLabels ? renderLabel : false}
                        labelLine={false}
                        isAnimationActive={!loading}
                    >
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                stroke="var(--ui-background-primary)"
                                strokeWidth={2}
                            />
                        ))}
                    </Pie>

                    {showTooltip && <Tooltip content={<CustomTooltip />} />}

                    {showLegend && (
                        <Legend
                            content={renderLegend}
                            verticalAlign="bottom"
                        />
                    )}
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export const PieChartViz = memo(PieChartVizComponent);
export default PieChartViz;
