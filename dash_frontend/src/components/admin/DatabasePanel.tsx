'use client';

import { useState, useEffect } from 'react';
import { authService } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MdStorage, MdTableChart, MdRefresh, MdChevronLeft, MdChevronRight, MdKeyboardArrowUp, MdKeyboardArrowDown, MdArrowBack } from 'react-icons/md';

interface TableInfo {
    name: string;
    row_count: number;
    column_count: number;
    columns: Array<{
        name: string;
        type: string;
        nullable: boolean;
        pk: boolean;
    }>;
}

interface TableData {
    table: string;
    columns: string[];
    data: Record<string, unknown>[];
    pagination: {
        page: number;
        per_page: number;
        total_rows: number;
        total_pages: number;
    };
}

export function DatabasePanel() {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [sortBy, setSortBy] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

    useEffect(() => {
        loadTables();
    }, []);

    useEffect(() => {
        if (selectedTable) {
            loadTableData(selectedTable, 1);
            setCurrentPage(1);
            setSortBy(null);
            setSortOrder('asc');
        }
    }, [selectedTable]);

    const loadTables = async () => {
        try {
            setLoading(true);
            const response = await authService.fetchWithAuth('/api/auth/admin/database/tables');
            const data = await response.json();
            if (data.success) {
                setTables(data.tables);
            } else {
                toast.error(data.error || 'Failed to load tables');
            }
        } catch (error) {
            toast.error('Failed to load database tables');
            console.error('Database load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTableData = async (tableName: string, page: number, sort?: string, order?: 'asc' | 'desc') => {
        try {
            setLoadingData(true);
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: '50'
            });
            if (sort) {
                params.set('sort_by', sort);
                params.set('sort_order', order || 'asc');
            }

            const response = await authService.fetchWithAuth(`/api/auth/admin/database/table/${tableName}?${params}`);
            const data = await response.json();
            if (data.success) {
                setTableData(data);
            } else {
                toast.error(data.error || 'Failed to load table data');
            }
        } catch (error) {
            toast.error('Failed to load table data');
            console.error('Table data load error:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleSort = (column: string) => {
        const newOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortOrder(newOrder);
        if (selectedTable) {
            loadTableData(selectedTable, currentPage, column, newOrder);
        }
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        if (selectedTable) {
            loadTableData(selectedTable, newPage, sortBy || undefined, sortOrder);
        }
    };

    const formatValue = (value: unknown): string => {
        if (value === null || value === undefined) {
            return '—';
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        const strVal = String(value);
        if (strVal.length > 100) {
            return strVal.substring(0, 100) + '...';
        }
        return strVal;
    };

    const getSelectedTableInfo = () => {
        return tables.find(t => t.name === selectedTable);
    };

    if (loading) {
        return (
            <Card className="bg-ui-bg-secondary border-ui-border-primary">
                <CardContent className="p-8 flex flex-col items-center justify-center">
                    <Loader />
                    <p className="mt-4 text-ui-text-secondary">Loading database...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with refresh button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <MdStorage className="text-2xl text-ui-accent-primary" />
                    <div>
                        <h3 className="text-lg font-semibold text-ui-text-primary">Database Browser</h3>
                        <p className="text-sm text-ui-text-secondary">Read-only view of database tables</p>
                    </div>
                </div>
                <Button
                    onClick={loadTables}
                    variant="outline"
                    size="sm"
                    className="border-ui-border-primary hover:bg-ui-bg-tertiary"
                >
                    <MdRefresh className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                {/* Tables List */}
                <div className={`lg:col-span-3 ${mobileView === 'detail' ? 'hidden lg:block' : 'block'}`}>
                    <Card className="bg-ui-bg-secondary border-ui-border-primary h-[50vh] lg:h-[calc(100vh-280px)] overflow-hidden flex flex-col">
                        <CardHeader className="border-b border-ui-border-primary py-3 flex-shrink-0">
                            <CardTitle className="text-sm font-medium text-ui-text-primary">
                                Tables ({tables.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-y-auto">
                            <div className="divide-y divide-ui-border-primary">
                                {tables.map((table) => (
                                    <button
                                        key={table.name}
                                        onClick={() => {
                                            setSelectedTable(table.name);
                                            setMobileView('detail');
                                        }}
                                        className={`w-full px-4 py-3 text-left transition-colors ${selectedTable === table.name
                                            ? 'bg-ui-accent-primary text-white'
                                            : 'hover:bg-ui-bg-tertiary text-ui-text-primary'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <MdTableChart className={`h-4 w-4 ${selectedTable === table.name ? 'text-white' : 'text-ui-text-muted'
                                                    }`} />
                                                <span className="font-medium text-sm">{table.name}</span>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded ${selectedTable === table.name
                                                ? 'bg-white/20 text-white'
                                                : 'bg-ui-bg-tertiary text-ui-text-muted'
                                                }`}>
                                                {table.row_count.toLocaleString()}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Table Data View */}
                <div className={`lg:col-span-9 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
                    {selectedTable ? (
                        <Card className="bg-ui-bg-secondary border-ui-border-primary h-[70vh] lg:h-[calc(100vh-280px)] overflow-hidden flex flex-col">
                            <CardHeader className="border-b border-ui-border-primary py-3 flex-shrink-0">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedTable(null);
                                                setMobileView('list');
                                            }}
                                            className="p-1 h-auto text-ui-text-secondary hover:text-ui-text-primary"
                                        >
                                            <MdArrowBack className="h-5 w-5" />
                                        </Button>
                                        <div>
                                            <CardTitle className="text-sm font-semibold text-ui-text-primary">
                                                {selectedTable}
                                            </CardTitle>
                                            <p className="text-xs text-ui-text-muted">
                                                {getSelectedTableInfo()?.column_count} columns • {getSelectedTableInfo()?.row_count.toLocaleString()} rows
                                            </p>
                                        </div>
                                    </div>
                                    {tableData && (
                                        <div className="flex items-center gap-2 ml-10 sm:ml-0">
                                            <span className="text-sm text-ui-text-muted">
                                                Page {tableData.pagination.page} of {tableData.pagination.total_pages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage <= 1 || loadingData}
                                                className="p-1 h-8 w-8"
                                            >
                                                <MdChevronLeft className="h-5 w-5" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage >= tableData.pagination.total_pages || loadingData}
                                                className="p-1 h-8 w-8"
                                            >
                                                <MdChevronRight className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-auto">
                                {loadingData ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader />
                                    </div>
                                ) : tableData ? (
                                    <table className="w-full text-sm">
                                        <thead className="bg-ui-bg-tertiary sticky top-0">
                                            <tr>
                                                {tableData.columns.map((column) => {
                                                    const colInfo = getSelectedTableInfo()?.columns.find(c => c.name === column);
                                                    return (
                                                        <th
                                                            key={column}
                                                            onClick={() => handleSort(column)}
                                                            className="text-left p-3 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider cursor-pointer hover:bg-ui-bg-primary whitespace-nowrap"
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                {colInfo?.pk && (
                                                                    <span className="text-ui-accent-primary text-[10px]">PK</span>
                                                                )}
                                                                <span>{column}</span>
                                                                {sortBy === column && (
                                                                    sortOrder === 'asc'
                                                                        ? <MdKeyboardArrowUp className="h-4 w-4" />
                                                                        : <MdKeyboardArrowDown className="h-4 w-4" />
                                                                )}
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-ui-border-primary">
                                            {tableData.data.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-ui-bg-tertiary/50">
                                                    {tableData.columns.map((column) => (
                                                        <td
                                                            key={column}
                                                            className="p-3 text-ui-text-primary max-w-[300px] truncate"
                                                            title={String(row[column] ?? '')}
                                                        >
                                                            {row[column] === '••••••••' ? (
                                                                <span className="text-ui-text-muted italic">●●●●●●●●</span>
                                                            ) : (
                                                                <span className={row[column] === null ? 'text-ui-text-muted italic' : ''}>
                                                                    {formatValue(row[column])}
                                                                </span>
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                            {tableData.data.length === 0 && (
                                                <tr>
                                                    <td colSpan={tableData.columns.length} className="p-8 text-center text-ui-text-muted">
                                                        No data in this table
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-ui-text-muted">
                                        Select a table to view data
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-ui-bg-secondary border-ui-border-primary h-[50vh] lg:h-[calc(100vh-280px)]">
                            <CardContent className="flex flex-col items-center justify-center h-full p-4">
                                <MdStorage className="h-12 w-12 lg:h-16 lg:w-16 text-ui-text-muted mb-4" />
                                <h3 className="text-base lg:text-lg font-medium text-ui-text-primary mb-2 text-center">Select a Table</h3>
                                <p className="text-sm text-ui-text-muted text-center max-w-sm">
                                    Choose a table from the list to browse its contents.
                                    Sensitive data like passwords are automatically masked.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
