import { API_BASE_URL } from '@/config';
import { authService, User } from './auth';
import type { UserGroup, WidgetPermission, BulkPermissionRequest, WidgetAccessControl } from '@/types';

/**
 * Admin service for managing user groups and widget permissions
 */
class AdminService {
    // ============ User Groups ============

    async getAllGroups(): Promise<UserGroup[]> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/groups`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch groups');
        }

        return data.groups;
    }

    async getGroup(groupId: number): Promise<UserGroup> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/groups/${groupId}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch group');
        }

        return data.group;
    }

    async createGroup(name: string, description?: string, color?: string): Promise<number> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/groups`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, description, color }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to create group');
        }

        return data.group_id;
    }

    async updateGroup(groupId: number, updates: Partial<Pick<UserGroup, 'name' | 'description' | 'color'>>): Promise<void> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/groups/${groupId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to update group');
        }
    }

    async deleteGroup(groupId: number): Promise<void> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/groups/${groupId}`, {
            method: 'DELETE',
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to delete group');
        }
    }

    async addUserToGroup(groupId: number, userId: number): Promise<void> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/groups/${groupId}/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: userId }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to add user to group');
        }
    }

    async removeUserFromGroup(groupId: number, userId: number): Promise<void> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/groups/${groupId}/members/${userId}`, {
            method: 'DELETE',
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to remove user from group');
        }
    }

    async bulkAddUsersToGroup(groupId: number, userIds: number[]): Promise<number> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/groups/${groupId}/members/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_ids: userIds }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to add users to group');
        }

        return data.added_count;
    }

    async getUserGroups(userId: number): Promise<UserGroup[]> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/groups/user/${userId}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch user groups');
        }

        return data.groups;
    }

    async getGroupMembers(groupId: number): Promise<User[]> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/groups/${groupId}/members`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch group members');
        }

        return data.members;
    }

    async addGroupMember(groupId: number, userId: number): Promise<void> {
        return this.addUserToGroup(groupId, userId);
    }

    async removeGroupMember(groupId: number, userId: number): Promise<void> {
        return this.removeUserFromGroup(groupId, userId);
    }

    // ============ Widget Permissions ============

    async getAllWidgetPermissions(): Promise<{ user_permissions: WidgetPermission[]; group_permissions: WidgetPermission[] }> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/widgets/permissions`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch widget permissions');
        }

        return {
            user_permissions: data.user_permissions,
            group_permissions: data.group_permissions,
        };
    }

    async getUserWidgetPermissions(userId: number): Promise<Record<string, 'view' | 'edit' | 'admin'>> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/widgets/permissions/user/${userId}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch user widget permissions');
        }

        return data.permissions;
    }

    async grantUserWidgetPermission(
        userId: number,
        widgetId: string,
        accessLevel: 'view' | 'edit' | 'admin' = 'view',
        expiresAt?: string
    ): Promise<void> {
        const response = await authService.fetchWithAuth(
            `${API_BASE_URL}/api/auth/widgets/permissions/user/${userId}/widget/${widgetId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ access_level: accessLevel, expires_at: expiresAt }),
            }
        );

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to grant widget permission');
        }
    }

    async revokeUserWidgetPermission(userId: number, widgetId: string): Promise<void> {
        const response = await authService.fetchWithAuth(
            `${API_BASE_URL}/api/auth/widgets/permissions/user/${userId}/widget/${widgetId}`,
            {
                method: 'DELETE',
            }
        );

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to revoke widget permission');
        }
    }

    async grantGroupWidgetPermission(
        groupId: number,
        widgetId: string,
        accessLevel: 'view' | 'edit' | 'admin' = 'view',
        expiresAt?: string
    ): Promise<void> {
        const response = await authService.fetchWithAuth(
            `${API_BASE_URL}/api/auth/widgets/permissions/group/${groupId}/widget/${widgetId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ access_level: accessLevel, expires_at: expiresAt }),
            }
        );

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to grant group widget permission');
        }
    }

    async revokeGroupWidgetPermission(groupId: number, widgetId: string): Promise<void> {
        const response = await authService.fetchWithAuth(
            `${API_BASE_URL}/api/auth/widgets/permissions/group/${groupId}/widget/${widgetId}`,
            {
                method: 'DELETE',
            }
        );

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to revoke group widget permission');
        }
    }

    async checkWidgetAccess(widgetId: string, requiredLevel: 'view' | 'edit' | 'admin' = 'view'): Promise<boolean> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/widgets/permissions/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ widget_id: widgetId, required_level: requiredLevel }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to check widget access');
        }

        return data.has_access;
    }

    async bulkGrantWidgetPermissions(request: BulkPermissionRequest): Promise<number> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/widgets/permissions/bulk/grant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to bulk grant permissions');
        }

        return data.count;
    }

    async bulkRevokeWidgetPermissions(userIds: number[], widgetIds: string[]): Promise<number> {
        const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/auth/widgets/permissions/bulk/revoke`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_ids: userIds, widget_ids: widgetIds }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to bulk revoke permissions');
        }

        return data.count;
    }

    async getAvailableWidgets(): Promise<WidgetAccessControl> {
        // Support impersonation - if admin is impersonating, get permissions for that user
        let url = `${API_BASE_URL}/api/auth/widgets/available`;
        const impersonatedUser = authService.getImpersonatedUser();
        if (impersonatedUser?.id) {
            url += `?impersonated_user_id=${impersonatedUser.id}`;
        }

        const response = await authService.fetchWithAuth(url);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch available widgets');
        }

        return {
            permissions: data.permissions,
            all_access: data.all_access,
        };
    }
}

export const adminService = new AdminService();
