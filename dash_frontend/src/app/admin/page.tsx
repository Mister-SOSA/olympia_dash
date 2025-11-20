'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, User } from '@/lib/auth';
import { API_BASE_URL } from '@/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Select } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmModal } from '@/components/ui/modal';
import {
  MdPeople, MdCheckCircle, MdAdminPanelSettings, MdDevices,
  MdHistory, MdArrowBack, MdSettings, MdStorage, MdHealthAndSafety,
  MdFileDownload, MdCleaningServices, MdGroups, MdSecurity, MdPerson, MdBarChart, MdDescription
} from 'react-icons/md';
import { IoTime } from 'react-icons/io5';
import { toast } from 'sonner';
import { GroupsPanel } from '@/components/admin/GroupsPanel';
import { PermissionsPanel } from '@/components/admin/PermissionsPanel';
import { ActivityPanel } from '@/components/admin/ActivityPanel';
import { AnalyticsPanel } from '@/components/admin/AnalyticsPanel';
import { formatDate, formatDateTime } from '@/utils/dateUtils';

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
  user_email?: string;
  user_name?: string;
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
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'warning' | 'danger' | 'info';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => { } });
  const [stats, setStats] = useState<Stats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs' | 'devices' | 'groups' | 'permissions' | 'activity' | 'analytics'>('overview');
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

    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      // Alt+Number to switch tabs
      if (e.altKey && e.key >= '1' && e.key <= '8') {
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
          setActiveTab(tabs[tabIndex].id as any);
        }
      }
      // Alt+R to refresh
      if (e.altKey && e.key === 'r') {
        e.preventDefault();
        loadData();
        toast.success('Data refreshed');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
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
    setConfirmModal({
      isOpen: true,
      title: 'Change User Role',
      message: `Are you sure you want to change this user's role to ${newRole}?`,
      type: 'warning',
      onConfirm: () => executeChangeRole(userId, newRole)
    });
  };

  const executeChangeRole = async (userId: number, newRole: string) => {

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

  const handleImpersonateUser = async (userId: number, userName: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Impersonate ${userName}`,
      message: `You will:\n• View their dashboard\n• See their widgets and presets\n• Edit their configuration\n• Join their WebSocket room\n\nAll changes will be saved to their account.`,
      type: 'info',
      onConfirm: () => executeImpersonate(userId, userName)
    });
  };

  const executeImpersonate = async (userId: number, userName: string) => {

    try {
      console.log(`🎭 Initiating impersonation of ${userName} (ID: ${userId})`);
      const success = await authService.impersonateUser(userId);

      if (success) {
        toast.success(`Now impersonating ${userName}`, {
          description: 'Viewing their dashboard configuration'
        });

        console.log('🚀 Navigating to dashboard as impersonated user...');

        // Small delay to ensure all state is updated
        await new Promise(resolve => setTimeout(resolve, 100));

        // Use full page navigation to ensure clean state
        window.location.href = '/';
      } else {
        toast.error('Failed to impersonate user');
      }
    } catch (err) {
      toast.error('Failed to impersonate user');
      console.error('Impersonate error:', err);
    }
  };

  const handleRevokeAllSessions = async (userId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Revoke All Sessions',
      message: 'Are you sure you want to revoke all sessions for this user? They will need to log in again.',
      type: 'danger',
      onConfirm: () => executeRevokeAllSessions(userId)
    });
  };

  const executeRevokeAllSessions = async (userId: number) => {

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
    setConfirmModal({
      isOpen: true,
      title: 'Revoke Device Session',
      message: 'Are you sure you want to revoke this device session?',
      type: 'warning',
      onConfirm: () => executeDeleteDeviceSession(sessionId)
    });
  };

  const executeDeleteDeviceSession = async (sessionId: number) => {

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

  // Bulk user actions
  const handleSelectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleToggleUserSelection = (userId: number) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleBulkActivate = async (activate: boolean) => {
    if (selectedUsers.size === 0) return;

    const action = activate ? 'activate' : 'deactivate';
    setConfirmModal({
      isOpen: true,
      title: activate ? 'Activate Users' : 'Deactivate Users',
      message: `${action} ${selectedUsers.size} user(s)?`,
      type: 'warning',
      onConfirm: () => executeBulkActivate(activate)
    });
  };

  const executeBulkActivate = async (activate: boolean) => {
    const action = activate ? 'activate' : 'deactivate';

    setBulkActionLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const userId of selectedUsers) {
      try {
        // Find the user to check current status
        const user = users.find(u => u.id === userId);
        if (!user) continue;

        // Only toggle if the current state doesn't match the desired state
        if ((activate && !user.is_active) || (!activate && user.is_active)) {
          await handleToggleActive(userId);
          successCount++;
        } else {
          // User already in desired state, count as success
          successCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setBulkActionLoading(false);
    setSelectedUsers(new Set());

    if (successCount > 0) {
      toast.success(`${successCount} user(s) ${action}d successfully`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to ${action} ${errorCount} user(s)`);
    }
  };

  const handleBulkRevokeSession = async () => {
    if (selectedUsers.size === 0) return;

    setConfirmModal({
      isOpen: true,
      title: 'Revoke Sessions',
      message: `Revoke all sessions for ${selectedUsers.size} user(s)? They will need to log in again.`,
      type: 'danger',
      onConfirm: () => executeBulkRevokeSession()
    });
  };

  const executeBulkRevokeSession = async () => {

    setBulkActionLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const userId of selectedUsers) {
      try {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/users/${userId}/sessions`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }

    setBulkActionLoading(false);
    setSelectedUsers(new Set());
    loadData();

    if (successCount > 0) {
      toast.success(`Revoked sessions for ${successCount} user(s)`);
    }
    if (errorCount > 0) {
      toast.error(`Failed for ${errorCount} user(s)`);
    }
  };

  const handleSystemCleanup = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clean Up Database',
      message: 'This will clean up expired sessions, device codes, and old logs. Continue?',
      type: 'warning',
      onConfirm: () => executeSystemCleanup()
    });
  };

  const executeSystemCleanup = async () => {
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: MdAdminPanelSettings },
    { id: 'analytics', label: 'Analytics', icon: MdBarChart },
    { id: 'users', label: 'Users', icon: MdPeople },
    { id: 'groups', label: 'Groups', icon: MdGroups },
    { id: 'permissions', label: 'Permissions', icon: MdSecurity },
    { id: 'activity', label: 'Activity', icon: MdHistory },
    { id: 'logs', label: 'Audit Logs', icon: MdDescription },
    { id: 'devices', label: 'Devices', icon: MdDevices },
  ];

  return (
    <div className="flex h-screen bg-ui-bg-primary overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-ui-bg-secondary border-r border-ui-border-primary flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-ui-border-primary">
          <h1 className="text-xl font-bold text-ui-text-primary flex items-center gap-2">
            <MdAdminPanelSettings className="text-ui-accent-primary" />
            Admin Console
          </h1>
          <p className="text-xs text-ui-text-secondary mt-1">System Management</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === tab.id
                ? 'bg-ui-accent-primary text-white shadow-lg shadow-ui-accent-primary/20'
                : 'text-ui-text-secondary hover:bg-ui-bg-tertiary hover:text-ui-text-primary'
                }`}
            >
              <tab.icon className={`mr-3 h-5 w-5 ${activeTab === tab.id ? 'text-white' : 'text-ui-text-muted'}`} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-ui-border-primary">
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="w-full border-ui-border-primary hover:bg-ui-bg-tertiary text-ui-text-secondary justify-start"
          >
            <MdArrowBack className="mr-2 h-4 w-4" />
            Back to App
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-ui-bg-primary p-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header for Mobile/Context */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-ui-text-primary">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <p className="text-ui-text-secondary">
              {activeTab === 'overview' && 'System health and performance metrics'}
              {activeTab === 'analytics' && 'User behavior insights and trends'}
              {activeTab === 'users' && 'Manage user accounts and access'}
              {activeTab === 'groups' && 'Organize users into functional groups'}
              {activeTab === 'permissions' && 'Control widget access levels'}
              {activeTab === 'activity' && 'Monitor system activity and events'}
              {activeTab === 'logs' && 'Track system activity and security events'}
              {activeTab === 'devices' && 'Manage paired displays and sessions'}
            </p>
          </div>

          {error && (
            <div className="bg-ui-danger-bg border border-ui-danger-border text-ui-danger-text p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-ui-text-secondary text-sm font-medium mb-1">Total Users</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-ui-text-primary">{stats.total_users}</p>
                            <span className="text-xs text-ui-success-text">
                              {stats.active_users} active
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
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-ui-text-secondary text-sm font-medium mb-1">System Load</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-ui-warning-text">{stats.active_sessions}</p>
                            <span className="text-xs text-ui-text-muted">sessions</span>
                          </div>
                        </div>
                        <div className="p-3 bg-ui-warning-bg rounded-xl">
                          <IoTime className="w-6 h-6 text-ui-warning-text" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-ui-text-secondary text-sm font-medium mb-1">Database</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-ui-accent-secondary-text">{stats.db_size_mb}</p>
                            <span className="text-xs text-ui-text-muted">MB</span>
                          </div>
                        </div>
                        <div className="p-3 bg-ui-accent-secondary-bg rounded-xl">
                          <MdStorage className="w-6 h-6 text-ui-accent-secondary-text" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-ui-text-secondary text-sm font-medium mb-1">Health Status</p>
                          <p className={`text-3xl font-bold ${systemHealth?.status === 'healthy' ? 'text-ui-success-text' : 'text-ui-danger-text'}`}>
                            {systemHealth?.status || 'Unknown'}
                          </p>
                        </div>
                        <div className={`p-3 rounded-xl ${systemHealth?.status === 'healthy' ? 'bg-ui-success-bg' : 'bg-ui-danger-bg'}`}>
                          <MdHealthAndSafety className={`w-6 h-6 ${systemHealth?.status === 'healthy' ? 'text-ui-success-text' : 'text-ui-danger-text'}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* System Health Issues */}
              {systemHealth && systemHealth.issues.length > 0 && (
                <Card className="bg-ui-bg-secondary border-ui-border-primary">
                  <CardHeader>
                    <CardTitle className="text-ui-text-primary text-lg">System Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {systemHealth.issues.map((issue, idx) => (
                        <div key={idx} className={`p-4 rounded-lg flex items-start gap-3 ${issue.type === 'error' ? 'bg-ui-danger-bg text-ui-danger-text' :
                          issue.type === 'warning' ? 'bg-ui-warning-bg text-ui-warning-text' :
                            'bg-ui-accent-primary-bg text-ui-accent-primary-text'
                          }`}>
                          <MdSettings className="mt-1 flex-shrink-0" />
                          <span>{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-ui-bg-secondary border-ui-border-primary">
                  <CardHeader>
                    <CardTitle className="text-ui-text-primary">Maintenance</CardTitle>
                    <CardDescription className="text-ui-text-secondary">System cleanup and optimization tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={handleSystemCleanup}
                      className="w-full justify-start h-auto p-4 bg-ui-bg-tertiary hover:bg-ui-bg-quaternary text-ui-text-primary border border-ui-border-primary"
                    >
                      <div className="p-2 bg-ui-warning-bg rounded-lg mr-4">
                        <MdCleaningServices className="w-5 h-5 text-ui-warning-text" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Run System Cleanup</div>
                        <div className="text-xs text-ui-text-muted">Remove expired sessions and logs</div>
                      </div>
                    </Button>

                    <Button
                      onClick={loadData}
                      className="w-full justify-start h-auto p-4 bg-ui-bg-tertiary hover:bg-ui-bg-quaternary text-ui-text-primary border border-ui-border-primary"
                    >
                      <div className="p-2 bg-ui-success-bg rounded-lg mr-4">
                        <MdHealthAndSafety className="w-5 h-5 text-ui-success-text" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Refresh Metrics</div>
                        <div className="text-xs text-ui-text-muted">Reload all system stats</div>
                      </div>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-ui-bg-secondary border-ui-border-primary">
                  <CardHeader>
                    <CardTitle className="text-ui-text-primary">Data Export</CardTitle>
                    <CardDescription className="text-ui-text-secondary">Download system data for analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={handleExportUsers}
                      className="w-full justify-start h-auto p-4 bg-ui-bg-tertiary hover:bg-ui-bg-quaternary text-ui-text-primary border border-ui-border-primary"
                    >
                      <div className="p-2 bg-ui-accent-primary-bg rounded-lg mr-4">
                        <MdFileDownload className="w-5 h-5 text-ui-accent-primary-text" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Export Users</div>
                        <div className="text-xs text-ui-text-muted">Download user list as JSON</div>
                      </div>
                    </Button>

                    <Button
                      onClick={handleExportLogs}
                      className="w-full justify-start h-auto p-4 bg-ui-bg-tertiary hover:bg-ui-bg-quaternary text-ui-text-primary border border-ui-border-primary"
                    >
                      <div className="p-2 bg-ui-accent-secondary-bg rounded-lg mr-4">
                        <MdFileDownload className="w-5 h-5 text-ui-accent-secondary-text" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Export Logs</div>
                        <div className="text-xs text-ui-text-muted">Download recent audit logs</div>
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
              <CardHeader className="border-b border-ui-border-primary pb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex gap-4 flex-1 w-full">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-ui-bg-tertiary border border-ui-border-primary rounded-lg px-4 py-2 text-ui-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-ui-accent-primary pl-10"
                      />
                      <MdPerson className="absolute left-3 top-2.5 text-ui-text-muted" />
                    </div>
                    <div className="w-32">
                      <Select
                        value={filterRole}
                        onChange={(val) => setFilterRole(val as any)}
                        options={[
                          { value: 'all', label: 'All Roles' },
                          { value: 'user', label: 'User' },
                          { value: 'admin', label: 'Admin' },
                        ]}
                      />
                    </div>
                    <div className="w-32">
                      <Select
                        value={filterStatus}
                        onChange={(val) => setFilterStatus(val as any)}
                        options={[
                          { value: 'all', label: 'All Status' },
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Bulk Actions Bar - Always visible, disabled when no selection */}
              <div className="bg-ui-bg-secondary border-b border-ui-border-primary h-[72px]">
                <div className="p-4 h-full flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`font-semibold flex items-center gap-2 transition-colors ${selectedUsers.size > 0 ? 'text-ui-accent-primary' : 'text-ui-text-muted'
                      }`}>
                      <MdCheckCircle className={selectedUsers.size > 0 ? 'text-ui-accent-primary' : 'text-ui-text-muted'} />
                      {selectedUsers.size > 0
                        ? `${selectedUsers.size} user${selectedUsers.size !== 1 ? 's' : ''} selected`
                        : 'No users selected'
                      }
                    </span>
                    <Button
                      onClick={() => setSelectedUsers(new Set())}
                      variant="ghost"
                      size="sm"
                      disabled={selectedUsers.size === 0}
                      className="text-ui-text-secondary hover:text-ui-text-primary h-8 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleBulkActivate(true)}
                      disabled={bulkActionLoading || selectedUsers.size === 0}
                      size="sm"
                      className="bg-ui-success-bg hover:bg-ui-success-bg/90 text-ui-success-text border border-ui-success-border h-8 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <MdCheckCircle className="mr-1 h-4 w-4" />
                      Activate
                    </Button>
                    <Button
                      onClick={() => handleBulkActivate(false)}
                      disabled={bulkActionLoading || selectedUsers.size === 0}
                      size="sm"
                      className="bg-ui-warning-bg hover:bg-ui-warning-bg/90 text-ui-warning-text border border-ui-warning-border h-8 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Deactivate
                    </Button>
                    <Button
                      onClick={handleBulkRevokeSession}
                      disabled={bulkActionLoading || selectedUsers.size === 0}
                      size="sm"
                      variant="outline"
                      className="border-ui-danger-border text-ui-danger-text hover:bg-ui-danger-bg h-8 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <MdCleaningServices className="mr-1 h-4 w-4" />
                      Revoke Sessions
                    </Button>
                  </div>
                </div>
              </div>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-ui-bg-tertiary">
                      <tr>
                        <th className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider w-12">
                          <Checkbox
                            checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                            onCheckedChange={handleSelectAllUsers}
                          />
                        </th>
                        <th className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">User</th>
                        <th className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">Role</th>
                        <th className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">Status</th>
                        <th className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">Last Login</th>
                        <th className="text-right p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ui-border-primary">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className={`hover:bg-ui-bg-tertiary/50 transition-colors ${selectedUsers.has(user.id) ? 'bg-ui-accent-primary-bg/20' : ''}`}>
                          <td className={`p-4 ${selectedUsers.has(user.id) ? 'border-l-4 border-ui-accent-primary' : 'border-l-4 border-transparent'}`}>
                            <Checkbox
                              checked={selectedUsers.has(user.id)}
                              onCheckedChange={() => handleToggleUserSelection(user.id)}
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-ui-accent-primary-bg flex items-center justify-center text-ui-accent-primary-text font-bold">
                                {user.name?.[0] || user.email[0]}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-ui-text-primary">{user.name}</div>
                                <div className="text-xs text-ui-text-muted">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="w-28">
                              <Select
                                value={user.role}
                                onChange={(val) => handleChangeRole(user.id, val)}
                                options={[
                                  { value: 'user', label: 'User' },
                                  { value: 'admin', label: 'Admin' },
                                ]}
                              />
                            </div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${user.is_active
                                ? 'bg-ui-success-bg text-ui-success-text border-ui-success-border'
                                : 'bg-ui-danger-bg text-ui-danger-text border-ui-danger-border'
                                }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-ui-success-text' : 'bg-ui-danger-text'
                                }`} />
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-4 text-ui-text-secondary text-sm">
                            {user.last_login
                              ? formatDate(user.last_login)
                              : 'Never'}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      onClick={() => handleImpersonateUser(user.id, user.name)}
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-ui-accent-secondary-text hover:bg-ui-accent-secondary-bg"
                                      disabled={user.role === 'admin'}
                                    >
                                      <MdPerson className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Impersonate User</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      onClick={() => handleToggleActive(user.id)}
                                      variant="ghost"
                                      size="sm"
                                      className={`h-8 w-8 p-0 ${user.is_active ? 'text-ui-warning-text hover:bg-ui-warning-bg' : 'text-ui-success-text hover:bg-ui-success-bg'}`}
                                    >
                                      <MdCheckCircle className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{user.is_active ? 'Deactivate User' : 'Activate User'}</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      onClick={() => handleRevokeAllSessions(user.id)}
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-ui-danger-text hover:bg-ui-danger-bg"
                                    >
                                      <MdCleaningServices className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Revoke All Sessions</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'groups' && (
            <GroupsPanel />
          )}

          {activeTab === 'permissions' && (
            <PermissionsPanel />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsPanel />
          )}

          {activeTab === 'activity' && (
            <ActivityPanel />
          )}

          {activeTab === 'logs' && (
            <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
              <CardHeader className="border-b border-ui-border-primary pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-ui-text-primary text-lg">System Activity</CardTitle>
                  <Button
                    onClick={handleExportLogs}
                    variant="outline"
                    size="sm"
                    className="border-ui-border-primary hover:bg-ui-bg-tertiary text-ui-text-secondary"
                  >
                    <MdFileDownload className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-ui-bg-tertiary">
                      <tr>
                        <th className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">Time</th>
                        <th className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">Action</th>
                        <th className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">User</th>
                        <th className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">Details</th>
                        <th className="text-right p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ui-border-primary">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-ui-bg-tertiary/50 transition-colors">
                          <td className="p-4 text-ui-text-muted text-xs whitespace-nowrap">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${log.action.includes('error') || log.action.includes('failed') ? 'bg-ui-danger-bg text-ui-danger-text' :
                              log.action.includes('deleted') || log.action.includes('revoked') ? 'bg-ui-warning-bg text-ui-warning-text' :
                                log.action.includes('granted') || log.action.includes('created') ? 'bg-ui-success-bg text-ui-success-text' :
                                  'bg-ui-accent-primary-bg text-ui-accent-primary-text'
                              }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-4 text-ui-text-secondary text-sm">
                            {log.user_id ? (
                              <div>
                                <div className="font-medium text-ui-text-primary">{log.user_name || `User #${log.user_id}`}</div>
                                <div className="text-xs text-ui-text-muted">{log.user_email}</div>
                              </div>
                            ) : (
                              <span className="text-ui-text-muted italic">System</span>
                            )}
                          </td>
                          <td className="p-4 text-ui-text-secondary text-sm max-w-md truncate" title={log.details || ''}>
                            {log.details || '-'}
                          </td>
                          <td className="p-4 text-right text-ui-text-muted text-xs font-mono">
                            {log.ip_address || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'devices' && (
            <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
              <CardHeader>
                <CardTitle className="text-ui-text-primary text-lg">Active Sessions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-ui-bg-tertiary">
                      <tr>
                        <th className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">Device</th>
                        <th className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">User</th>
                        <th className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">Last Active</th>
                        <th className="text-right p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ui-border-primary">
                      {deviceSessions.map((session) => (
                        <tr key={session.id} className="hover:bg-ui-bg-tertiary/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-ui-bg-tertiary rounded-lg">
                                <MdDevices className="text-ui-text-secondary" />
                              </div>
                              <span className="text-ui-text-primary font-medium">{session.device_name || 'Unknown Device'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-ui-text-primary">{session.user_name}</div>
                            <div className="text-xs text-ui-text-muted">{session.user_email}</div>
                          </td>
                          <td className="p-4 text-ui-text-secondary text-sm">
                            {formatDateTime(session.last_used)}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              onClick={() => handleDeleteDeviceSession(session.id)}
                              variant="ghost"
                              size="sm"
                              className="text-ui-danger-text hover:bg-ui-danger-bg"
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
        </div>
      </main>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
}
