'use client';

import { memo, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine,
    Area,
} from 'recharts';
import type { BaseVisualizationProps } from './utils';
import {
    EmptyState,
    ErrorState,
    getChartColors,
    getFieldValue,
    formatNumber,
    compactNumber,
} from './utils';

/**
 * LineChartViz - A versatile line chart visualization component
 * 
 * Supports:
 * - Single and multiple series
 * - Area fill option
 * - Reference lines
 * - Curved and straight lines
 * - Custom colors
 * - Configurable formatting
 */
function LineChartVizComponent({ data, config, loading, error }: BaseVisualizationProps) {
    const colors = useMemo(() => getChartColors(config), [config]);

    // Extract configuration
    const {
        xAxisField,
        yAxisField,
        series = [],
        showGrid = true,
        showLegend = false,
        showTooltip = true,
        showArea = false,
        curved = true,
        showDots = true,
        dotSize = 3,
        strokeWidth = 2,
        valueFormat = 'number',
        compactValues = false,
        decimals = 0,
        referenceLines = [],
    } = config;

    // Process data
    const chartData = useMemo(() => {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return [];
        }

        if (series.length === 0 && yAxisField) {
            return data.map((item) => ({
                name: getFieldValue(item, xAxisField),
                [yAxisField]: getFieldValue(item, yAxisField),
            }));
        }

        return data.map((item) => {
            const result: Record<string, any> = {
                name: getFieldValue(item, xAxisField),
            };

            series.forEach((s) => {
                result[s.field] = getFieldValue(item, s.field);
            });

            return result;
        });
    }, [data, xAxisField, yAxisField, series]);

    // Generate series configuration
    const seriesConfig = useMemo(() => {
        if (series.length > 0) {
            return series.map((s, idx) => ({
                field: s.field,
                name: s.label || s.field,
                color: s.color || colors[idx % colors.length],
            }));
        }

        if (yAxisField) {
            return [{
                field: yAxisField,
                name: yAxisField,
                color: colors[0],
            }];
        }

        return [];
    }, [series, yAxisField, colors]);

    // Format functions
    const formatTick = (value: number) => {
        if (compactValues) {
            return compactNumber(value, decimals);
        }
        return formatNumber(value, valueFormat, decimals);
    };

    const formatTooltipValue = (value: number) => {
        return formatNumber(value, valueFormat, decimals);
    };

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !showTooltip) return null;

        return (
            <div className="rounded-md bg-ui-background-primary border border-ui-border-primary p-2 shadow-lg">
                <p className="text-xs font-medium text-muted mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted">{entry.name}:</span>
                        <span className="font-medium">{formatTooltipValue(entry.value)}</span>
                    </div>
                ))}
            </div>
        );
    };

    // Custom dot
    const CustomDot = ({ cx, cy, stroke }: any) => {
        if (!showDots) return null;
        return (
            <circle
                cx={cx}
                cy={cy}
                r={dotSize}
                fill="var(--ui-background-primary)"
                stroke={stroke}
                strokeWidth={1.5}
            />
        );
    };

    // Custom active dot
    const CustomActiveDot = ({ cx, cy, stroke }: any) => (
        <circle
            cx={cx}
            cy={cy}
            r={dotSize + 2}
            fill={stroke}
            stroke="var(--ui-background-primary)"
            strokeWidth={2}
        />
    );

    // Handle states
    if (error) return <ErrorState error={error} />;
    if (!loading && chartData.length === 0) return <EmptyState />;

    const curveType = curved ? 'monotone' : 'linear';

    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                    {showGrid && (
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--ui-border-primary)"
                            opacity={0.5}
                        />
                    )}

                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: 'var(--ui-text-secondary)' }}
                        axisLine={{ stroke: 'var(--ui-border-primary)' }}
                        tickLine={{ stroke: 'var(--ui-border-primary)' }}
                    />

                    <YAxis
                        tickFormatter={formatTick}
                        tick={{ fontSize: 10, fill: 'var(--ui-text-secondary)' }}
                        axisLine={{ stroke: 'var(--ui-border-primary)' }}
                        tickLine={{ stroke: 'var(--ui-border-primary)' }}
                        width={50}
                    />

                    {showTooltip && <Tooltip content={<CustomTooltip />} />}

                    {showLegend && (
                        <Legend
                            wrapperStyle={{ fontSize: 10 }}
                            iconType="line"
                        />
                    )}

                    {/* Reference lines */}
                    {referenceLines?.map((ref, idx) => (
                        <ReferenceLine
                            key={idx}
                            y={ref.value}
                            label={{
                                value: ref.label,
                                fontSize: 10,
                                fill: 'var(--ui-text-secondary)',
                            }}
                            stroke={ref.color || 'var(--ui-warning)'}
                            strokeDasharray="3 3"
                        />
                    ))}

                    {seriesConfig.map((s) => (
                        showArea ? (
                            <Area
                                key={s.field}
                                type={curveType}
                                dataKey={s.field}
                                name={s.name}
                                stroke={s.color}
                                fill={s.color}
                                fillOpacity={0.1}
                                strokeWidth={strokeWidth}
                                dot={showDots ? <CustomDot stroke={s.color} /> : false}
                                activeDot={<CustomActiveDot stroke={s.color} />}
                                isAnimationActive={!loading}
                            />
                        ) : (
                            <Line
                                key={s.field}
                                type={curveType}
                                dataKey={s.field}
                                name={s.name}
                                stroke={s.color}
                                strokeWidth={strokeWidth}
                                dot={showDots ? <CustomDot stroke={s.color} /> : false}
                                activeDot={<CustomActiveDot stroke={s.color} />}
                                isAnimationActive={!loading}
                            />
                        )
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export const LineChartViz = memo(LineChartVizComponent);
export default LineChartViz;
