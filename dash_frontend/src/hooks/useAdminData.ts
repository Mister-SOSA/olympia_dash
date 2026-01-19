import { useState, useCallback, useEffect } from 'react';
import { authService, User } from '@/lib/auth';
import { API_BASE_URL } from '@/config';
import { toast } from 'sonner';

export interface ExtendedUser extends User {
    permissions?: string[];
    is_active?: boolean;
}

export interface Stats {
    total_users: number;
    active_users: number;
    admin_count: number;
    active_sessions: number;
    active_device_sessions: number;
    total_sessions: number;
    recent_active: number;
    currently_online: number;
    total_preferences: number;
    total_audit_logs: number;
    db_size_mb: number;
}

export interface AuditLog {
    id: number;
    user_id: number | null;
    action: string;
    details: string | null;
    ip_address: string | null;
    created_at: string;
    user_email?: string;
    user_name?: string;
}

export interface DeviceSession {
    id: number;
    user_id: number;
    device_name: string;
    created_at: string;
    last_used: string;
    expires_at: string;
    user_email: string;
    user_name: string;
    session_type?: 'browser' | 'device';
    icon?: 'desktop' | 'mobile' | 'tablet' | 'tv';
    ip_address?: string;
}

export interface SystemHealth {
    status: string;
    issues: Array<{
        type: 'info' | 'warning' | 'error';
        message: string;
    }>;
    db_size_mb: number;
    timestamp: string;
}

export function useAdminData() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<ExtendedUser[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
    const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
    const [error, setError] = useState<string>('');
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');

        try {
            // Load all admin data in parallel for better performance
            const [usersRes, statsRes, logsRes, devicesRes, healthRes] = await Promise.all([
                authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/users`),
                authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/stats`),
                authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/audit-logs?limit=100`),
                authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/device-sessions`),
                authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/system/health`)
            ]);

            const [usersData, statsData, logsData, devicesData, healthData] = await Promise.all([
                usersRes.json(),
                statsRes.json(),
                logsRes.json(),
                devicesRes.json(),
                healthRes.json()
            ]);

            if (usersData.success) setUsers(usersData.users);
            else throw new Error(usersData.error || 'Failed to load users');

            if (statsData.success) setStats(statsData.stats);
            if (logsData.success) setAuditLogs(logsData.logs);
            if (devicesData.success) setDeviceSessions(devicesData.sessions);
            if (healthData.success) setSystemHealth(healthData);

            setLastRefresh(new Date());
            if (!silent) toast.success('Admin data loaded successfully');
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to load admin data';
            setError(errorMsg);
            console.error('Admin data error:', err);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Auto-refresh every 5 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            loadData(true); // Silent refresh
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [loadData]);

    const refetchUsers = useCallback(async () => {
        try {
            const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/users`);
            const data = await response.json();
            if (data.success) {
                setUsers(data.users);
                return data.users;
            }
        } catch (err) {
            console.error('Failed to refetch users:', err);
        }
        return users;
    }, [users]);

    return {
        loading,
        users,
        stats,
        auditLogs,
        deviceSessions,
        systemHealth,
        error,
        lastRefresh,
        loadData,
        refetchUsers,
        setUsers
    };
}
