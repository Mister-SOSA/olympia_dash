'use client';

import { useState, useEffect } from 'react';
import { adminService } from '@/lib/admin';
import { authService, User } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <div className="grid grid-cols-12 gap-6">
      {/* Entity Selection - Left Side */}
      <div className="col-span-4">
        <Card className="bg-ui-bg-secondary border-ui-border-primary">
          <CardHeader>
            <CardTitle className="text-ui-text-primary">Select Target</CardTitle>
            <CardDescription className="text-ui-text-secondary">
              Choose a user or group to manage widget permissions
            </CardDescription>
            
            {/* Mode Toggle */}
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => {
                  setMode('user');
                  setSelectedGroupId(null);
                }}
                variant={mode === 'user' ? 'default' : 'outline'}
                className={`flex-1 ${mode === 'user'
                  ? 'bg-ui-accent-primary text-white'
                  : 'border-ui-border-primary'
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
                variant={mode === 'group' ? 'default' : 'outline'}
                className={`flex-1 ${mode === 'group'
                  ? 'bg-ui-accent-primary text-white'
                  : 'border-ui-border-primary'
                }`}
              >
                <MdGroup className="mr-2" />
                Groups
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {mode === 'user' ? (
                allUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedUserId === user.id
                        ? 'bg-ui-accent-primary/20 border-2 border-ui-accent-primary'
                        : 'bg-ui-bg-tertiary border-2 border-transparent hover:border-ui-border-primary'
                    }`}
                  >
                    <p className="font-semibold text-ui-text-primary">{user.name}</p>
                    <p className="text-sm text-ui-text-muted">{user.email}</p>
                    <span className="text-xs px-2 py-0.5 rounded bg-ui-accent-secondary-bg text-ui-accent-secondary-text mt-1 inline-block">
                      {user.role}
                    </span>
                  </div>
                ))
              ) : (
                allGroups.map(group => (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedGroupId === group.id
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
                    <p className="text-sm text-ui-text-muted mt-1">{group.description}</p>
                  </div>
                ))
              )}

              {listItems.length === 0 && (
                <div className="text-center py-8 text-ui-text-muted">
                  <MdPerson className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">No {mode === 'user' ? 'users' : 'groups'} found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Widget Permissions - Right Side */}
      <div className="col-span-8">
        <Card className="bg-ui-bg-secondary border-ui-border-primary">
          <CardHeader>
            {selectedEntity ? (
              <div>
                <CardTitle className="text-ui-text-primary text-xl flex items-center">
                  <MdSecurity className="mr-2" />
                  Widget Permissions for{' '}
                  {mode === 'user' ? (selectedEntity as User).name : (selectedEntity as UserGroup).name}
                </CardTitle>
                <CardDescription className="text-ui-text-secondary">
                  Set individual widget access levels
                </CardDescription>

                {/* Filters */}
                <div className="flex gap-4 mt-4">
                  <div className="flex-1 relative">
                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-text-muted" />
                    <Input
                      placeholder="Search widgets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-ui-bg-tertiary border-ui-border-primary"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2 bg-ui-bg-tertiary border border-ui-border-primary rounded text-ui-text-secondary"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat === 'all' ? 'All Categories' : cat}
                      </option>
                    ))}
                  </select>
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

          <CardContent>
            {selectedEntity ? (
              <div className="space-y-2">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-ui-border-primary bg-ui-bg-secondary">
                  <div className="col-span-6 text-sm font-semibold text-ui-text-secondary">
                    Widget
                  </div>
                  <div className="col-span-2 text-sm font-semibold text-ui-text-secondary">
                    Category
                  </div>
                  <div className="col-span-4 text-sm font-semibold text-ui-text-secondary text-center">
                    Access Level
                  </div>
                </div>

                {/* Permission Rows */}
                <div className="space-y-2">
                  {filteredRows.map(row => (
                    <div
                      key={row.widgetId}
                      className="grid grid-cols-12 gap-4 items-center p-3 bg-ui-bg-tertiary rounded-lg hover:bg-ui-bg-tertiary/80 transition-colors"
                    >
                      <div className="col-span-6">
                        <p className="font-medium text-ui-text-primary">{row.widgetTitle}</p>
                        <p className="text-xs text-ui-text-muted">{row.widgetId}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs px-2 py-1 rounded bg-ui-bg-secondary text-ui-text-muted">
                          {row.widgetCategory}
                        </span>
                      </div>
                      <div className="col-span-4">
                        <div className="flex gap-1">
                          {(['none', 'view', 'edit', 'admin'] as AccessLevel[]).map(level => (
                            <Button
                              key={level}
                              onClick={() => handlePermissionChange(row.widgetId, level)}
                              disabled={saving === row.widgetId}
                              size="sm"
                              className={`flex-1 text-xs ${
                                row.currentLevel === level
                                  ? level === 'none'
                                    ? 'bg-gray-500 hover:bg-gray-600'
                                    : level === 'view'
                                    ? 'bg-blue-500 hover:bg-blue-600'
                                    : level === 'edit'
                                    ? 'bg-orange-500 hover:bg-orange-600'
                                    : 'bg-purple-500 hover:bg-purple-600'
                                  : 'bg-ui-bg-secondary hover:bg-ui-bg-tertiary border border-ui-border-primary'
                              }`}
                            >
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </Button>
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

                {/* Summary */}
                <div className="mt-4 pt-4 border-t border-ui-border-primary bg-ui-bg-secondary">
                  <p className="text-sm text-ui-text-secondary">
                    {widgetRows.filter(r => r.currentLevel !== 'none').length} of {widgetRows.length} widgets have permissions assigned
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-ui-text-muted">
                <MdSecurity className="mx-auto h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg">No {mode} selected</p>
                <p className="text-sm mt-2">Select a {mode} from the list to manage widget permissions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
