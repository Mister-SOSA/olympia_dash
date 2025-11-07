'use client';

import { useState, useEffect, useMemo } from 'react';
import { adminService } from '@/lib/admin';
import { authService, User } from '@/lib/auth';
import { API_BASE_URL } from '@/config';
import { WIDGETS, getWidgetsByCategory } from '@/constants/widgets';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';
import { Checkbox } from '@/components/ui/checkbox';
import {
    MdClose, MdSecurity, MdSearch, MdFilterList, MdPerson, MdGroup,
    MdCheckCircle, MdCancel, MdDelete
} from 'react-icons/md';
import type { UserGroup, WidgetPermission } from '@/types';

interface WidgetPermissionsManagerProps {
    onClose: () => void;
    onPermissionsChanged: () => void;
}

type AccessLevel = 'view' | 'edit' | 'admin';
type PermissionMode = 'user' | 'group';

export function WidgetPermissionsManager({ onClose, onPermissionsChanged }: WidgetPermissionsManagerProps) {
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allGroups, setAllGroups] = useState<UserGroup[]>([]);
    const [userPermissions, setUserPermissions] = useState<WidgetPermission[]>([]);
    const [groupPermissions, setGroupPermissions] = useState<WidgetPermission[]>([]);

    const [mode, setMode] = useState<PermissionMode>('user');
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [selectedWidgets, setSelectedWidgets] = useState<Set<string>>(new Set());
    const [accessLevel, setAccessLevel] = useState<AccessLevel>('view');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const widgetsByCategory = useMemo(() => getWidgetsByCategory(), []);
    const categories = useMemo(() => ['all', ...Object.keys(widgetsByCategory)], [widgetsByCategory]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersResponse, groupsData, permissionsData] = await Promise.all([
                authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/users`),
                adminService.getAllGroups(),
                adminService.getAllWidgetPermissions()
            ]);

            const usersData = await usersResponse.json();

            if (usersData.success) {
                setAllUsers(usersData.users);
            }

            setAllGroups(groupsData);
            setUserPermissions(permissionsData.user_permissions);
            setGroupPermissions(permissionsData.group_permissions);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load permissions data');
        } finally {
            setLoading(false);
        }
    };

    const filteredWidgets = useMemo(() => {
        let widgets = WIDGETS;

        if (categoryFilter !== 'all') {
            widgets = widgets.filter(w => w.category === categoryFilter);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            widgets = widgets.filter(
                w => w.title.toLowerCase().includes(query) ||
                    w.description?.toLowerCase().includes(query) ||
                    w.id.toLowerCase().includes(query)
            );
        }

        return widgets;
    }, [searchQuery, categoryFilter]);

    const selectedEntity = mode === 'user'
        ? allUsers.find(u => u.id === selectedUserId)
        : allGroups.find(g => g.id === selectedGroupId);

    const entityPermissions = mode === 'user'
        ? userPermissions.filter(p => p.user_id === selectedUserId)
        : groupPermissions.filter(p => p.group_id === selectedGroupId);

    const handleGrantPermissions = async () => {
        if (!selectedEntity || selectedWidgets.size === 0) {
            toast.error('Please select an entity and at least one widget');
            return;
        }

        try {
            const widgetIds = Array.from(selectedWidgets);

            if (mode === 'user' && selectedUserId) {
                for (const widgetId of widgetIds) {
                    await adminService.grantUserWidgetPermission(selectedUserId, widgetId, accessLevel);
                }
            } else if (mode === 'group' && selectedGroupId) {
                for (const widgetId of widgetIds) {
                    await adminService.grantGroupWidgetPermission(selectedGroupId, widgetId, accessLevel);
                }
            }

            toast.success(`Granted ${widgetIds.length} widget permission(s)`);
            setSelectedWidgets(new Set());
            await loadData();
            onPermissionsChanged();
        } catch (error: any) {
            toast.error(error.message || 'Failed to grant permissions');
        }
    };

    const handleRevokePermission = async (widgetId: string) => {
        if (!selectedEntity) return;

        try {
            if (mode === 'user' && selectedUserId) {
                await adminService.revokeUserWidgetPermission(selectedUserId, widgetId);
            } else if (mode === 'group' && selectedGroupId) {
                await adminService.revokeGroupWidgetPermission(selectedGroupId, widgetId);
            }

            toast.success('Permission revoked');
            await loadData();
            onPermissionsChanged();
        } catch (error: any) {
            toast.error(error.message || 'Failed to revoke permission');
        }
    };

    const handleToggleWidget = (widgetId: string) => {
        const newSelected = new Set(selectedWidgets);
        if (newSelected.has(widgetId)) {
            newSelected.delete(widgetId);
        } else {
            newSelected.add(widgetId);
        }
        setSelectedWidgets(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedWidgets.size === filteredWidgets.length) {
            setSelectedWidgets(new Set());
        } else {
            setSelectedWidgets(new Set(filteredWidgets.map(w => w.id)));
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="bg-ui-bg-secondary border-ui-border-primary w-full max-w-6xl max-h-[90vh] overflow-hidden">
                    <div className="flex items-center justify-center p-12">
                        <Loader />
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-ui-bg-secondary border-ui-border-primary w-full max-w-7xl max-h-[90vh] flex flex-col">
                <CardHeader className="border-b border-ui-border-primary flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-ui-text-primary text-2xl flex items-center">
                                <MdSecurity className="mr-2" />
                                Widget Permissions Manager
                            </CardTitle>
                            <CardDescription className="text-ui-text-secondary">
                                Assign widget access to users and groups
                            </CardDescription>
                        </div>
                        <Button
                            onClick={onClose}
                            variant="outline"
                            size="sm"
                            className="border-ui-border-primary hover:bg-ui-bg-tertiary"
                        >
                            <MdClose className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-6">
                    <div className="grid grid-cols-12 gap-6 h-full">
                        {/* Entity Selection */}
                        <div className="col-span-4 flex flex-col space-y-4">
                            {/* Mode Toggle */}
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => {
                                        setMode('user');
                                        setSelectedGroupId(null);
                                        setSelectedWidgets(new Set());
                                    }}
                                    variant={mode === 'user' ? 'default' : 'outline'}
                                    className={`flex-1 ${mode === 'user'
                                            ? 'bg-ui-accent-primary text-white'
                                            : 'border-ui-border-primary hover:bg-ui-bg-tertiary'
                                        }`}
                                >
                                    <MdPerson className="mr-2" />
                                    Users
                                </Button>
                                <Button
                                    onClick={() => {
                                        setMode('group');
                                        setSelectedUserId(null);
                                        setSelectedWidgets(new Set());
                                    }}
                                    variant={mode === 'group' ? 'default' : 'outline'}
                                    className={`flex-1 ${mode === 'group'
                                            ? 'bg-ui-accent-primary text-white'
                                            : 'border-ui-border-primary hover:bg-ui-bg-tertiary'
                                        }`}
                                >
                                    <MdGroup className="mr-2" />
                                    Groups
                                </Button>
                            </div>

                            {/* Entity List */}
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {mode === 'user' ? (
                                    allUsers.map(user => (
                                        <div
                                            key={user.id}
                                            onClick={() => {
                                                setSelectedUserId(user.id);
                                                setSelectedWidgets(new Set());
                                            }}
                                            className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedUserId === user.id
                                                    ? 'bg-ui-accent-primary/20 border-2 border-ui-accent-primary'
                                                    : 'bg-ui-bg-tertiary border-2 border-transparent hover:border-ui-border-primary'
                                                }`}
                                        >
                                            <p className="font-semibold text-ui-text-primary">{user.name}</p>
                                            <p className="text-sm text-ui-text-muted">{user.email}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-xs px-2 py-0.5 rounded bg-ui-accent-secondary-bg text-ui-accent-secondary-text">
                                                    {user.role}
                                                </span>
                                                <span className="text-xs text-ui-text-muted">
                                                    {userPermissions.filter(p => p.user_id === user.id).length} widgets
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    allGroups.map(group => (
                                        <div
                                            key={group.id}
                                            onClick={() => {
                                                setSelectedGroupId(group.id);
                                                setSelectedWidgets(new Set());
                                            }}
                                            className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedGroupId === group.id
                                                    ? 'bg-ui-accent-primary/20 border-2 border-ui-accent-primary'
                                                    : 'bg-ui-bg-tertiary border-2 border-transparent hover:border-ui-border-primary'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: group.color }}
                                                />
                                                <p className="font-semibold text-ui-text-primary">{group.name}</p>
                                            </div>
                                            {group.description && (
                                                <p className="text-sm text-ui-text-muted mt-1">{group.description}</p>
                                            )}
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-xs text-ui-text-muted">
                                                    {group.member_count} members
                                                </span>
                                                <span className="text-xs text-ui-text-muted">
                                                    {groupPermissions.filter(p => p.group_id === group.id).length} widgets
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Widget Selection & Permissions */}
                        <div className="col-span-8 flex flex-col space-y-4">
                            {selectedEntity ? (
                                <>
                                    {/* Header */}
                                    <div>
                                        <h3 className="text-xl font-bold text-ui-text-primary mb-1">
                                            {mode === 'user' ? (selectedEntity as User).name : (selectedEntity as UserGroup).name}
                                        </h3>
                                        <p className="text-sm text-ui-text-muted">
                                            {entityPermissions.length} widget permission(s)
                                        </p>
                                    </div>

                                    {/* Current Permissions */}
                                    {entityPermissions.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-ui-text-primary mb-2">Current Permissions</h4>
                                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                                {entityPermissions.map(perm => {
                                                    const widget = WIDGETS.find(w => w.id === perm.widget_id);
                                                    return (
                                                        <div
                                                            key={perm.id}
                                                            className="flex items-center justify-between p-2 bg-ui-bg-tertiary rounded"
                                                        >
                                                            <div className="flex items-center space-x-2 flex-1">
                                                                <span className="text-sm text-ui-text-primary">
                                                                    {widget?.title || perm.widget_id}
                                                                </span>
                                                                <span
                                                                    className={`text-xs px-2 py-0.5 rounded ${perm.access_level === 'admin'
                                                                            ? 'bg-purple-500/20 text-purple-300'
                                                                            : perm.access_level === 'edit'
                                                                                ? 'bg-yellow-500/20 text-yellow-300'
                                                                                : 'bg-blue-500/20 text-blue-300'
                                                                        }`}
                                                                >
                                                                    {perm.access_level}
                                                                </span>
                                                            </div>
                                                            <Button
                                                                onClick={() => handleRevokePermission(perm.widget_id)}
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-red-500 text-ui-danger-text hover:bg-red-500/20"
                                                            >
                                                                <MdDelete className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Grant New Permissions */}
                                    <div className="flex-1 flex flex-col">
                                        <h4 className="font-semibold text-ui-text-primary mb-3">Grant Widget Access</h4>

                                        {/* Access Level Selector */}
                                        <div className="mb-4">
                                            <Label className="text-ui-text-secondary text-sm mb-2">Access Level</Label>
                                            <div className="flex gap-2">
                                                {(['view', 'edit', 'admin'] as AccessLevel[]).map(level => (
                                                    <Button
                                                        key={level}
                                                        onClick={() => setAccessLevel(level)}
                                                        variant={accessLevel === level ? 'default' : 'outline'}
                                                        size="sm"
                                                        className={`flex-1 ${accessLevel === level
                                                                ? level === 'admin'
                                                                    ? 'bg-purple-500 hover:bg-purple-600'
                                                                    : level === 'edit'
                                                                        ? 'bg-yellow-500 hover:bg-yellow-600'
                                                                        : 'bg-blue-500 hover:bg-blue-600'
                                                                : 'border-ui-border-primary'
                                                            }`}
                                                    >
                                                        {level}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Search and Filters */}
                                        <div className="flex gap-2 mb-3">
                                            <div className="flex-1 relative">
                                                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-text-muted" />
                                                <Input
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search widgets..."
                                                    className="pl-10 bg-ui-bg-tertiary border-ui-border-primary text-ui-text-secondary"
                                                />
                                            </div>
                                            <select
                                                value={categoryFilter}
                                                onChange={(e) => setCategoryFilter(e.target.value)}
                                                className="px-3 py-2 bg-ui-bg-tertiary border border-ui-border-primary rounded text-ui-text-secondary text-sm"
                                            >
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>
                                                        {cat === 'all' ? 'All Categories' : cat}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Widget List */}
                                        <div className="flex-1 overflow-y-auto border border-ui-border-primary rounded-lg p-2 space-y-1">
                                            <div className="flex items-center justify-between p-2 bg-ui-bg-tertiary rounded sticky top-0">
                                                <Button
                                                    onClick={handleSelectAll}
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-ui-border-primary text-xs"
                                                >
                                                    {selectedWidgets.size === filteredWidgets.length ? 'Deselect All' : 'Select All'}
                                                </Button>
                                                <span className="text-xs text-ui-text-muted">
                                                    {selectedWidgets.size} selected
                                                </span>
                                            </div>

                                            {filteredWidgets.map(widget => (
                                                <div
                                                    key={widget.id}
                                                    onClick={() => handleToggleWidget(widget.id)}
                                                    className={`flex items-start space-x-3 p-3 rounded cursor-pointer transition-colors ${selectedWidgets.has(widget.id)
                                                            ? 'bg-ui-accent-primary/20'
                                                            : 'bg-ui-bg-tertiary hover:bg-slate-700'
                                                        }`}
                                                >
                                                    <Checkbox
                                                        checked={selectedWidgets.has(widget.id)}
                                                        onCheckedChange={() => handleToggleWidget(widget.id)}
                                                        className="mt-0.5"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-ui-text-primary text-sm">{widget.title}</p>
                                                        <p className="text-xs text-ui-text-muted line-clamp-1">
                                                            {widget.description || widget.id}
                                                        </p>
                                                        <span className="text-xs text-ui-text-muted">{widget.category}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 mt-4">
                                            <Button
                                                onClick={handleGrantPermissions}
                                                disabled={selectedWidgets.size === 0}
                                                className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50"
                                            >
                                                <MdCheckCircle className="mr-2" />
                                                Grant {selectedWidgets.size} Permission{selectedWidgets.size !== 1 ? 's' : ''}
                                            </Button>
                                            <Button
                                                onClick={() => setSelectedWidgets(new Set())}
                                                variant="outline"
                                                className="border-ui-border-primary"
                                            >
                                                <MdCancel className="mr-2" />
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-ui-text-muted">
                                    <p>Select a {mode} to manage widget permissions</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
