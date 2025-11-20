'use client';

import { useState, useEffect } from 'react';
import { adminService } from '@/lib/admin';
import { authService, User } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';
import { MdPerson, MdGroup, MdSearch, MdSecurity } from 'react-icons/md';
import { WIDGETS } from '@/constants/widgets';
import type { UserGroup, WidgetPermission } from '@/types';

type AccessLevel = 'none' | 'view' | 'edit' | 'admin';
type TargetMode = 'user' | 'group';

interface WidgetPermissionRow {
  widgetId: string;
  widgetTitle: string;
  widgetCategory: string;
  currentLevel: AccessLevel;
}

export function PermissionsPanel() {
  const [mode, setMode] = useState<TargetMode>('user');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allGroups, setAllGroups] = useState<UserGroup[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const [userPermissions, setUserPermissions] = useState<WidgetPermission[]>([]);
  const [groupPermissions, setGroupPermissions] = useState<WidgetPermission[]>([]);
  const [widgetRows, setWidgetRows] = useState<WidgetPermissionRow[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const categories = ['all', ...Array.from(new Set(WIDGETS.map(w => w.category)))];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (mode === 'user' && selectedUserId) {
      buildWidgetRows('user', selectedUserId);
    } else if (mode === 'group' && selectedGroupId) {
      buildWidgetRows('group', selectedGroupId);
    } else {
      setWidgetRows([]);
    }
  }, [mode, selectedUserId, selectedGroupId, userPermissions, groupPermissions]);

  const loadData = async () => {
    try {
      const [usersResponse, groupsData, permissionsData] = await Promise.all([
        authService.fetchWithAuth('/api/auth/admin/users'),
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
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const buildWidgetRows = (targetMode: TargetMode, targetId: number) => {
    const permissions = targetMode === 'user'
      ? userPermissions.filter(p => p.user_id === targetId)
      : groupPermissions.filter(p => p.group_id === targetId);

    const rows: WidgetPermissionRow[] = WIDGETS.map(widget => {
      const permission = permissions.find(p => p.widget_id === widget.id);
      return {
        widgetId: widget.id,
        widgetTitle: widget.title,
        widgetCategory: widget.category,
        currentLevel: (permission?.access_level as AccessLevel) || 'none'
      };
    });

    setWidgetRows(rows);
  };

  const handlePermissionChange = async (widgetId: string, newLevel: AccessLevel) => {
    const targetId = mode === 'user' ? selectedUserId : selectedGroupId;
    if (!targetId) return;

    setSaving(widgetId);

    try {
      if (newLevel === 'none') {
        // Revoke permission
        if (mode === 'user') {
          await adminService.revokeUserWidgetPermission(targetId, widgetId);
        } else {
          await adminService.revokeGroupWidgetPermission(targetId, widgetId);
        }
        toast.success('Permission removed');
      } else {
        // Grant permission
        if (mode === 'user') {
          await adminService.grantUserWidgetPermission(targetId, widgetId, newLevel);
        } else {
          await adminService.grantGroupWidgetPermission(targetId, widgetId, newLevel);
        }
        toast.success(`Permission set to ${newLevel}`);
      }

      // Reload permissions
      const permissionsData = await adminService.getAllWidgetPermissions();
      setUserPermissions(permissionsData.user_permissions);
      setGroupPermissions(permissionsData.group_permissions);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update permission');
    } finally {
      setSaving(null);
    }
  };

  const filteredRows = widgetRows.filter(row => {
    const matchesCategory = categoryFilter === 'all' || row.widgetCategory === categoryFilter;
    const matchesSearch = searchQuery === '' ||
      row.widgetTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.widgetId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedEntity = mode === 'user'
    ? allUsers.find(u => u.id === selectedUserId)
    : allGroups.find(g => g.id === selectedGroupId);

  const listItems = mode === 'user' ? allUsers : allGroups;

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
      {/* Entity Selection - Left Side */}
      <div className="col-span-4 flex flex-col h-full">
        <Card className="bg-ui-bg-secondary border-ui-border-primary flex flex-col h-full shadow-sm">
          <CardHeader className="border-b border-ui-border-primary pb-4 flex-shrink-0">
            <CardTitle className="text-ui-text-primary text-lg">Select Target</CardTitle>
            <CardDescription className="text-ui-text-secondary text-xs">
              Choose a user or group to manage widget permissions
            </CardDescription>

            {/* Mode Toggle */}
            <div className="flex gap-2 mt-4 p-1 bg-ui-bg-tertiary rounded-lg border border-ui-border-primary">
              <Button
                onClick={() => {
                  setMode('user');
                  setSelectedGroupId(null);
                }}
                variant="ghost"
                size="sm"
                className={`flex-1 rounded-md transition-all ${mode === 'user'
                  ? 'bg-ui-bg-secondary text-ui-text-primary shadow-sm'
                  : 'text-ui-text-secondary hover:text-ui-text-primary'
                  }`}
              >
                <MdPerson className="mr-2" />
                Users
              </Button>
              <Button
                onClick={() => {
                  setMode('group');
                  setSelectedUserId(null);
                }}
                variant="ghost"
                size="sm"
                className={`flex-1 rounded-md transition-all ${mode === 'group'
                  ? 'bg-ui-bg-secondary text-ui-text-primary shadow-sm'
                  : 'text-ui-text-secondary hover:text-ui-text-primary'
                  }`}
              >
                <MdGroup className="mr-2" />
                Groups
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="h-full overflow-y-auto p-4 space-y-2">
              {mode === 'user' ? (
                allUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedUserId === user.id
                        ? 'bg-ui-accent-primary/10 border-ui-accent-primary shadow-sm'
                        : 'bg-ui-bg-tertiary border-transparent hover:border-ui-border-primary hover:bg-ui-bg-quaternary'
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`font-medium ${selectedUserId === user.id ? 'text-ui-accent-primary' : 'text-ui-text-primary'}`}>
                          {user.name}
                        </p>
                        <p className="text-xs text-ui-text-muted">{user.email}</p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-ui-bg-secondary text-ui-text-secondary border border-ui-border-primary uppercase tracking-wider font-medium">
                        {user.role}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                allGroups.map(group => (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedGroupId === group.id
                        ? 'bg-ui-accent-primary/10 border-ui-accent-primary shadow-sm'
                        : 'bg-ui-bg-tertiary border-transparent hover:border-ui-border-primary hover:bg-ui-bg-quaternary'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-ui-bg-tertiary"
                        style={{ backgroundColor: group.color }}
                      />
                      <div>
                        <p className={`font-medium ${selectedGroupId === group.id ? 'text-ui-accent-primary' : 'text-ui-text-primary'}`}>
                          {group.name}
                        </p>
                        <p className="text-xs text-ui-text-muted mt-0.5">{group.description}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {listItems.length === 0 && (
                <div className="text-center py-12 text-ui-text-muted flex flex-col items-center justify-center h-full">
                  <div className="p-4 bg-ui-bg-tertiary rounded-full mb-3">
                    <MdPerson className="h-8 w-8 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">No {mode === 'user' ? 'users' : 'groups'} found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Widget Permissions - Right Side */}
      <div className="col-span-8 flex flex-col h-full">
        <Card className="bg-ui-bg-secondary border-ui-border-primary flex flex-col h-full shadow-sm">
          <CardHeader className="border-b border-ui-border-primary pb-4 flex-shrink-0">
            {selectedEntity ? (
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <CardTitle className="text-ui-text-primary text-xl flex items-center">
                      <MdSecurity className="mr-2 text-ui-accent-primary" />
                      Permissions: {mode === 'user' ? (selectedEntity as User).name : (selectedEntity as UserGroup).name}
                    </CardTitle>
                    <CardDescription className="text-ui-text-secondary mt-1">
                      Manage access levels for individual widgets
                    </CardDescription>
                  </div>
                  <div className="text-xs text-ui-text-muted bg-ui-bg-tertiary px-3 py-1 rounded-full border border-ui-border-primary">
                    {widgetRows.filter(r => r.currentLevel !== 'none').length} active permissions
                  </div>
                </div>

                {/* Filters */}
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-text-muted" />
                    <Input
                      placeholder="Search widgets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-ui-bg-tertiary border-ui-border-primary focus:ring-ui-accent-primary h-9 text-sm"
                    />
                  </div>
                  <div className="w-48">
                    <Select
                      value={categoryFilter}
                      onChange={(val) => setCategoryFilter(val)}
                      options={categories.map(cat => ({
                        value: cat,
                        label: cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)
                      }))}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <CardTitle className="text-ui-text-primary">Widget Permissions</CardTitle>
                <CardDescription className="text-ui-text-secondary">
                  Select a user or group to manage their widget permissions
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0 bg-ui-bg-tertiary/5">
            {selectedEntity ? (
              <div className="flex flex-col h-full">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-ui-border-primary bg-ui-bg-tertiary/50 text-xs font-semibold text-ui-text-secondary uppercase tracking-wider">
                  <div className="col-span-5">Widget</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-5 text-center">Access Level</div>
                </div>

                {/* Permission Rows */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {filteredRows.map(row => (
                    <div
                      key={row.widgetId}
                      className="grid grid-cols-12 gap-4 items-center p-4 bg-ui-bg-secondary rounded-lg border border-ui-border-primary hover:border-ui-accent-primary/30 transition-all shadow-sm"
                    >
                      <div className="col-span-5">
                        <p className="font-medium text-ui-text-primary text-sm">{row.widgetTitle}</p>
                        <p className="text-xs text-ui-text-muted font-mono mt-0.5">{row.widgetId}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] px-2 py-1 rounded-full bg-ui-bg-tertiary text-ui-text-secondary border border-ui-border-primary uppercase tracking-wider">
                          {row.widgetCategory}
                        </span>
                      </div>
                      <div className="col-span-5">
                        <div className="flex bg-ui-bg-tertiary rounded-md p-1 border border-ui-border-primary">
                          {(['none', 'view', 'edit', 'admin'] as AccessLevel[]).map(level => (
                            <button
                              key={level}
                              onClick={() => handlePermissionChange(row.widgetId, level)}
                              disabled={saving === row.widgetId}
                              className={`flex-1 text-[10px] font-medium py-1.5 rounded transition-all uppercase tracking-wide ${row.currentLevel === level
                                  ? level === 'none'
                                    ? 'bg-ui-text-muted text-white shadow-sm'
                                    : level === 'view'
                                      ? 'bg-ui-accent-primary text-white shadow-sm'
                                      : level === 'edit'
                                        ? 'bg-ui-warning-text text-white shadow-sm'
                                        : 'bg-ui-accent-secondary-text text-white shadow-sm'
                                  : 'text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-secondary'
                                }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredRows.length === 0 && (
                    <div className="text-center py-12 text-ui-text-muted">
                      <p>No widgets match your search</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-24 text-ui-text-muted flex flex-col items-center justify-center h-full">
                <div className="p-6 bg-ui-bg-tertiary rounded-full mb-4">
                  <MdSecurity className="h-12 w-12 opacity-30" />
                </div>
                <p className="text-lg font-medium text-ui-text-secondary">No target selected</p>
                <p className="text-sm mt-2 max-w-xs mx-auto">Select a user or group from the list on the left to view and manage widget permissions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
