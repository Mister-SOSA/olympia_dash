'use client';

import { useState, useEffect } from 'react';
import { adminService } from '@/lib/admin';
import { authService, User } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MdGroup, MdPeople, MdAdd, MdEdit, MdDelete, MdSave, MdCancel, MdRemoveCircle, MdCheckCircle } from 'react-icons/md';
import type { UserGroup } from '@/types';

interface GroupWithMembers extends UserGroup {
    member_count: number;
}

export function GroupsPanel() {
    const [groups, setGroups] = useState<GroupWithMembers[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
    const [groupMembers, setGroupMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Create/Edit State
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formColor, setFormColor] = useState('#3b82f6');

    // Search
    const [memberSearch, setMemberSearch] = useState('');

    useEffect(() => {
        loadGroups();
        loadUsers();
    }, []);

    useEffect(() => {
        if (selectedGroup) {
            loadGroupMembers(selectedGroup.id);
        }
    }, [selectedGroup]);

    const loadGroups = async () => {
        try {
            const data = await adminService.getAllGroups();
            setGroups(data);
        } catch (error) {
            toast.error('Failed to load groups');
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const response = await authService.fetchWithAuth('/api/auth/admin/users');
            const data = await response.json();
            if (data.success) {
                setAllUsers(data.users);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    const loadGroupMembers = async (groupId: number) => {
        try {
            const members = await adminService.getGroupMembers(groupId);
            setGroupMembers(members);
        } catch (error) {
            console.error('Failed to load group members:', error);
        }
    };

    const handleCreateGroup = async () => {
        if (!formName.trim()) {
            toast.error('Group name is required');
            return;
        }

        try {
            const newGroup = await adminService.createGroup({
                name: formName,
                description: formDescription,
                color: formColor
            });

            toast.success('Group created successfully');
            setIsCreating(false);
            resetForm();
            await loadGroups();
            setSelectedGroup(newGroup as GroupWithMembers);
        } catch (error: any) {
            toast.error(error.message || 'Failed to create group');
        }
    };

    const handleUpdateGroup = async () => {
        if (!selectedGroup) return;

        try {
            await adminService.updateGroup(selectedGroup.id, {
                name: formName,
                description: formDescription,
                color: formColor
            });

            toast.success('Group updated successfully');
            setIsEditing(false);
            await loadGroups();

            const updated = await adminService.getGroup(selectedGroup.id);
            setSelectedGroup(updated as GroupWithMembers);
        } catch (error: any) {
            toast.error(error.message || 'Failed to update group');
        }
    };

    const handleDeleteGroup = async (groupId: number) => {
        if (!confirm('Delete this group? All members and permissions will be removed.')) return;

        try {
            await adminService.deleteGroup(groupId);
            toast.success('Group deleted');

            if (selectedGroup?.id === groupId) {
                setSelectedGroup(null);
            }

            await loadGroups();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete group');
        }
    };

    const handleAddMember = async (userId: number) => {
        if (!selectedGroup) return;

        try {
            await adminService.addGroupMember(selectedGroup.id, userId);
            toast.success('Member added');
            await loadGroupMembers(selectedGroup.id);
            await loadGroups();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add member');
        }
    };

    const handleRemoveMember = async (userId: number) => {
        if (!selectedGroup) return;

        try {
            await adminService.removeGroupMember(selectedGroup.id, userId);
            toast.success('Member removed');
            await loadGroupMembers(selectedGroup.id);
            await loadGroups();
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove member');
        }
    };

    const resetForm = () => {
        setFormName('');
        setFormDescription('');
        setFormColor('#3b82f6');
    };

    const startEdit = () => {
        if (selectedGroup) {
            setFormName(selectedGroup.name);
            setFormDescription(selectedGroup.description || '');
            setFormColor(selectedGroup.color);
            setIsEditing(true);
        }
    };

    const availableUsers = allUsers.filter(
        user => !groupMembers.some(m => m.id === user.id)
    ).filter(user =>
        user.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        user.email.toLowerCase().includes(memberSearch.toLowerCase())
    );

    return (
        <div className="grid grid-cols-12 gap-6">
            {/* Groups List - Left Side */}
            <div className="col-span-4">
                <Card className="bg-ui-bg-secondary border-ui-border-primary">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-ui-text-primary">Groups</CardTitle>
                            <Button
                                onClick={() => {
                                    setIsCreating(true);
                                    setSelectedGroup(null);
                                    resetForm();
                                }}
                                size="sm"
                                className="bg-ui-accent-primary hover:bg-ui-accent-primary/80"
                            >
                                <MdAdd className="mr-1" /> New
                            </Button>
                        </div>
                        <CardDescription className="text-ui-text-secondary">
                            {groups.length} group(s) total
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {/* Create Form */}
                            {isCreating && (
                                <div className="p-4 bg-ui-bg-tertiary border-2 border-ui-accent-primary rounded-lg space-y-3 mb-3">
                                    <Input
                                        placeholder="Group name"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="bg-ui-bg-secondary border-ui-border-primary"
                                    />
                                    <Input
                                        placeholder="Description (optional)"
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        className="bg-ui-bg-secondary border-ui-border-primary"
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={formColor}
                                            onChange={(e) => setFormColor(e.target.value)}
                                            className="w-16 bg-ui-bg-secondary border-ui-border-primary"
                                        />
                                        <Button
                                            onClick={handleCreateGroup}
                                            size="sm"
                                            className="flex-1 bg-green-500 hover:bg-green-600"
                                        >
                                            <MdSave className="mr-1" /> Create
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setIsCreating(false);
                                                resetForm();
                                            }}
                                            size="sm"
                                            variant="outline"
                                            className="border-ui-border-primary"
                                        >
                                            <MdCancel />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Groups List */}
                            {groups.map(group => (
                                <div
                                    key={group.id}
                                    onClick={() => {
                                        setSelectedGroup(group);
                                        setIsCreating(false);
                                        setIsEditing(false);
                                    }}
                                    className={`p-3 rounded-lg cursor-pointer transition-all ${selectedGroup?.id === group.id
                                            ? 'bg-ui-accent-primary/20 border-2 border-ui-accent-primary'
                                            : 'bg-ui-bg-tertiary border-2 border-transparent hover:border-ui-border-primary'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2 flex-1">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: group.color }}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-ui-text-primary truncate">{group.name}</p>
                                                <p className="text-xs text-ui-text-muted truncate">{group.description}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-ui-text-muted ml-2">{group.member_count} members</span>
                                    </div>
                                </div>
                            ))}

                            {groups.length === 0 && !isCreating && (
                                <div className="text-center py-8 text-ui-text-muted">
                                    <MdGroup className="mx-auto h-12 w-12 mb-2 opacity-50" />
                                    <p className="text-sm">No groups yet</p>
                                    <p className="text-xs mt-1">Click "New" to create one</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Group Details - Right Side */}
            <div className="col-span-8">
                <Card className="bg-ui-bg-secondary border-ui-border-primary">
                    <CardHeader>
                        {selectedGroup && !isEditing ? (
                            <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-3">
                                    <div
                                        className="w-6 h-6 rounded-full"
                                        style={{ backgroundColor: selectedGroup.color }}
                                    />
                                    <div>
                                        <CardTitle className="text-ui-text-primary text-xl">{selectedGroup.name}</CardTitle>
                                        <CardDescription className="text-ui-text-secondary">
                                            {selectedGroup.description || 'No description'}
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={startEdit}
                                        size="sm"
                                        variant="outline"
                                        className="border-ui-border-primary"
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
                                </div>
                            </div>
                        ) : isEditing && selectedGroup ? (
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <Input
                                        type="color"
                                        value={formColor}
                                        onChange={(e) => setFormColor(e.target.value)}
                                        className="w-16 bg-ui-bg-secondary border-ui-border-primary"
                                    />
                                    <Input
                                        placeholder="Group name"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="flex-1 bg-ui-bg-secondary border-ui-border-primary"
                                    />
                                </div>
                                <Input
                                    placeholder="Description"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    className="bg-ui-bg-secondary border-ui-border-primary"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleUpdateGroup}
                                        size="sm"
                                        className="bg-green-500 hover:bg-green-600"
                                    >
                                        <MdSave className="mr-1" /> Save Changes
                                    </Button>
                                    <Button
                                        onClick={() => setIsEditing(false)}
                                        size="sm"
                                        variant="outline"
                                        className="border-ui-border-primary"
                                    >
                                        <MdCancel className="mr-1" /> Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <CardTitle className="text-ui-text-primary">Group Details</CardTitle>
                                <CardDescription className="text-ui-text-secondary">
                                    Select a group to manage members
                                </CardDescription>
                            </>
                        )}
                    </CardHeader>

                    <CardContent>
                        {selectedGroup ? (
                            <div className="grid grid-cols-2 gap-6">
                                {/* Current Members */}
                                <div>
                                    <h4 className="font-semibold text-ui-text-primary mb-3 flex items-center">
                                        <MdPeople className="mr-2" />
                                        Members ({groupMembers.length})
                                    </h4>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {groupMembers.map(member => (
                                            <div
                                                key={member.id}
                                                className="flex items-center justify-between p-3 bg-ui-bg-tertiary rounded-lg"
                                            >
                                                <div>
                                                    <p className="font-medium text-ui-text-primary text-sm">{member.name}</p>
                                                    <p className="text-xs text-ui-text-muted">{member.email}</p>
                                                </div>
                                                <Button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-red-500 text-ui-danger-text hover:bg-red-500/20"
                                                >
                                                    <MdRemoveCircle />
                                                </Button>
                                            </div>
                                        ))}
                                        {groupMembers.length === 0 && (
                                            <p className="text-center py-6 text-ui-text-muted text-sm">
                                                No members yet
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Add Members */}
                                <div>
                                    <h4 className="font-semibold text-ui-text-primary mb-3">Add Members</h4>
                                    <Input
                                        placeholder="Search users..."
                                        value={memberSearch}
                                        onChange={(e) => setMemberSearch(e.target.value)}
                                        className="mb-3 bg-ui-bg-tertiary border-ui-border-primary"
                                    />
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {availableUsers.map(user => (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between p-3 bg-ui-bg-tertiary rounded-lg"
                                            >
                                                <div>
                                                    <p className="font-medium text-ui-text-primary text-sm">{user.name}</p>
                                                    <p className="text-xs text-ui-text-muted">{user.email}</p>
                                                </div>
                                                <Button
                                                    onClick={() => handleAddMember(user.id)}
                                                    size="sm"
                                                    className="bg-ui-accent-primary hover:bg-ui-accent-primary/80"
                                                >
                                                    <MdCheckCircle />
                                                </Button>
                                            </div>
                                        ))}
                                        {availableUsers.length === 0 && (
                                            <p className="text-center py-6 text-ui-text-muted text-sm">
                                                {memberSearch ? 'No users found' : 'All users are members'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-16 text-ui-text-muted">
                                <MdPeople className="mx-auto h-16 w-16 mb-4 opacity-30" />
                                <p className="text-lg">No group selected</p>
                                <p className="text-sm mt-2">Select a group from the list to manage members</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
