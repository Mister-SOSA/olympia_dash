'use client';

import { memo, useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
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
 * BarChartViz - A versatile bar chart visualization component
 * 
 * Supports:
 * - Single and multiple series
 * - Horizontal and vertical orientations
 * - Stacked bars
 * - Custom colors
 * - Configurable formatting
 */
function BarChartVizComponent({ data, config, loading, error }: BaseVisualizationProps) {
    const colors = useMemo(() => getChartColors(config), [config]);

    // Extract configuration
    const {
        xAxisField,
        yAxisField,
        series = [],
        stacked = false,
        orientation = 'vertical',
        showGrid = true,
        showLegend = false,
        showTooltip = true,
        valueFormat = 'number',
        compactValues = false,
        decimals = 0,
        barRadius = 4,
    } = config;

    // Process data to ensure it's in the right format
    const chartData = useMemo(() => {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return [];
        }

        // If series are defined, use them; otherwise create single series from yAxisField
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

    // Format tick values
    const formatTick = (value: number) => {
        if (compactValues) {
            return compactNumber(value, decimals);
        }
        return formatNumber(value, valueFormat, decimals);
    };

    // Format tooltip values
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
                            className="w-2 h-2 rounded-sm"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted">{entry.name}:</span>
                        <span className="font-medium">{formatTooltipValue(entry.value)}</span>
                    </div>
                ))}
            </div>
        );
    };

    // Handle states
    if (error) return <ErrorState error={error} />;
    if (!loading && chartData.length === 0) return <EmptyState />;

    const isHorizontal = orientation === 'horizontal';

    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    layout={isHorizontal ? 'vertical' : 'horizontal'}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                    {showGrid && (
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--ui-border-primary)"
                            opacity={0.5}
                        />
                    )}

                    {isHorizontal ? (
                        <>
                            <XAxis
                                type="number"
                                tickFormatter={formatTick}
                                tick={{ fontSize: 10, fill: 'var(--ui-text-secondary)' }}
                                axisLine={{ stroke: 'var(--ui-border-primary)' }}
                                tickLine={{ stroke: 'var(--ui-border-primary)' }}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fontSize: 10, fill: 'var(--ui-text-secondary)' }}
                                axisLine={{ stroke: 'var(--ui-border-primary)' }}
                                tickLine={{ stroke: 'var(--ui-border-primary)' }}
                                width={80}
                            />
                        </>
                    ) : (
                        <>
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
                        </>
                    )}

                    {showTooltip && <Tooltip content={<CustomTooltip />} />}

                    {showLegend && (
                        <Legend
                            wrapperStyle={{ fontSize: 10 }}
                            iconType="square"
                        />
                    )}

                    {seriesConfig.map((s, idx) => (
                        <Bar
                            key={s.field}
                            dataKey={s.field}
                            name={s.name}
                            fill={s.color}
                            stackId={stacked ? 'stack' : undefined}
                            radius={[barRadius, barRadius, stacked && idx < seriesConfig.length - 1 ? 0 : barRadius, stacked && idx < seriesConfig.length - 1 ? 0 : barRadius]}
                            isAnimationActive={!loading}
                        >
                            {/* Support individual bar colors if specified in data */}
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color || s.color}
                                />
                            ))}
                        </Bar>
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export const BarChartViz = memo(BarChartVizComponent);
export default BarChartViz;
