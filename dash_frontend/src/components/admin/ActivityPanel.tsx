'use client';

import { useState, useEffect, useMemo } from 'react';
import { authService } from '@/lib/auth';
import { API_BASE_URL } from '@/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';
import { MdHistory, MdFilterList, MdFileDownload, MdRefresh, MdSearch, MdCalendarToday, MdPerson, MdWarning, MdCheckCircle, MdError, MdInfo } from 'react-icons/md';
import { formatDateTime } from '@/utils/dateUtils';

interface AuditLog {
    id: number;
    user_id: number | null;
    action: string;
    details: string | null;
    ip_address: string | null;
    created_at: string;
    user_email?: string;
    user_name?: string;
}

type ActionType = 'all' | 'auth' | 'admin' | 'widget' | 'system' | 'error';
type TimeRange = 'all' | '1h' | '24h' | '7d' | '30d';

export function ActivityPanel() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState<ActionType>('all');
    const [timeRange, setTimeRange] = useState<TimeRange>('24h');
    const [selectedUser, setSelectedUser] = useState<string>('all');
    const [limit, setLimit] = useState(100);

    useEffect(() => {
        loadLogs();
    }, [limit]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/audit-logs?limit=${limit}`);
            const data = await response.json();

            if (data.success) {
                setLogs(data.logs);
            } else {
                toast.error('Failed to load activity logs');
            }
        } catch (error) {
            toast.error('Error loading activity logs');
            console.error('Load logs error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/export/audit-logs?limit=5000`);
            const data = await response.json();

            if (data.success) {
                // Create CSV
                const csvContent = [
                    ['Timestamp', 'User', 'Action', 'Details', 'IP Address'].join(','),
                    ...data.logs.map((log: AuditLog) => [
                        new Date(log.created_at).toISOString(),
                        log.user_id || 'System',
                        log.action,
                        `"${(log.details || '').replace(/"/g, '""')}"`,
                        log.ip_address || '-'
                    ].join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `activity-logs-${new Date().toISOString()}.csv`;
                a.click();
                toast.success('Activity logs exported successfully');
            } else {
                toast.error('Failed to export logs');
            }
        } catch (err) {
            toast.error('Failed to export logs');
            console.error('Export error:', err);
        }
    };

    // Filter logs based on all criteria
    const filteredLogs = useMemo(() => {
        let filtered = [...logs];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(log =>
                log.action.toLowerCase().includes(query) ||
                (log.details?.toLowerCase().includes(query)) ||
                (log.ip_address?.toLowerCase().includes(query)) ||
                (log.user_email?.toLowerCase().includes(query))
            );
        }

        // Action type filter
        if (actionFilter !== 'all') {
            filtered = filtered.filter(log => {
                const action = log.action.toLowerCase();
                switch (actionFilter) {
                    case 'auth':
                        return action.includes('login') || action.includes('logout') || action.includes('token') || action.includes('session');
                    case 'admin':
                        return action.includes('admin') || action.includes('permission') || action.includes('role');
                    case 'widget':
                        return action.includes('widget') || action.includes('preset') || action.includes('dashboard');
                    case 'system':
                        return action.includes('system') || action.includes('cleanup') || action.includes('maintenance');
                    case 'error':
                        return action.includes('error') || action.includes('failed') || action.includes('denied');
                    default:
                        return true;
                }
            });
        }

        // User filter
        if (selectedUser !== 'all') {
            filtered = filtered.filter(log =>
                selectedUser === 'system' ? !log.user_id : log.user_id?.toString() === selectedUser
            );
        }

        // Time range filter
        if (timeRange !== 'all') {
            const now = new Date();
            const cutoff = new Date(now);

            switch (timeRange) {
                case '1h':
                    cutoff.setHours(now.getHours() - 1);
                    break;
                case '24h':
                    cutoff.setHours(now.getHours() - 24);
                    break;
                case '7d':
                    cutoff.setDate(now.getDate() - 7);
                    break;
                case '30d':
                    cutoff.setDate(now.getDate() - 30);
                    break;
            }

            filtered = filtered.filter(log => new Date(log.created_at) >= cutoff);
        }

        return filtered;
    }, [logs, searchQuery, actionFilter, selectedUser, timeRange]);

    // Extract unique users for filter
    const uniqueUsers = useMemo(() => {
        const users = new Map<string, string>();
        logs.forEach(log => {
            if (log.user_id) {
                users.set(log.user_id.toString(), log.user_email || `User #${log.user_id}`);
            }
        });
        return Array.from(users.entries()).map(([id, email]) => ({ id, email }));
    }, [logs]);

    // Action statistics
    const stats = useMemo(() => {
        const total = filteredLogs.length;
        const errors = filteredLogs.filter(log =>
            log.action.includes('error') || log.action.includes('failed')
        ).length;
        const successes = filteredLogs.filter(log =>
            log.action.includes('success') || log.action.includes('granted') || log.action.includes('created')
        ).length;
        const warnings = filteredLogs.filter(log =>
            log.action.includes('warning') || log.action.includes('revoked') || log.action.includes('deleted')
        ).length;

        return { total, errors, successes, warnings };
    }, [filteredLogs]);

    const getActionIcon = (action: string) => {
        const lowerAction = action.toLowerCase();
        if (lowerAction.includes('error') || lowerAction.includes('failed')) {
            return <MdError className="text-ui-danger-text" />;
        }
        if (lowerAction.includes('success') || lowerAction.includes('granted') || lowerAction.includes('created')) {
            return <MdCheckCircle className="text-ui-success-text" />;
        }
        if (lowerAction.includes('warning') || lowerAction.includes('revoked') || lowerAction.includes('deleted')) {
            return <MdWarning className="text-ui-warning-text" />;
        }
        return <MdInfo className="text-ui-accent-primary-text" />;
    };

    const getActionStyle = (action: string) => {
        const lowerAction = action.toLowerCase();
        if (lowerAction.includes('error') || lowerAction.includes('failed')) {
            return 'bg-ui-danger-bg text-ui-danger-text border-ui-danger-border';
        }
        if (lowerAction.includes('success') || lowerAction.includes('granted') || lowerAction.includes('created')) {
            return 'bg-ui-success-bg text-ui-success-text border-ui-success-border';
        }
        if (lowerAction.includes('warning') || lowerAction.includes('revoked') || lowerAction.includes('deleted')) {
            return 'bg-ui-warning-bg text-ui-warning-text border-ui-warning-border';
        }
        return 'bg-ui-accent-primary-bg text-ui-accent-primary-text border-ui-accent-primary-border';
    };

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-ui-text-secondary text-xs font-medium">Total Events</p>
                                <p className="text-2xl font-bold text-ui-text-primary mt-1">{stats.total}</p>
                            </div>
                            <div className="p-3 bg-ui-accent-primary-bg rounded-lg">
                                <MdHistory className="w-6 h-6 text-ui-accent-primary-text" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-ui-text-secondary text-xs font-medium">Success</p>
                                <p className="text-2xl font-bold text-ui-success-text mt-1">{stats.successes}</p>
                            </div>
                            <div className="p-3 bg-ui-success-bg rounded-lg">
                                <MdCheckCircle className="w-6 h-6 text-ui-success-text" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-ui-text-secondary text-xs font-medium">Warnings</p>
                                <p className="text-2xl font-bold text-ui-warning-text mt-1">{stats.warnings}</p>
                            </div>
                            <div className="p-3 bg-ui-warning-bg rounded-lg">
                                <MdWarning className="w-6 h-6 text-ui-warning-text" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-ui-text-secondary text-xs font-medium">Errors</p>
                                <p className="text-2xl font-bold text-ui-danger-text mt-1">{stats.errors}</p>
                            </div>
                            <div className="p-3 bg-ui-danger-bg rounded-lg">
                                <MdError className="w-6 h-6 text-ui-danger-text" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Controls */}
            <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                <CardHeader className="border-b border-ui-border-primary">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <MdFilterList className="text-ui-accent-primary-text" />
                            <CardTitle className="text-ui-text-primary text-lg">Filters</CardTitle>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={loadLogs}
                                size="sm"
                                variant="outline"
                                className="border-ui-border-primary hover:bg-ui-bg-tertiary text-ui-text-secondary"
                            >
                                <MdRefresh className="mr-1" />
                                Refresh
                            </Button>
                            <Button
                                onClick={handleExport}
                                size="sm"
                                variant="outline"
                                className="border-ui-border-primary hover:bg-ui-bg-tertiary text-ui-text-secondary"
                            >
                                <MdFileDownload className="mr-1" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="relative">
                            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-text-muted" />
                            <Input
                                placeholder="Search logs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-ui-bg-tertiary border-ui-border-primary focus:ring-ui-accent-primary h-9 text-sm"
                            />
                        </div>

                        <Select
                            value={actionFilter}
                            onChange={(val) => setActionFilter(val as ActionType)}
                            options={[
                                { value: 'all', label: 'All Actions' },
                                { value: 'auth', label: 'Authentication' },
                                { value: 'admin', label: 'Administration' },
                                { value: 'widget', label: 'Widgets' },
                                { value: 'system', label: 'System' },
                                { value: 'error', label: 'Errors Only' }
                            ]}
                            className="h-9"
                        />

                        <Select
                            value={timeRange}
                            onChange={(val) => setTimeRange(val as TimeRange)}
                            options={[
                                { value: 'all', label: 'All Time' },
                                { value: '1h', label: 'Last Hour' },
                                { value: '24h', label: 'Last 24 Hours' },
                                { value: '7d', label: 'Last 7 Days' },
                                { value: '30d', label: 'Last 30 Days' }
                            ]}
                            className="h-9"
                        />

                        <Select
                            value={selectedUser}
                            onChange={(val) => setSelectedUser(val)}
                            options={[
                                { value: 'all', label: 'All Users' },
                                { value: 'system', label: 'System Only' },
                                ...uniqueUsers.map(u => ({ value: u.id, label: u.email }))
                            ]}
                            className="h-9"
                        />

                        <Select
                            value={limit.toString()}
                            onChange={(val) => setLimit(parseInt(val))}
                            options={[
                                { value: '50', label: '50 logs' },
                                { value: '100', label: '100 logs' },
                                { value: '250', label: '250 logs' },
                                { value: '500', label: '500 logs' },
                                { value: '1000', label: '1000 logs' }
                            ]}
                            className="h-9"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Activity Log Table */}
            <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                <CardHeader className="border-b border-ui-border-primary">
                    <CardTitle className="text-ui-text-primary text-lg">Activity Log</CardTitle>
                    <CardDescription className="text-ui-text-secondary text-sm">
                        Showing {filteredLogs.length} of {logs.length} events
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="loader-spinner" />
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-ui-text-muted">
                            <MdHistory className="mx-auto h-12 w-12 opacity-30 mb-4" />
                            <p className="text-lg font-medium">No activity found</p>
                            <p className="text-sm mt-2">Try adjusting your filters</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-ui-bg-tertiary sticky top-0 z-10">
                                    <tr>
                                        <th className="text-left p-3 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <MdCalendarToday className="text-ui-text-muted" />
                                                Time
                                            </div>
                                        </th>
                                        <th className="text-left p-3 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">
                                            Action
                                        </th>
                                        <th className="text-left p-3 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <MdPerson className="text-ui-text-muted" />
                                                User
                                            </div>
                                        </th>
                                        <th className="text-left p-3 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">
                                            Details
                                        </th>
                                        <th className="text-right p-3 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">
                                            IP Address
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ui-border-primary">
                                    {filteredLogs.map((log, index) => (
                                        <tr
                                            key={log.id}
                                            className="hover:bg-ui-bg-tertiary/50 transition-colors"
                                            style={{ animationDelay: `${index * 20}ms` }}
                                        >
                                            <td className="p-3 text-ui-text-muted text-xs whitespace-nowrap font-mono">
                                                {formatDateTime(log.created_at)}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {getActionIcon(log.action)}
                                                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getActionStyle(log.action)}`}>
                                                        {log.action}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-ui-text-secondary text-sm">
                                                {log.user_id ? (
                                                    <div>
                                                        <div className="font-medium text-ui-text-primary">{log.user_name || `User #${log.user_id}`}</div>
                                                        <div className="text-xs text-ui-text-muted">{log.user_email}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-ui-text-muted italic">System</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-ui-text-secondary text-sm max-w-md">
                                                <div className="truncate" title={log.details || ''}>
                                                    {log.details || '-'}
                                                </div>
                                            </td>
                                            <td className="p-3 text-right text-ui-text-muted text-xs font-mono">
                                                {log.ip_address || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
