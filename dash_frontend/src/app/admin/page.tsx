'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, User } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { MdPeople, MdCheckCircle, MdAdminPanelSettings, MdDevices, MdHistory, MdArrowBack } from 'react-icons/md';
import { IoTime } from 'react-icons/io5';

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
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

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
      const usersResponse = await authService.fetchWithAuth('/api/auth/admin/users');
      const usersData = await usersResponse.json();

      if (usersData.success) {
        setUsers(usersData.users);
      } else {
        setError(usersData.error || 'Failed to load users');
      }

      // Load stats
      const statsResponse = await authService.fetchWithAuth('/api/auth/admin/stats');
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStats(statsData.stats);
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
      const response = await authService.fetchWithAuth(`/api/auth/admin/users/${userId}/toggle-active`, {
        method: 'PUT',
      });

      const data = await response.json();

      if (data.success) {
        loadData();
      } else {
        alert(data.error || 'Failed to update user status');
      }
    } catch (err) {
      alert('Failed to update user status');
      console.error('Toggle active error:', err);
    }
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    try {
      const response = await authService.fetchWithAuth(`/api/auth/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (data.success) {
        loadData();
      } else {
        alert(data.error || 'Failed to update user role');
      }
    } catch (err) {
      alert('Failed to update user role');
      console.error('Change role error:', err);
    }
  };

  const handleRevokeAllSessions = async (userId: number) => {
    if (!confirm('Are you sure you want to revoke all sessions for this user?')) {
      return;
    }

    try {
      const response = await authService.fetchWithAuth(`/api/auth/admin/users/${userId}/sessions`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('All sessions revoked successfully');
        loadData();
      } else {
        alert(data.error || 'Failed to revoke sessions');
      }
    } catch (err) {
      alert('Failed to revoke sessions');
      console.error('Revoke sessions error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Admin Dashboard</h1>
            <p className="text-slate-400">Manage users and system settings</p>
          </div>
          <Button 
            onClick={() => router.push('/')} 
            variant="outline" 
            className="border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            <MdArrowBack className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Total Users</p>
                    <p className="text-3xl font-bold text-white">{stats.total_users}</p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <MdPeople className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Active Users</p>
                    <p className="text-3xl font-bold text-green-400">{stats.active_users}</p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <MdCheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Admins</p>
                    <p className="text-3xl font-bold text-purple-400">{stats.admin_count}</p>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-lg">
                    <MdAdminPanelSettings className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Active Sessions</p>
                    <p className="text-3xl font-bold text-orange-400">{stats.active_sessions}</p>
                  </div>
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <IoTime className="w-6 h-6 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Device Sessions</p>
                    <p className="text-3xl font-bold text-yellow-400">{stats.active_device_sessions}</p>
                  </div>
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <MdDevices className="w-6 h-6 text-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Recent Logins</p>
                    <p className="text-3xl font-bold text-cyan-400">{stats.recent_logins}</p>
                  </div>
                  <div className="p-3 bg-cyan-500/10 rounded-lg">
                    <MdHistory className="w-6 h-6 text-cyan-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-xl">User Management</CardTitle>
            <CardDescription className="text-slate-400">
              Manage user accounts, roles, and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left p-4 text-slate-300 font-semibold text-sm">Email</th>
                    <th className="text-left p-4 text-slate-300 font-semibold text-sm">Name</th>
                    <th className="text-left p-4 text-slate-300 font-semibold text-sm">Role</th>
                    <th className="text-left p-4 text-slate-300 font-semibold text-sm">Status</th>
                    <th className="text-left p-4 text-slate-300 font-semibold text-sm">Last Login</th>
                    <th className="text-right p-4 text-slate-300 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 text-slate-300 text-sm">{user.email}</td>
                      <td className="p-4 text-slate-300 text-sm">{user.name}</td>
                      <td className="p-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeRole(user.id, e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-300 text-sm hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.is_active
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 text-sm">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleString()
                          : 'Never'}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button
                          onClick={() => handleToggleActive(user.id)}
                          variant="outline"
                          size="sm"
                          className="text-xs border-slate-700 hover:bg-slate-800"
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          onClick={() => handleRevokeAllSessions(user.id)}
                          variant="outline"
                          size="sm"
                          className="text-xs border-slate-700 hover:bg-slate-800 text-red-400 hover:text-red-300"
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
      </div>
    </div>
  );
}
