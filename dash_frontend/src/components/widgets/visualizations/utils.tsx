/**
 * Shared utilities and types for visualization components
 */

import type { VisualizationConfig } from '@/types';

// ============================================
// Types
// ============================================

export interface BaseVisualizationProps {
    data: any[];
    config: VisualizationConfig;
    loading: boolean;
    error?: string;
}

// ============================================
// Color Utilities
// ============================================

/**
 * Default color palette for charts
 */
export const DEFAULT_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
    'var(--chart-bar)',
    'var(--ui-accent-primary)',
    'var(--ui-success)',
    'var(--ui-warning)',
];

/**
 * Get colors from config or use defaults
 */
export function getChartColors(config: VisualizationConfig): string[] {
    if (config.colors?.palette?.length) {
        return config.colors.palette;
    }
    return DEFAULT_COLORS;
}

/**
 * Get a single color from config or default
 */
export function getPrimaryColor(config: VisualizationConfig): string {
    return config.colors?.primary || 'var(--chart-bar)';
}

export function getSecondaryColor(config: VisualizationConfig): string {
    return config.colors?.secondary || 'var(--chart-2)';
}

// ============================================
// Data Utilities
// ============================================

/**
 * Safely extract a value from an object using a field path
 */
export function getFieldValue(obj: any, field: string | undefined): any {
    if (!field || !obj) return undefined;
    
    // Support dot notation for nested fields
    const parts = field.split('.');
    let value = obj;
    
    for (const part of parts) {
        if (value === null || value === undefined) return undefined;
        value = value[part];
    }
    
    return value;
}

/**
 * Format a number based on configuration
 */
export function formatNumber(
    value: number,
    format: 'number' | 'currency' | 'percent' | 'text' | 'date' | undefined = 'number',
    decimals: number = 0
): string {
    if (typeof value !== 'number' || isNaN(value)) {
        return '—';
    }

    switch (format) {
        case 'currency':
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            }).format(value);
            
        case 'percent':
            return new Intl.NumberFormat('en-US', {
                style: 'percent',
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            }).format(value / 100);
        
        case 'text':
        case 'date':
            // For text/date, just convert to string with decimals if it's still a number
            return String(value);
            
        default:
            return new Intl.NumberFormat('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            }).format(value);
    }
}

/**
 * Compact number formatting (e.g., 1.2K, 3.4M)
 */
export function compactNumber(value: number, decimals: number = 1): string {
    if (typeof value !== 'number' || isNaN(value)) {
        return '—';
    }

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1e9) {
        return `${sign}${(absValue / 1e9).toFixed(decimals)}B`;
    }
    if (absValue >= 1e6) {
        return `${sign}${(absValue / 1e6).toFixed(decimals)}M`;
    }
    if (absValue >= 1e3) {
        return `${sign}${(absValue / 1e3).toFixed(decimals)}K`;
    }
    return `${sign}${absValue.toFixed(decimals)}`;
}

// ============================================
// Empty State Component
// ============================================

export function EmptyState({ message = 'No data available' }: { message?: string }) {
    return (
        <div className="flex items-center justify-center h-full w-full">
            <div className="text-center text-muted text-sm">
                {message}
            </div>
        </div>
    );
}

// ============================================
// Error State Component
// ============================================

export function ErrorState({ error }: { error: string }) {
    return (
        <div className="flex items-center justify-center h-full w-full">
            <div className="text-center">
                <div className="text-ui-danger-text text-sm font-medium mb-1">
                    Error loading data
                </div>
                <div className="text-muted text-xs max-w-[200px]">
                    {error}
                </div>
            </div>
        </div>
    );
}
