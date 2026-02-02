'use client';

import { memo, useMemo, useState } from 'react';
import type { BaseVisualizationProps } from './utils';
import {
    EmptyState,
    ErrorState,
    getFieldValue,
    formatNumber,
} from './utils';
import { cn } from '@/lib/utils';

/**
 * TableViz - A sortable, configurable table visualization component
 * 
 * Supports:
 * - Configurable columns
 * - Sorting
 * - Custom formatting per column
 * - Striped rows
 * - Compact mode
 * - Max rows limit
 */

interface Column {
    field: string;
    label?: string;
    align?: 'left' | 'center' | 'right';
    format?: 'text' | 'number' | 'currency' | 'percent' | 'date';
    decimals?: number;
    width?: string;
    sortable?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

function TableVizComponent({ data, config, loading, error }: BaseVisualizationProps) {
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    // Extract configuration
    const {
        columns = [],
        striped = true,
        compact = false,
        showHeader = true,
        maxRows,
        sortable = true,
        defaultSort,
    } = config;

    // Derive columns from data if not specified
    const derivedColumns = useMemo<Column[]>(() => {
        if (columns.length > 0) {
            return columns;
        }

        // Auto-derive from first data item
        if (data?.[0]) {
            return Object.keys(data[0]).map((key) => ({
                field: key,
                label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                align: typeof data[0][key] === 'number' ? 'right' : 'left',
                format: typeof data[0][key] === 'number' ? 'number' : 'text',
                sortable: true,
            }));
        }

        return [];
    }, [columns, data]);

    // Process and sort data
    const processedData = useMemo(() => {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return [];
        }

        let result = [...data];

        // Apply sorting
        const effectiveSortField = sortField || defaultSort?.field;
        const effectiveSortDirection = sortDirection || defaultSort?.direction || 'asc';

        if (effectiveSortField) {
            result.sort((a, b) => {
                const aVal = getFieldValue(a, effectiveSortField);
                const bVal = getFieldValue(b, effectiveSortField);

                if (aVal === bVal) return 0;
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                const comparison = typeof aVal === 'number'
                    ? aVal - bVal
                    : String(aVal).localeCompare(String(bVal));

                return effectiveSortDirection === 'asc' ? comparison : -comparison;
            });
        }

        // Apply max rows
        if (maxRows && maxRows > 0) {
            result = result.slice(0, maxRows);
        }

        return result;
    }, [data, sortField, sortDirection, defaultSort, maxRows]);

    // Handle sort click
    const handleSort = (field: string) => {
        if (!sortable) return;

        const column = derivedColumns.find(c => c.field === field);
        if (column?.sortable === false) return;

        if (sortField === field) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortField(null);
                setSortDirection(null);
            }
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Format cell value
    const formatCell = (value: any, column: Column): string => {
        if (value === null || value === undefined) {
            return '—';
        }

        switch (column.format) {
            case 'currency':
                return formatNumber(Number(value), 'currency', column.decimals ?? 2);
            case 'percent':
                return formatNumber(Number(value), 'percent', column.decimals ?? 1);
            case 'number':
                return formatNumber(Number(value), 'number', column.decimals ?? 0);
            case 'date':
                try {
                    return new Date(value).toLocaleDateString();
                } catch {
                    return String(value);
                }
            default:
                return String(value);
        }
    };

    // Get sort icon
    const getSortIcon = (field: string) => {
        if (sortField !== field) {
            return (
                <svg className="w-3 h-3 text-muted opacity-30" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" />
                </svg>
            );
        }

        if (sortDirection === 'asc') {
            return (
                <svg className="w-3 h-3 text-ui-accent-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
            );
        }

        return (
            <svg className="w-3 h-3 text-ui-accent-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
        );
    };

    // Handle states
    if (error) return <ErrorState error={error} />;
    if (!loading && processedData.length === 0) return <EmptyState />;

    return (
        <div className="w-full h-full overflow-auto">
            <table className="w-full border-collapse text-xs">
                {showHeader && (
                    <thead className="sticky top-0 bg-ui-background-primary z-10">
                        <tr className="border-b border-ui-border-primary">
                            {derivedColumns.map((column) => {
                                const isSortable = sortable && column.sortable !== false;
                                return (
                                    <th
                                        key={column.field}
                                        className={cn(
                                            'text-muted font-medium',
                                            compact ? 'px-2 py-1' : 'px-3 py-2',
                                            column.align === 'right' && 'text-right',
                                            column.align === 'center' && 'text-center',
                                            isSortable && 'cursor-pointer hover:text-foreground select-none'
                                        )}
                                        style={{ width: column.width }}
                                        onClick={() => isSortable && handleSort(column.field)}
                                    >
                                        <div className={cn(
                                            'flex items-center gap-1',
                                            column.align === 'right' && 'justify-end',
                                            column.align === 'center' && 'justify-center'
                                        )}>
                                            <span>{column.label || column.field}</span>
                                            {isSortable && getSortIcon(column.field)}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                )}
                <tbody>
                    {processedData.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            className={cn(
                                'border-b border-ui-border-secondary transition-colors',
                                'hover:bg-ui-hover',
                                striped && rowIndex % 2 === 1 && 'bg-ui-background-secondary/50'
                            )}
                        >
                            {derivedColumns.map((column) => (
                                <td
                                    key={column.field}
                                    className={cn(
                                        compact ? 'px-2 py-1' : 'px-3 py-2',
                                        column.align === 'right' && 'text-right font-mono',
                                        column.align === 'center' && 'text-center'
                                    )}
                                    style={{ width: column.width }}
                                >
                                    {formatCell(getFieldValue(row, column.field), column)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            {maxRows && data.length > maxRows && (
                <div className="text-center text-xs text-muted py-2 border-t border-ui-border-secondary">
                    Showing {maxRows} of {data.length} rows
                </div>
            )}
        </div>
    );
}

export const TableViz = memo(TableVizComponent);
export default TableViz;
