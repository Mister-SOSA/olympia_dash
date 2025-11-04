'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, User } from '@/lib/auth';
import { API_BASE_URL } from '@/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { 
  MdPeople, MdCheckCircle, MdAdminPanelSettings, MdDevices, 
  MdHistory, MdArrowBack, MdSettings, MdStorage, MdHealthAndSafety,
  MdFileDownload, MdCleaningServices
} from 'react-icons/md';
import { IoTime } from 'react-icons/io5';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

interface ExtendedUser extends User {
  permissions?: string[];
  is_active?: boolean;
}

interface Stats {
  total_users: number;
  active_users: number;
  admin_count: number;
  active_sessions: number;
  active_device_sessions: number;
  recent_logins: number;
  total_preferences: number;
  total_audit_logs: number;
  db_size_mb: number;
}

interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

interface DeviceSession {
  id: number;
  user_id: number;
  device_name: string;
  created_at: string;
  last_used: string;
  expires_at: string;
  user_email: string;
  user_name: string;
}

interface SystemHealth {
  status: string;
  issues: Array<{
    type: 'info' | 'warning' | 'error';
    message: string;
  }>;
  db_size_mb: number;
  timestamp: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'devices' | 'system'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'user' | 'admin'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (!authService.isAdmin()) {
      router.push('/');
      return;
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // Load users
      const usersResponse = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/users`);
      const usersData = await usersResponse.json();

      if (usersData.success) {
        setUsers(usersData.users);
      } else {
        setError(usersData.error || 'Failed to load users');
      }

      // Load stats
      const statsResponse = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/stats`);
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStats(statsData.stats);
      }

      // Load audit logs
      const logsResponse = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/audit-logs?limit=100`);
      const logsData = await logsResponse.json();

      if (logsData.success) {
        setAuditLogs(logsData.logs);
      }

      // Load device sessions
      const devicesResponse = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/device-sessions`);
      const devicesData = await devicesResponse.json();

      if (devicesData.success) {
        setDeviceSessions(devicesData.sessions);
      }

      // Load system health
      const healthResponse = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/system/health`);
      const healthData = await healthResponse.json();

      if (healthData.success) {
        setSystemHealth(healthData);
      }
    } catch (err) {
      setError('Failed to load admin data');
      console.error('Admin data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/users/${userId}/toggle-active`, {
        method: 'PUT',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('User status updated');
        loadData();
      } else {
        toast.error(data.error || 'Failed to update user status');
      }
    } catch (err) {
      toast.error('Failed to update user status');
      console.error('Toggle active error:', err);
    }
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    try {
      const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('User role updated');
        loadData();
      } else {
        toast.error(data.error || 'Failed to update user role');
      }
    } catch (err) {
      toast.error('Failed to update user role');
      console.error('Change role error:', err);
    }
  };

  const handleRevokeAllSessions = async (userId: number) => {
    if (!confirm('Are you sure you want to revoke all sessions for this user?')) {
      return;
    }

    try {
      const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/users/${userId}/sessions`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('All sessions revoked successfully');
        loadData();
      } else {
        toast.error(data.error || 'Failed to revoke sessions');
      }
    } catch (err) {
      toast.error('Failed to revoke sessions');
      console.error('Revoke sessions error:', err);
    }
  };

  const handleDeleteDeviceSession = async (sessionId: number) => {
    if (!confirm('Are you sure you want to revoke this device session?')) {
      return;
    }

    try {
      const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/device-sessions/${sessionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Device session revoked');
        loadData();
      } else {
        toast.error(data.error || 'Failed to revoke device session');
      }
    } catch (err) {
      toast.error('Failed to revoke device session');
      console.error('Delete device session error:', err);
    }
  };

  const handleSystemCleanup = async () => {
    if (!confirm('This will clean up expired sessions, device codes, and old logs. Continue?')) {
      return;
    }

    try {
      const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/system/cleanup`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Cleanup completed! Removed ${data.deleted_logs} logs, ${data.deleted_rate_limits} rate limits`);
        loadData();
      } else {
        toast.error(data.error || 'Failed to clean up system');
      }
    } catch (err) {
      toast.error('Failed to clean up system');
      console.error('Cleanup error:', err);
    }
  };

  const handleExportUsers = async () => {
    try {
      const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/export/users`);
      const data = await response.json();

      if (data.success) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString()}.json`;
        a.click();
        toast.success('Users exported successfully');
      } else {
        toast.error('Failed to export users');
      }
    } catch (err) {
      toast.error('Failed to export users');
      console.error('Export error:', err);
    }
  };

  const handleExportLogs = async () => {
    try {
      const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/export/audit-logs?limit=1000`);
      const data = await response.json();

      if (data.success) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-export-${new Date().toISOString()}.json`;
        a.click();
        toast.success('Audit logs exported successfully');
      } else {
        toast.error('Failed to export logs');
      }
    } catch (err) {
      toast.error('Failed to export logs');
      console.error('Export error:', err);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' ||
                          (filterStatus === 'active' && user.is_active) ||
                          (filterStatus === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ui-bg-primary">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ui-bg-primary p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-ui-text-primary mb-1">Admin Dashboard</h1>
            <p className="text-ui-text-secondary">Comprehensive system management and monitoring</p>
          </div>
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="border-ui-border-primary hover:bg-ui-bg-tertiary text-ui-text-secondary"
          >
            <MdArrowBack className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {error && (
          <div className="bg-ui-danger-bg border border-red-500 text-ui-danger-text p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="bg-ui-bg-secondary border-ui-border-primary hover:border-ui-border-primary transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ui-text-secondary text-sm mb-1">Total Users</p>
                    <p className="text-3xl font-bold text-ui-text-primary">{stats.total_users}</p>
                  </div>
                  <div className="p-3 bg-ui-accent-primary-bg rounded-lg">
                    <MdPeople className="w-6 h-6 text-ui-accent-primary-text" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-ui-bg-secondary border-ui-border-primary hover:border-ui-border-primary transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ui-text-secondary text-sm mb-1">Active Users</p>
                    <p className="text-3xl font-bold text-green-400">{stats.active_users}</p>
                  </div>
                  <div className="p-3 bg-ui-success-bg rounded-lg">
                    <MdCheckCircle className="w-6 h-6 text-ui-success-text" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-ui-bg-secondary border-ui-border-primary hover:border-ui-border-primary transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ui-text-secondary text-sm mb-1">Admins</p>
                    <p className="text-3xl font-bold text-purple-400">{stats.admin_count}</p>
                  </div>
                  <div className="p-3 bg-ui-accent-secondary-bg rounded-lg">
                    <MdAdminPanelSettings className="w-6 h-6 text-ui-accent-secondary-text" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-ui-bg-secondary border-ui-border-primary hover:border-ui-border-primary transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ui-text-secondary text-sm mb-1">Sessions</p>
                    <p className="text-3xl font-bold text-orange-400">{stats.active_sessions}</p>
                  </div>
                  <div className="p-3 bg-ui-warning-bg rounded-lg">
                    <IoTime className="w-6 h-6 text-ui-warning-text" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-ui-bg-secondary border-ui-border-primary hover:border-ui-border-primary transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ui-text-secondary text-sm mb-1">DB Size</p>
                    <p className="text-3xl font-bold text-cyan-400">{stats.db_size_mb}</p>
                    <p className="text-ui-text-muted text-xs">MB</p>
                  </div>
                  <div className="p-3 bg-ui-accent-primary-bg rounded-lg">
                    <MdStorage className="w-6 h-6 text-ui-accent-primary-text" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* System Health Alert */}
        {systemHealth && systemHealth.status !== 'healthy' && (
          <Card className="bg-ui-danger-bg border-red-500">
            <CardHeader>
              <CardTitle className="text-ui-danger-text flex items-center">
                <MdHealthAndSafety className="mr-2" />
                System Health: {systemHealth.status}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {systemHealth.issues.map((issue, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${
                    issue.type === 'error' ? 'bg-red-500/20 text-red-300' :
                    issue.type === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {issue.message}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-ui-border-primary">
          {[
            { id: 'users', label: 'User Management', icon: MdPeople },
            { id: 'logs', label: 'Audit Logs', icon: MdHistory },
            { id: 'devices', label: 'Device Sessions', icon: MdDevices },
            { id: 'system', label: 'System Tools', icon: MdSettings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-ui-accent-primary text-ui-accent-primary-text'
                  : 'border-transparent text-ui-text-secondary hover:text-ui-text-secondary'
              }`}
            >
              <tab.icon className="mr-2 h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <Card className="bg-ui-bg-secondary border-ui-border-primary">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-ui-text-primary text-xl">User Management</CardTitle>
                  <CardDescription className="text-ui-text-secondary">
                    Manage user accounts, roles, and permissions ({filteredUsers.length} users)
                  </CardDescription>
                </div>
                <Button
                  onClick={handleExportUsers}
                  variant="outline"
                  size="sm"
                  className="border-ui-border-primary hover:bg-ui-bg-tertiary text-ui-text-secondary"
                >
                  <MdFileDownload className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
              
              {/* Search and Filters */}
              <div className="flex gap-4 mt-4">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-ui-bg-tertiary border border-ui-border-primary rounded px-4 py-2 text-ui-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-ui-accent-primary"
                />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as any)}
                  className="bg-ui-bg-tertiary border border-ui-border-primary rounded px-4 py-2 text-ui-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-ui-accent-primary"
                >
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="bg-ui-bg-tertiary border border-ui-border-primary rounded px-4 py-2 text-ui-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-ui-accent-primary"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ui-border-primary">
                      <th className="text-left p-4 text-ui-text-secondary font-semibold text-sm">Email</th>
                      <th className="text-left p-4 text-ui-text-secondary font-semibold text-sm">Name</th>
                      <th className="text-left p-4 text-ui-text-secondary font-semibold text-sm">Role</th>
                      <th className="text-left p-4 text-ui-text-secondary font-semibold text-sm">Status</th>
                      <th className="text-left p-4 text-ui-text-secondary font-semibold text-sm">Last Login</th>
                      <th className="text-right p-4 text-ui-text-secondary font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-ui-border-primary hover:bg-ui-bg-tertiary/50 transition-colors">
                        <td className="p-4 text-ui-text-secondary text-sm">{user.email}</td>
                        <td className="p-4 text-ui-text-secondary text-sm">{user.name}</td>
                        <td className="p-4">
                          <select
                            value={user.role}
                            onChange={(e) => handleChangeRole(user.id, e.target.value)}
                            className="bg-ui-bg-tertiary border border-ui-border-primary rounded px-3 py-1.5 text-ui-text-secondary text-sm hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-ui-accent-primary"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${user.is_active
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-ui-danger-text'
                            }`}
                          >
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-ui-text-secondary text-sm">
                          {user.last_login
                            ? new Date(user.last_login).toLocaleString()
                            : 'Never'}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <Button
                            onClick={() => handleToggleActive(user.id)}
                            variant="outline"
                            size="sm"
                            className="text-xs border-ui-border-primary hover:bg-ui-bg-tertiary"
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            onClick={() => handleRevokeAllSessions(user.id)}
                            variant="outline"
                            size="sm"
                            className="text-xs border-ui-border-primary hover:bg-ui-bg-tertiary text-ui-danger-text hover:text-red-300"
                          >
                            Revoke Sessions
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'logs' && (
          <Card className="bg-ui-bg-secondary border-ui-border-primary">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-ui-text-primary text-xl">Audit Logs</CardTitle>
                  <CardDescription className="text-ui-text-secondary">
                    System activity and user actions ({auditLogs.length} recent logs)
                  </CardDescription>
                </div>
                <Button
                  onClick={handleExportLogs}
                  variant="outline"
                  size="sm"
                  className="border-ui-border-primary hover:bg-ui-bg-tertiary text-ui-text-secondary"
                >
                  <MdFileDownload className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-ui-bg-tertiary rounded-lg hover:bg-slate-700 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.action.includes('error') || log.action.includes('failed') ? 'bg-red-500/20 text-ui-danger-text' :
                          log.action.includes('deleted') || log.action.includes('revoked') ? 'bg-orange-500/20 text-orange-400' :
                          log.action.includes('granted') || log.action.includes('created') ? 'bg-green-500/20 text-green-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {log.action}
                        </span>
                        <span className="text-ui-text-secondary text-sm">
                          User ID: {log.user_id || 'System'}
                        </span>
                      </div>
                      <span className="text-ui-text-muted text-xs">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-ui-text-secondary text-sm">{log.details}</p>
                    )}
                    {log.ip_address && (
                      <p className="text-ui-text-muted text-xs mt-1">IP: {log.ip_address}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'devices' && (
          <Card className="bg-ui-bg-secondary border-ui-border-primary">
            <CardHeader>
              <CardTitle className="text-ui-text-primary text-xl">Device Sessions</CardTitle>
              <CardDescription className="text-ui-text-secondary">
                Manage paired TV and device dashboards ({deviceSessions.length} active)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ui-border-primary">
                      <th className="text-left p-4 text-ui-text-secondary font-semibold text-sm">Device Name</th>
                      <th className="text-left p-4 text-ui-text-secondary font-semibold text-sm">User</th>
                      <th className="text-left p-4 text-ui-text-secondary font-semibold text-sm">Created</th>
                      <th className="text-left p-4 text-ui-text-secondary font-semibold text-sm">Last Used</th>
                      <th className="text-right p-4 text-ui-text-secondary font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deviceSessions.map((session) => (
                      <tr key={session.id} className="border-b border-ui-border-primary hover:bg-ui-bg-tertiary/50 transition-colors">
                        <td className="p-4 text-ui-text-secondary text-sm">{session.device_name || 'Unknown Device'}</td>
                        <td className="p-4 text-ui-text-secondary text-sm">
                          <div>
                            <div className="font-medium">{session.user_name}</div>
                            <div className="text-ui-text-muted text-xs">{session.user_email}</div>
                          </div>
                        </td>
                        <td className="p-4 text-ui-text-secondary text-sm">
                          {new Date(session.created_at).toLocaleString()}
                        </td>
                        <td className="p-4 text-ui-text-secondary text-sm">
                          {new Date(session.last_used).toLocaleString()}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            onClick={() => handleDeleteDeviceSession(session.id)}
                            variant="outline"
                            size="sm"
                            className="text-xs border-ui-border-primary hover:bg-ui-bg-tertiary text-ui-danger-text hover:text-red-300"
                          >
                            Revoke
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6">
            <Card className="bg-ui-bg-secondary border-ui-border-primary">
              <CardHeader>
                <CardTitle className="text-ui-text-primary text-xl">System Tools</CardTitle>
                <CardDescription className="text-ui-text-secondary">
                  Database maintenance and system utilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={handleSystemCleanup}
                    className="h-20 bg-ui-warning-bg hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 flex flex-col items-center justify-center"
                  >
                    <MdCleaningServices className="h-6 w-6 mb-2" />
                    <span>Run System Cleanup</span>
                    <span className="text-xs text-ui-text-muted">Remove expired data</span>
                  </Button>

                  <Button
                    onClick={handleExportUsers}
                    className="h-20 bg-ui-accent-primary-bg hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 flex flex-col items-center justify-center"
                  >
                    <MdFileDownload className="h-6 w-6 mb-2" />
                    <span>Export All Users</span>
                    <span className="text-xs text-ui-text-muted">JSON format</span>
                  </Button>

                  <Button
                    onClick={handleExportLogs}
                    className="h-20 bg-ui-accent-secondary-bg hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 flex flex-col items-center justify-center"
                  >
                    <MdFileDownload className="h-6 w-6 mb-2" />
                    <span>Export Audit Logs</span>
                    <span className="text-xs text-ui-text-muted">Last 1000 entries</span>
                  </Button>

                  <Button
                    onClick={loadData}
                    className="h-20 bg-ui-success-bg hover:bg-green-500/20 border border-green-500/30 text-green-300 flex flex-col items-center justify-center"
                  >
                    <MdHealthAndSafety className="h-6 w-6 mb-2" />
                    <span>Refresh System Data</span>
                    <span className="text-xs text-ui-text-muted">Reload all metrics</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Info */}
            {stats && (
              <Card className="bg-ui-bg-secondary border-ui-border-primary">
                <CardHeader>
                  <CardTitle className="text-ui-text-primary text-xl">System Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-ui-bg-tertiary rounded-lg">
                      <p className="text-ui-text-secondary text-sm mb-1">Total Preferences</p>
                      <p className="text-2xl font-bold text-ui-text-primary">{stats.total_preferences}</p>
                    </div>
                    <div className="p-4 bg-ui-bg-tertiary rounded-lg">
                      <p className="text-ui-text-secondary text-sm mb-1">Total Audit Logs</p>
                      <p className="text-2xl font-bold text-ui-text-primary">{stats.total_audit_logs}</p>
                    </div>
                    <div className="p-4 bg-ui-bg-tertiary rounded-lg">
                      <p className="text-ui-text-secondary text-sm mb-1">Database Size</p>
                      <p className="text-2xl font-bold text-ui-text-primary">{stats.db_size_mb} MB</p>
                    </div>
                    <div className="p-4 bg-ui-bg-tertiary rounded-lg">
                      <p className="text-ui-text-secondary text-sm mb-1">Device Sessions</p>
                      <p className="text-2xl font-bold text-ui-text-primary">{stats.active_device_sessions}</p>
                    </div>
                    <div className="p-4 bg-ui-bg-tertiary rounded-lg">
                      <p className="text-ui-text-secondary text-sm mb-1">Recent Logins</p>
                      <p className="text-2xl font-bold text-ui-text-primary">{stats.recent_logins}</p>
                      <p className="text-ui-text-muted text-xs">Last 24 hours</p>
                    </div>
                    <div className="p-4 bg-ui-bg-tertiary rounded-lg">
                      <p className="text-ui-text-secondary text-sm mb-1">System Status</p>
                      <p className={`text-2xl font-bold ${
                        systemHealth?.status === 'healthy' ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {systemHealth?.status || 'Loading...'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
