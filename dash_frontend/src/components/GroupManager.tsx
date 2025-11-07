'use client';

import { useState, useEffect } from 'react';
import { adminService } from '@/lib/admin';
import { authService, User } from '@/lib/auth';
import { API_BASE_URL } from '@/config';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';
import {
    MdClose, MdAdd, MdDelete, MdPeople, MdEdit, MdSave, MdCancel,
    MdCheckCircle, MdRemoveCircle
} from 'react-icons/md';
import type { UserGroup, GroupMember } from '@/types';

interface GroupManagerProps {
    onClose: () => void;
    onGroupsChanged: () => void;
}

export function GroupManager({ onClose, onGroupsChanged }: GroupManagerProps) {
    const [groups, setGroups] = useState<UserGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form states
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [newGroupColor, setNewGroupColor] = useState('#3b82f6');

    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editColor, setEditColor] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedGroup) {
            loadGroupDetails();
        }
    }, [selectedGroup?.id]);

    const loadData = async () => {
        try {
            const [groupsData, usersResponse] = await Promise.all([
                adminService.getAllGroups(),
                authService.fetchWithAuth(`${API_BASE_URL}/api/auth/admin/users`)
            ]);

            const usersData = await usersResponse.json();

            setGroups(groupsData);
            if (usersData.success) {
                setAllUsers(usersData.users);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load groups and users');
        } finally {
            setLoading(false);
        }
    };

    const loadGroupDetails = async () => {
        if (!selectedGroup) return;

        try {
            const details = await adminService.getGroup(selectedGroup.id);
            setSelectedGroup(details);
        } catch (error) {
            console.error('Failed to load group details:', error);
            toast.error('Failed to load group details');
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            toast.error('Group name is required');
            return;
        }

        try {
            await adminService.createGroup(newGroupName, newGroupDescription, newGroupColor);
            toast.success('Group created successfully');

            setNewGroupName('');
            setNewGroupDescription('');
            setNewGroupColor('#3b82f6');
            setIsCreating(false);

            await loadData();
            onGroupsChanged();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create group');
        }
    };

    const handleUpdateGroup = async () => {
        if (!selectedGroup) return;

        try {
            await adminService.updateGroup(selectedGroup.id, {
                name: editName,
                description: editDescription,
                color: editColor
            });

            toast.success('Group updated successfully');
            setIsEditing(false);

            await loadData();
            const updatedGroup = await adminService.getGroup(selectedGroup.id);
            setSelectedGroup(updatedGroup);
            onGroupsChanged();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update group');
        }
    };

    const handleDeleteGroup = async (groupId: number) => {
        if (!confirm('Are you sure you want to delete this group? This will remove all members and permissions.')) {
            return;
        }

        try {
            await adminService.deleteGroup(groupId);
            toast.success('Group deleted successfully');

            if (selectedGroup?.id === groupId) {
                setSelectedGroup(null);
            }

            await loadData();
            onGroupsChanged();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete group');
        }
    };

    const handleAddMember = async (userId: number) => {
        if (!selectedGroup) return;

        try {
            await adminService.addUserToGroup(selectedGroup.id, userId);
            toast.success('User added to group');
            await loadGroupDetails();
            onGroupsChanged();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add user to group');
        }
    };

    const handleRemoveMember = async (userId: number) => {
        if (!selectedGroup) return;

        try {
            await adminService.removeUserFromGroup(selectedGroup.id, userId);
            toast.success('User removed from group');
            await loadGroupDetails();
            onGroupsChanged();
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove user from group');
        }
    };

    const startEditing = (group: UserGroup) => {
        setEditName(group.name);
        setEditDescription(group.description || '');
        setEditColor(group.color);
        setIsEditing(true);
    };

    const availableUsers = allUsers.filter(
        user => !selectedGroup?.members?.some(member => member.id === user.id)
    );

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
            <Card className="bg-ui-bg-secondary border-ui-border-primary w-full max-w-6xl max-h-[90vh] flex flex-col">
                <CardHeader className="border-b border-ui-border-primary flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-ui-text-primary text-2xl flex items-center">
                                <MdPeople className="mr-2" />
                                User Groups Manager
                            </CardTitle>
                            <CardDescription className="text-ui-text-secondary">
                                Create and manage user groups for organizing permissions
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
                        {/* Groups List */}
                        <div className="col-span-4 flex flex-col space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-ui-text-primary">Groups</h3>
                                <Button
                                    onClick={() => setIsCreating(true)}
                                    size="sm"
                                    className="bg-ui-accent-primary text-white hover:bg-ui-accent-primary/80"
                                >
                                    <MdAdd className="mr-1" /> New
                                </Button>
                            </div>

                            {/* Create Group Form */}
                            {isCreating && (
                                <Card className="bg-ui-bg-tertiary border-ui-border-primary p-4">
                                    <div className="space-y-3">
                                        <div>
                                            <Label className="text-ui-text-secondary text-sm">Name</Label>
                                            <Input
                                                value={newGroupName}
                                                onChange={(e) => setNewGroupName(e.target.value)}
                                                placeholder="Engineering, Sales, etc."
                                                className="bg-ui-bg-secondary border-ui-border-primary text-ui-text-secondary"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-ui-text-secondary text-sm">Description</Label>
                                            <Input
                                                value={newGroupDescription}
                                                onChange={(e) => setNewGroupDescription(e.target.value)}
                                                placeholder="Optional description"
                                                className="bg-ui-bg-secondary border-ui-border-primary text-ui-text-secondary"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-ui-text-secondary text-sm">Color</Label>
                                            <Input
                                                type="color"
                                                value={newGroupColor}
                                                onChange={(e) => setNewGroupColor(e.target.value)}
                                                className="bg-ui-bg-secondary border-ui-border-primary h-10"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleCreateGroup}
                                                size="sm"
                                                className="flex-1 bg-green-500 hover:bg-green-600"
                                            >
                                                <MdSave className="mr-1" /> Create
                                            </Button>
                                            <Button
                                                onClick={() => setIsCreating(false)}
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 border-ui-border-primary"
                                            >
                                                <MdCancel className="mr-1" /> Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* Groups List */}
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {groups.map(group => (
                                    <div
                                        key={group.id}
                                        onClick={() => setSelectedGroup(group)}
                                        className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedGroup?.id === group.id
                                                ? 'bg-ui-accent-primary/20 border-2 border-ui-accent-primary'
                                                : 'bg-ui-bg-tertiary border-2 border-transparent hover:border-ui-border-primary'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center space-x-3 flex-1">
                                                <div
                                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: group.color }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-ui-text-primary truncate">{group.name}</h4>
                                                    {group.description && (
                                                        <p className="text-sm text-ui-text-muted truncate">{group.description}</p>
                                                    )}
                                                    <div className="flex gap-3 mt-1 text-xs text-ui-text-muted">
                                                        <span>{group.member_count || 0} members</span>
                                                        <span>{group.widget_count || 0} widgets</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Group Details */}
                        <div className="col-span-8 flex flex-col space-y-4">
                            {selectedGroup ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className="w-6 h-6 rounded-full"
                                                style={{ backgroundColor: selectedGroup.color }}
                                            />
                                            <h3 className="text-xl font-bold text-ui-text-primary">{selectedGroup.name}</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            {!isEditing ? (
                                                <>
                                                    <Button
                                                        onClick={() => startEditing(selectedGroup)}
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-ui-border-primary hover:bg-ui-bg-tertiary"
                                                    >
                                                        <MdEdit className="mr-1" /> Edit
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleDeleteGroup(selectedGroup.id)}
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-red-500 text-ui-danger-text hover:bg-red-500/20"
                                                    >
                                                        <MdDelete className="mr-1" /> Delete
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        onClick={handleUpdateGroup}
                                                        size="sm"
                                                        className="bg-green-500 hover:bg-green-600"
                                                    >
                                                        <MdSave className="mr-1" /> Save
                                                    </Button>
                                                    <Button
                                                        onClick={() => setIsEditing(false)}
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-ui-border-primary"
                                                    >
                                                        <MdCancel className="mr-1" /> Cancel
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {isEditing && (
                                        <Card className="bg-ui-bg-tertiary border-ui-border-primary p-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-ui-text-secondary text-sm">Name</Label>
                                                    <Input
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="bg-ui-bg-secondary border-ui-border-primary text-ui-text-secondary"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-ui-text-secondary text-sm">Color</Label>
                                                    <Input
                                                        type="color"
                                                        value={editColor}
                                                        onChange={(e) => setEditColor(e.target.value)}
                                                        className="bg-ui-bg-secondary border-ui-border-primary h-10"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Label className="text-ui-text-secondary text-sm">Description</Label>
                                                    <Input
                                                        value={editDescription}
                                                        onChange={(e) => setEditDescription(e.target.value)}
                                                        className="bg-ui-bg-secondary border-ui-border-primary text-ui-text-secondary"
                                                    />
                                                </div>
                                            </div>
                                        </Card>
                                    )}

                                    <div className="flex-1 overflow-y-auto space-y-4">
                                        {/* Current Members */}
                                        <div>
                                            <h4 className="font-semibold text-ui-text-primary mb-3">
                                                Members ({selectedGroup.members?.length || 0})
                                            </h4>
                                            <div className="space-y-2">
                                                {selectedGroup.members && selectedGroup.members.length > 0 ? (
                                                    selectedGroup.members.map(member => (
                                                        <div
                                                            key={member.id}
                                                            className="flex items-center justify-between p-3 bg-ui-bg-tertiary rounded-lg"
                                                        >
                                                            <div>
                                                                <p className="font-medium text-ui-text-primary">{member.name}</p>
                                                                <p className="text-sm text-ui-text-muted">{member.email}</p>
                                                            </div>
                                                            <Button
                                                                onClick={() => handleRemoveMember(member.id)}
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-red-500 text-ui-danger-text hover:bg-red-500/20"
                                                            >
                                                                <MdRemoveCircle className="mr-1" /> Remove
                                                            </Button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-ui-text-muted text-center py-4">No members in this group</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Available Users */}
                                        {availableUsers.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-ui-text-primary mb-3">
                                                    Add Members ({availableUsers.length} available)
                                                </h4>
                                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                                    {availableUsers.map(user => (
                                                        <div
                                                            key={user.id}
                                                            className="flex items-center justify-between p-3 bg-ui-bg-tertiary rounded-lg"
                                                        >
                                                            <div>
                                                                <p className="font-medium text-ui-text-primary">{user.name}</p>
                                                                <p className="text-sm text-ui-text-muted">{user.email}</p>
                                                            </div>
                                                            <Button
                                                                onClick={() => handleAddMember(user.id)}
                                                                size="sm"
                                                                className="bg-ui-accent-primary hover:bg-ui-accent-primary/80"
                                                            >
                                                                <MdCheckCircle className="mr-1" /> Add
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-ui-text-muted">
                                    <p>Select a group to view details</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
