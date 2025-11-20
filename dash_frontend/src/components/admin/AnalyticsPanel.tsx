'use client';

import { useState, useEffect, useMemo } from 'react';
import { authService } from '@/lib/auth';
import { API_BASE_URL } from '@/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatChartDate, getLocalHour } from '@/utils/dateUtils';
import {
    MdTrendingUp, MdPeople, MdAccessTime, MdDevices, MdBarChart,
    MdRefresh, MdCalendarToday, MdLogin, MdTimer
} from 'react-icons/md';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Area, AreaChart
} from 'recharts';

interface Stats {
    total_users: number;
    active_users: number;
    admin_count: number;
    active_sessions: number;
    active_device_sessions: number;
    recent_logins: number;
}

interface AuditLog {
    created_at: string;
    action: string;
    user_id: number | null;
}

type TimeRange = '24h' | '7d' | '30d' | '90d';

const COLORS = [
    'var(--ui-accent-primary)',
    'var(--ui-accent-secondary)',
    'var(--ui-success)',
    'var(--ui-warning)',
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

export function AnalyticsPanel() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('7d');

    useEffect(() => {
        loadData();
    }, [timeRange]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsResponse, logsResponse] = await Promise.all([
                authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/stats`),
                authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/audit-logs?limit=1000`)
            ]);

            const statsData = await statsResponse.json();
            const logsData = await logsResponse.json();

            if (statsData.success) {
                setStats(statsData.stats);
            }

            if (logsData.success) {
                setLogs(logsData.logs);
            }
        } catch (error) {
            toast.error('Failed to load analytics data');
            console.error('Analytics error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate activity over time
    const activityData = useMemo(() => {
        const now = new Date();
        const cutoff = new Date(now);

        switch (timeRange) {
            case '24h':
                cutoff.setHours(now.getHours() - 24);
                break;
            case '7d':
                cutoff.setDate(now.getDate() - 7);
                break;
            case '30d':
                cutoff.setDate(now.getDate() - 30);
                break;
            case '90d':
                cutoff.setDate(now.getDate() - 90);
                break;
        }

        const filteredLogs = logs.filter(log => new Date(log.created_at) >= cutoff);

        // Group by hour for 24h, by day for others
        const groupByHour = timeRange === '24h';
        const grouped = new Map<string, number>();

        filteredLogs.forEach(log => {
            const key = formatChartDate(log.created_at, groupByHour ? 'hour' : 'day');

            grouped.set(key, (grouped.get(key) || 0) + 1);
        });

        return Array.from(grouped.entries())
            .map(([time, count]) => ({ time, count }))
            .sort((a, b) => a.time.localeCompare(b.time))
            .slice(-30); // Show last 30 data points
    }, [logs, timeRange]);

    // Calculate action type distribution
    const actionDistribution = useMemo(() => {
        const distribution = new Map<string, number>();

        logs.forEach(log => {
            const action = log.action.toLowerCase();
            let category = 'Other';

            if (action.includes('login') || action.includes('logout') || action.includes('session')) {
                category = 'Authentication';
            } else if (action.includes('admin') || action.includes('permission') || action.includes('role')) {
                category = 'Administration';
            } else if (action.includes('widget') || action.includes('preset') || action.includes('dashboard')) {
                category = 'Widget Management';
            } else if (action.includes('error') || action.includes('failed')) {
                category = 'Errors';
            } else if (action.includes('system') || action.includes('cleanup')) {
                category = 'System';
            }

            distribution.set(category, (distribution.get(category) || 0) + 1);
        });

        return Array.from(distribution.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [logs]);

    // Calculate user activity ranking
    const userActivity = useMemo(() => {
        const activity = new Map<number, number>();

        logs.forEach(log => {
            if (log.user_id) {
                activity.set(log.user_id, (activity.get(log.user_id) || 0) + 1);
            }
        });

        return Array.from(activity.entries())
            .map(([userId, count]) => ({ userId: `User #${userId}`, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [logs]);

    // Calculate hourly activity pattern (all time)
    const hourlyPattern = useMemo(() => {
        const hours = new Array(24).fill(0);

        logs.forEach(log => {
            const hour = getLocalHour(log.created_at);
            hours[hour]++;
        });

        return hours.map((count, hour) => ({
            hour: `${hour}:00`,
            count
        }));
    }, [logs]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="loader-spinner" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Controls */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-ui-text-primary">User Analytics</h3>
                    <p className="text-sm text-ui-text-secondary mt-1">Insights into user behavior and system usage</p>
                </div>
                <div className="flex gap-3">
                    <Select
                        value={timeRange}
                        onChange={(val) => setTimeRange(val as TimeRange)}
                        options={[
                            { value: '24h', label: 'Last 24 Hours' },
                            { value: '7d', label: 'Last 7 Days' },
                            { value: '30d', label: 'Last 30 Days' },
                            { value: '90d', label: 'Last 90 Days' }
                        ]}
                        className="w-40"
                    />
                    <Button
                        onClick={loadData}
                        size="sm"
                        variant="outline"
                        className="border-ui-border-primary hover:bg-ui-bg-tertiary text-ui-text-secondary"
                    >
                        <MdRefresh className="mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-ui-text-secondary text-xs font-medium mb-1">Total Users</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-3xl font-bold text-ui-text-primary">{stats.total_users}</p>
                                        <span className="text-xs text-ui-success-text">
                                            {Math.round((stats.active_users / stats.total_users) * 100)}% active
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 bg-ui-accent-primary-bg rounded-xl">
                                    <MdPeople className="w-6 h-6 text-ui-accent-primary-text" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-ui-text-secondary text-xs font-medium mb-1">Active Sessions</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-3xl font-bold text-ui-warning-text">{stats.active_sessions}</p>
                                        <span className="text-xs text-ui-text-muted">browser</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-ui-warning-bg rounded-xl">
                                    <MdAccessTime className="w-6 h-6 text-ui-warning-text" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-ui-text-secondary text-xs font-medium mb-1">Device Sessions</p>
                                    <p className="text-3xl font-bold text-ui-accent-secondary-text">{stats.active_device_sessions}</p>
                                </div>
                                <div className="p-3 bg-ui-accent-secondary-bg rounded-xl">
                                    <MdDevices className="w-6 h-6 text-ui-accent-secondary-text" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-ui-text-secondary text-xs font-medium mb-1">Recent Logins</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-3xl font-bold text-ui-success-text">{stats.recent_logins}</p>
                                        <span className="text-xs text-ui-text-muted">today</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-ui-success-bg rounded-xl">
                                    <MdLogin className="w-6 h-6 text-ui-success-text" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Activity Timeline */}
            <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                <CardHeader className="border-b border-ui-border-primary">
                    <div className="flex items-center gap-2">
                        <MdTrendingUp className="text-ui-accent-primary-text" />
                        <CardTitle className="text-ui-text-primary text-lg">Activity Timeline</CardTitle>
                    </div>
                    <CardDescription className="text-ui-text-secondary">
                        System activity over time
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={activityData}>
                            <defs>
                                <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--ui-accent-primary)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--ui-accent-primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--ui-border-primary)" opacity={0.3} />
                            <XAxis
                                dataKey="time"
                                stroke="var(--ui-text-secondary)"
                                fontSize={12}
                            />
                            <YAxis
                                stroke="var(--ui-text-secondary)"
                                fontSize={12}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--ui-bg-tertiary)',
                                    border: '1px solid var(--ui-border-primary)',
                                    borderRadius: '0.5rem',
                                    color: 'var(--ui-text-primary)'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="var(--ui-accent-primary)"
                                strokeWidth={2}
                                fill="url(#activityGradient)"
                                name="Events"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Action Distribution */}
                <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                    <CardHeader className="border-b border-ui-border-primary">
                        <div className="flex items-center gap-2">
                            <MdBarChart className="text-ui-accent-secondary-text" />
                            <CardTitle className="text-ui-text-primary text-lg">Action Distribution</CardTitle>
                        </div>
                        <CardDescription className="text-ui-text-secondary">
                            Breakdown by category
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={actionDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {actionDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--ui-bg-tertiary)',
                                        border: '1px solid var(--ui-border-primary)',
                                        borderRadius: '0.5rem',
                                        color: 'var(--ui-text-primary)'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Users by Activity */}
                <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                    <CardHeader className="border-b border-ui-border-primary">
                        <div className="flex items-center gap-2">
                            <MdPeople className="text-ui-success-text" />
                            <CardTitle className="text-ui-text-primary text-lg">Most Active Users</CardTitle>
                        </div>
                        <CardDescription className="text-ui-text-secondary">
                            Top 10 by event count
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={userActivity} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--ui-border-primary)" opacity={0.3} />
                                <XAxis type="number" stroke="var(--ui-text-secondary)" fontSize={12} />
                                <YAxis
                                    type="category"
                                    dataKey="userId"
                                    stroke="var(--ui-text-secondary)"
                                    fontSize={12}
                                    width={80}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--ui-bg-tertiary)',
                                        border: '1px solid var(--ui-border-primary)',
                                        borderRadius: '0.5rem',
                                        color: 'var(--ui-text-primary)'
                                    }}
                                />
                                <Bar dataKey="count" fill="var(--ui-success)" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Hourly Activity Pattern */}
            <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                <CardHeader className="border-b border-ui-border-primary">
                    <div className="flex items-center gap-2">
                        <MdTimer className="text-ui-warning-text" />
                        <CardTitle className="text-ui-text-primary text-lg">Activity by Hour</CardTitle>
                    </div>
                    <CardDescription className="text-ui-text-secondary">
                        Typical usage patterns throughout the day
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={hourlyPattern}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--ui-border-primary)" opacity={0.3} />
                            <XAxis
                                dataKey="hour"
                                stroke="var(--ui-text-secondary)"
                                fontSize={12}
                            />
                            <YAxis
                                stroke="var(--ui-text-secondary)"
                                fontSize={12}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--ui-bg-tertiary)',
                                    border: '1px solid var(--ui-border-primary)',
                                    borderRadius: '0.5rem',
                                    color: 'var(--ui-text-primary)'
                                }}
                            />
                            <Bar
                                dataKey="count"
                                fill="var(--ui-warning)"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
