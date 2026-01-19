'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    MdPerson, MdCheckCircle, MdCleaningServices, MdSearch,
    MdFilterList, MdDownload, MdUpload, MdPersonAdd, MdVpnKey
} from 'react-icons/md';
import { ExtendedUser } from '@/hooks/useAdminData';
import { formatDate } from '@/utils/dateUtils';
import { authService } from '@/lib/auth';
import { API_BASE_URL } from '@/config';

interface EnhancedUserManagementProps {
    users: ExtendedUser[];
    onRefresh: () => void;
}

export function EnhancedUserManagement({ users, onRefresh }: EnhancedUserManagementProps) {
    const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'user' | 'admin'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'last_active'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Filtering and sorting logic
    const filteredUsers = useMemo(() => {
        let filtered = users.filter(user => {
            const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = filterRole === 'all' || user.role === filterRole;
            const matchesStatus = filterStatus === 'all' ||
                (filterStatus === 'active' && user.is_active) ||
                (filterStatus === 'inactive' && !user.is_active);

            return matchesSearch && matchesRole && matchesStatus;
        });

        // Sorting
        filtered.sort((a, b) => {
            let compareA: any, compareB: any;

            switch (sortBy) {
                case 'name':
                    compareA = a.name?.toLowerCase() || '';
                    compareB = b.name?.toLowerCase() || '';
                    break;
                case 'email':
                    compareA = a.email.toLowerCase();
                    compareB = b.email.toLowerCase();
                    break;
                case 'role':
                    compareA = a.role;
                    compareB = b.role;
                    break;
                case 'last_active':
                    compareA = (a as any).last_active || a.last_login || '';
                    compareB = (b as any).last_active || b.last_login || '';
                    break;
                default:
                    return 0;
            }

            if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
            if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [users, searchTerm, filterRole, filterStatus, sortBy, sortOrder]);

    const handleSort = (column: typeof sortBy) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const handleSelectAll = () => {
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

    const handleToggleActive = async (userId: number) => {
        try {
            const response = await authService.fetchWithAuth(
                `${API_BASE_URL}/api/auth/admin/users/${userId}/toggle-active`,
                { method: 'PUT' }
            );
            const data = await response.json();

            if (data.success) {
                toast.success('User status updated');
                onRefresh();
            } else {
                toast.error(data.error || 'Failed to update user status');
            }
        } catch (err) {
            toast.error('Failed to update user status');
            console.error('Toggle active error:', err);
        }
    };

    const handleChangeRole = async (userId: number, newRole: string) => {
        if (!confirm(`Change this user's role to ${newRole}?`)) return;

        try {
            const response = await authService.fetchWithAuth(
                `${API_BASE_URL}/api/auth/admin/users/${userId}/role`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: newRole }),
                }
            );
            const data = await response.json();

            if (data.success) {
                toast.success('User role updated');
                onRefresh();
            } else {
                toast.error(data.error || 'Failed to update user role');
            }
        } catch (err) {
            toast.error('Failed to update user role');
            console.error('Change role error:', err);
        }
    };

    const handleImpersonateUser = async (userId: number, userName: string) => {
        if (!confirm(`Impersonate ${userName}? All actions will be saved to their account.`)) return;

        try {
            const success = await authService.impersonateUser(userId);
            if (success) {
                toast.success(`Now impersonating ${userName}`);
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
        if (!confirm('Revoke all sessions for this user?')) return;

        try {
            const response = await authService.fetchWithAuth(
                `${API_BASE_URL}/api/auth/admin/users/${userId}/sessions`,
                { method: 'DELETE' }
            );
            const data = await response.json();

            if (data.success) {
                toast.success('All sessions revoked successfully');
                onRefresh();
            } else {
                toast.error(data.error || 'Failed to revoke sessions');
            }
        } catch (err) {
            toast.error('Failed to revoke sessions');
            console.error('Revoke sessions error:', err);
        }
    };

    const handleBulkActivate = async (activate: boolean) => {
        if (selectedUsers.size === 0) return;
        if (!confirm(`${activate ? 'Activate' : 'Deactivate'} ${selectedUsers.size} user(s)?`)) return;

        setBulkActionLoading(true);
        let successCount = 0;
        let errorCount = 0;

        for (const userId of selectedUsers) {
            try {
                const user = users.find(u => u.id === userId);
                if (user && ((activate && !user.is_active) || (!activate && user.is_active))) {
                    await handleToggleActive(userId);
                    successCount++;
                }
            } catch {
                errorCount++;
            }
        }

        setBulkActionLoading(false);
        setSelectedUsers(new Set());
        onRefresh();

        if (successCount > 0) {
            toast.success(`${successCount} user(s) ${activate ? 'activated' : 'deactivated'}`);
        }
        if (errorCount > 0) {
            toast.error(`Failed for ${errorCount} user(s)`);
        }
    };

    const handleBulkRevokeSession = async () => {
        if (selectedUsers.size === 0) return;
        if (!confirm(`Revoke all sessions for ${selectedUsers.size} user(s)?`)) return;

        setBulkActionLoading(true);
        let successCount = 0;
        let errorCount = 0;

        for (const userId of selectedUsers) {
            try {
                const response = await authService.fetchWithAuth(
                    `${API_BASE_URL}/api/auth/admin/users/${userId}/sessions`,
                    { method: 'DELETE' }
                );
                const data = await response.json();
                if (data.success) successCount++;
                else errorCount++;
            } catch {
                errorCount++;
            }
        }

        setBulkActionLoading(false);
        setSelectedUsers(new Set());
        onRefresh();

        if (successCount > 0) {
            toast.success(`Revoked sessions for ${successCount} user(s)`);
        }
        if (errorCount > 0) {
            toast.error(`Failed for ${errorCount} user(s)`);
        }
    };

    const handleExportUsers = () => {
        const csv = [
            ['Name', 'Email', 'Role', 'Status', 'Last Active'].join(','),
            ...filteredUsers.map(user => [
                user.name || '',
                user.email,
                user.role,
                user.is_active ? 'Active' : 'Inactive',
                (user as any).last_active || user.last_login || 'Never'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString()}.csv`;
        a.click();
        toast.success('Users exported successfully');
    };

    return (
        <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-sm">
            {/* Header with Search and Filters */}
            <CardHeader className="border-b border-ui-border-primary pb-4">
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-ui-text-primary text-lg flex items-center gap-2">
                                <MdPerson className="text-ui-accent-primary" />
                                User Management
                                <Badge variant="secondary" className="ml-2">
                                    {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-ui-text-secondary text-sm mt-1">
                                Manage user accounts, roles, and permissions
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={handleExportUsers}
                                            size="sm"
                                            variant="outline"
                                            className="border-ui-border-primary hover:bg-ui-bg-tertiary"
                                            disabled={filteredUsers.length === 0}
                                        >
                                            <MdDownload />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Export filtered users to CSV</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="flex gap-3 flex-wrap">
                        <div className="relative flex-1 min-w-[250px]">
                            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-text-muted" />
                            <Input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-ui-bg-tertiary border-ui-border-primary"
                            />
                        </div>
                        <Select
                            value={filterRole}
                            onChange={(val) => setFilterRole(val as any)}
                            options={[
                                { value: 'all', label: 'All Roles' },
                                { value: 'user', label: 'Users' },
                                { value: 'admin', label: 'Admins' },
                            ]}
                            className="w-32"
                        />
                        <Select
                            value={filterStatus}
                            onChange={(val) => setFilterStatus(val as any)}
                            options={[
                                { value: 'all', label: 'All Status' },
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                            ]}
                            className="w-32"
                        />
                    </div>
                </div>
            </CardHeader>

            {/* Bulk Actions Bar */}
            <div className="bg-ui-bg-tertiary/50 border-b border-ui-border-primary px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className={`font-semibold flex items-center gap-2 transition-colors ${selectedUsers.size > 0 ? 'text-ui-accent-primary' : 'text-ui-text-muted'
                            }`}>
                            <MdCheckCircle className={selectedUsers.size > 0 ? 'text-ui-accent-primary' : 'text-ui-text-muted'} />
                            {selectedUsers.size > 0
                                ? `${selectedUsers.size} user${selectedUsers.size !== 1 ? 's' : ''} selected`
                                : 'No users selected'
                            }
                        </span>
                        {selectedUsers.size > 0 && (
                            <Button
                                onClick={() => setSelectedUsers(new Set())}
                                variant="ghost"
                                size="sm"
                                className="text-ui-text-secondary hover:text-ui-text-primary h-8"
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => handleBulkActivate(true)}
                            disabled={bulkActionLoading || selectedUsers.size === 0}
                            size="sm"
                            className="bg-ui-success-bg hover:bg-ui-success-bg/90 text-ui-success-text border border-ui-success-border h-8"
                        >
                            <MdCheckCircle className="mr-1 h-4 w-4" />
                            Activate
                        </Button>
                        <Button
                            onClick={() => handleBulkActivate(false)}
                            disabled={bulkActionLoading || selectedUsers.size === 0}
                            size="sm"
                            className="bg-ui-warning-bg hover:bg-ui-warning-bg/90 text-ui-warning-text border border-ui-warning-border h-8"
                        >
                            Deactivate
                        </Button>
                        <Button
                            onClick={handleBulkRevokeSession}
                            disabled={bulkActionLoading || selectedUsers.size === 0}
                            size="sm"
                            variant="outline"
                            className="border-ui-danger-border text-ui-danger-text hover:bg-ui-danger-bg h-8"
                        >
                            <MdCleaningServices className="mr-1 h-4 w-4" />
                            Revoke Sessions
                        </Button>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-ui-bg-tertiary sticky top-0 z-10">
                            <tr>
                                <th className="text-left p-4 w-12">
                                    <Checkbox
                                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                                        onCheckedChange={handleSelectAll}
                                        aria-label="Select all users"
                                    />
                                </th>
                                <th
                                    className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider cursor-pointer hover:bg-ui-bg-quaternary"
                                    onClick={() => handleSort('name')}
                                >
                                    User {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th
                                    className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider cursor-pointer hover:bg-ui-bg-quaternary"
                                    onClick={() => handleSort('role')}
                                >
                                    Role {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">
                                    Status
                                </th>
                                <th
                                    className="text-left p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider cursor-pointer hover:bg-ui-bg-quaternary"
                                    onClick={() => handleSort('last_active')}
                                >
                                    Last Active {sortBy === 'last_active' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="text-right p-4 text-ui-text-secondary font-semibold text-xs uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ui-border-primary">
                            {filteredUsers.map((user) => (
                                <tr
                                    key={user.id}
                                    className={`hover:bg-ui-bg-tertiary/50 transition-colors ${selectedUsers.has(user.id) ? 'bg-ui-accent-primary-bg/20' : ''
                                        }`}
                                >
                                    <td className={`p-4 ${selectedUsers.has(user.id) ? 'border-l-4 border-ui-accent-primary' : 'border-l-4 border-transparent'}`}>
                                        <Checkbox
                                            checked={selectedUsers.has(user.id)}
                                            onCheckedChange={() => handleToggleUserSelection(user.id)}
                                            aria-label={`Select ${user.name}`}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-ui-accent-primary-bg flex items-center justify-center text-ui-accent-primary-text font-bold text-sm">
                                                {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-ui-text-primary">{user.name || 'Unnamed'}</div>
                                                <div className="text-xs text-ui-text-muted">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <Select
                                            value={user.role}
                                            onChange={(val) => handleChangeRole(user.id, val)}
                                            options={[
                                                { value: 'user', label: 'User' },
                                                { value: 'admin', label: 'Admin' },
                                            ]}
                                            className="w-28"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => handleToggleActive(user.id)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${user.is_active
                                                    ? 'bg-ui-success-bg text-ui-success-text border-ui-success-border hover:bg-ui-success-bg/80'
                                                    : 'bg-ui-danger-bg text-ui-danger-text border-ui-danger-border hover:bg-ui-danger-bg/80'
                                                }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-ui-success-text' : 'bg-ui-danger-text'}`} />
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td className="p-4 text-ui-text-secondary text-sm">
                                        {(user as any).last_active
                                            ? formatDate((user as any).last_active)
                                            : user.last_login
                                                ? formatDate(user.last_login)
                                                : 'Never'}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-1">
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

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-16 text-ui-text-muted">
                            <MdFilterList className="mx-auto h-12 w-12 opacity-30 mb-4" />
                            <p className="text-lg font-medium">No users found</p>
                            <p className="text-sm mt-2">Try adjusting your search or filters</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
