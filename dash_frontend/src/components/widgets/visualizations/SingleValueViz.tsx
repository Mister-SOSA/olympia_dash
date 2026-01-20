'use client';

import { memo, useMemo } from 'react';
import type { BaseVisualizationProps } from './utils';
import {
    EmptyState,
    ErrorState,
    getFieldValue,
    formatNumber,
    compactNumber,
    getPrimaryColor,
} from './utils';
import { cn } from '@/lib/utils';

/**
 * SingleValueViz - A large single value display with optional comparison
 * 
 * Supports:
 * - Large primary value display
 * - Secondary comparison value (previous period, target, etc.)
 * - Trend indicator
 * - Custom formatting
 * - Icon support
 */

type TrendDirection = 'up' | 'down' | 'flat';

function SingleValueVizComponent({ data, config, loading, error }: BaseVisualizationProps) {
    // Extract configuration
    const {
        valueField,
        comparisonField,
        comparisonLabel = 'vs previous',
        label,
        valueFormat = 'number',
        compactValues = false,
        decimals = 0,
        showTrend = true,
        invertTrend = false, // When true, down is good (e.g., for costs)
        prefix = '',
        suffix = '',
        icon,
        thresholds,
    } = config;

    // Calculate values
    const { value, comparison, trend, percentChange } = useMemo(() => {
        const firstItem = data?.[0];

        if (!firstItem) {
            return { value: null, comparison: null, trend: 'flat' as TrendDirection, percentChange: 0 };
        }

        const val = getFieldValue(firstItem, valueField);
        const comp = comparisonField ? getFieldValue(firstItem, comparisonField) : null;

        let trendDirection: TrendDirection = 'flat';
        let pctChange = 0;

        if (comp !== null && typeof val === 'number' && typeof comp === 'number' && comp !== 0) {
            pctChange = ((val - comp) / Math.abs(comp)) * 100;
            trendDirection = pctChange > 0.1 ? 'up' : pctChange < -0.1 ? 'down' : 'flat';
        }

        return {
            value: val,
            comparison: comp,
            trend: trendDirection,
            percentChange: pctChange,
        };
    }, [data, valueField, comparisonField]);

    // Format the primary value
    const formattedValue = useMemo(() => {
        if (value === null || value === undefined) return '—';

        if (typeof value !== 'number') {
            return String(value);
        }

        if (compactValues) {
            return compactNumber(value, decimals);
        }

        return formatNumber(value, valueFormat as any, decimals);
    }, [value, valueFormat, compactValues, decimals]);

    // Format the comparison value
    const formattedComparison = useMemo(() => {
        if (comparison === null || comparison === undefined) return null;

        if (typeof comparison !== 'number') {
            return String(comparison);
        }

        if (compactValues) {
            return compactNumber(comparison, decimals);
        }

        return formatNumber(comparison, valueFormat as any, decimals);
    }, [comparison, valueFormat, compactValues, decimals]);

    // Determine color based on thresholds
    const valueColor = useMemo(() => {
        if (!thresholds || typeof value !== 'number') {
            return 'text-foreground';
        }

        const { danger, warning, success } = thresholds;

        // Check in order of severity
        if (danger !== undefined && value <= danger) {
            return 'text-ui-danger-text';
        }
        if (warning !== undefined && value <= warning) {
            return 'text-ui-warning-text';
        }
        if (success !== undefined && value >= success) {
            return 'text-ui-success-text';
        }

        return 'text-foreground';
    }, [value, thresholds]);

    // Determine trend color
    const trendColor = useMemo(() => {
        if (trend === 'flat') return 'text-muted';

        const isPositive = invertTrend ? trend === 'down' : trend === 'up';
        return isPositive ? 'text-ui-success-text' : 'text-ui-danger-text';
    }, [trend, invertTrend]);

    // Trend icon
    const TrendIcon = () => {
        if (trend === 'up') {
            return (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
            );
        }
        if (trend === 'down') {
            return (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            );
        }
        return (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
        );
    };

    // Handle states
    if (error) return <ErrorState error={error} />;
    if (!loading && (value === null || value === undefined)) return <EmptyState />;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
            {/* Icon */}
            {icon && (
                <div
                    className="mb-2 text-2xl"
                    style={{ color: getPrimaryColor(config) }}
                >
                    {icon}
                </div>
            )}

            {/* Label */}
            {label && (
                <div className="text-xs text-muted mb-1 text-center uppercase tracking-wide">
                    {label}
                </div>
            )}

            {/* Primary Value */}
            <div className={cn('text-4xl font-bold tracking-tight', valueColor)}>
                {prefix}{formattedValue}{suffix}
            </div>

            {/* Comparison Section */}
            {(formattedComparison !== null || showTrend) && (
                <div className="flex items-center gap-2 mt-2">
                    {/* Trend indicator */}
                    {showTrend && trend !== 'flat' && (
                        <div className={cn('flex items-center gap-0.5', trendColor)}>
                            <TrendIcon />
                            <span className="text-xs font-medium">
                                {Math.abs(percentChange).toFixed(1)}%
                            </span>
                        </div>
                    )}

                    {/* Comparison value */}
                    {formattedComparison !== null && (
                        <div className="text-xs text-muted">
                            {comparisonLabel}: {prefix}{formattedComparison}{suffix}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export const SingleValueViz = memo(SingleValueVizComponent);
export default SingleValueViz;
