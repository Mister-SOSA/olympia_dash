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
            const groupId = await adminService.createGroup(
                formName,
                formDescription,
                formColor
            );

            toast.success('Group created successfully');
            setIsCreating(false);
            resetForm();
            await loadGroups();

            // Load the newly created group
            const newGroup = await adminService.getGroup(groupId);
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
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
            {/* Groups List - Left Side */}
            <div className="col-span-4 flex flex-col h-full">
                <Card className="bg-ui-bg-secondary border-ui-border-primary flex flex-col h-full shadow-sm">
                    <CardHeader className="border-b border-ui-border-primary pb-4 flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-ui-text-primary text-lg">Groups</CardTitle>
                            <Button
                                onClick={() => {
                                    setIsCreating(true);
                                    setSelectedGroup(null);
                                    resetForm();
                                }}
                                size="sm"
                                className="bg-ui-accent-primary hover:bg-ui-accent-primary/90 text-white shadow-sm"
                            >
                                <MdAdd className="mr-1" /> New
                            </Button>
                        </div>
                        <CardDescription className="text-ui-text-secondary text-xs">
                            {groups.length} group(s) total
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0">
                        <div className="h-full overflow-y-auto p-4 space-y-2">
                            {/* Create Form */}
                            {isCreating && (
                                <div className="p-4 bg-ui-bg-tertiary border border-ui-accent-primary rounded-lg space-y-3 mb-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                                    <Input
                                        placeholder="Group name"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="bg-ui-bg-secondary border-ui-border-primary focus:ring-ui-accent-primary"
                                    />
                                    <Input
                                        placeholder="Description (optional)"
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        className="bg-ui-bg-secondary border-ui-border-primary focus:ring-ui-accent-primary"
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={formColor}
                                            onChange={(e) => setFormColor(e.target.value)}
                                            className="w-12 h-9 p-1 bg-ui-bg-secondary border-ui-border-primary cursor-pointer"
                                        />
                                        <Button
                                            onClick={handleCreateGroup}
                                            size="sm"
                                            className="flex-1 bg-ui-success-bg hover:bg-ui-success-bg/90 text-ui-success-text border border-ui-success-border"
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
                                            className="border-ui-border-primary hover:bg-ui-bg-quaternary"
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
                                    className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedGroup?.id === group.id
                                        ? 'bg-ui-accent-primary/10 border-ui-accent-primary shadow-sm'
                                        : 'bg-ui-bg-tertiary border-transparent hover:border-ui-border-primary hover:bg-ui-bg-quaternary'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-ui-bg-tertiary"
                                                style={{ backgroundColor: group.color }}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className={`font-medium truncate ${selectedGroup?.id === group.id ? 'text-ui-accent-primary' : 'text-ui-text-primary'}`}>
                                                    {group.name}
                                                </p>
                                                <p className="text-xs text-ui-text-muted truncate">{group.description}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-ui-bg-secondary text-ui-text-secondary border border-ui-border-primary ml-2">
                                            {group.member_count}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {groups.length === 0 && !isCreating && (
                                <div className="text-center py-12 text-ui-text-muted flex flex-col items-center justify-center h-full">
                                    <div className="p-4 bg-ui-bg-tertiary rounded-full mb-3">
                                        <MdGroup className="h-8 w-8 opacity-50" />
                                    </div>
                                    <p className="text-sm font-medium">No groups yet</p>
                                    <p className="text-xs mt-1">Click "New" to create one</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Group Details - Right Side */}
            <div className="col-span-8 flex flex-col h-full">
                <Card className="bg-ui-bg-secondary border-ui-border-primary flex flex-col h-full shadow-sm">
                    <CardHeader className="border-b border-ui-border-primary pb-4 flex-shrink-0">
                        {selectedGroup && !isEditing ? (
                            <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-4">
                                    <div
                                        className="w-10 h-10 rounded-lg shadow-sm flex items-center justify-center text-white font-bold text-lg"
                                        style={{ backgroundColor: selectedGroup.color }}
                                    >
                                        {selectedGroup.name[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <CardTitle className="text-ui-text-primary text-xl">{selectedGroup.name}</CardTitle>
                                        <CardDescription className="text-ui-text-secondary mt-1">
                                            {selectedGroup.description || 'No description provided'}
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={startEdit}
                                        size="sm"
                                        variant="outline"
                                        className="border-ui-border-primary hover:bg-ui-bg-tertiary text-ui-text-secondary"
                                    >
                                        <MdEdit className="mr-1" /> Edit
                                    </Button>
                                    <Button
                                        onClick={() => handleDeleteGroup(selectedGroup.id)}
                                        size="sm"
                                        variant="outline"
                                        className="border-ui-danger-border text-ui-danger-text hover:bg-ui-danger-bg"
                                    >
                                        <MdDelete className="mr-1" /> Delete
                                    </Button>
                                </div>
                            </div>
                        ) : isEditing && selectedGroup ? (
                            <div className="space-y-4 bg-ui-bg-tertiary p-4 rounded-lg border border-ui-border-primary">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0">
                                        <Label className="text-xs text-ui-text-secondary mb-1 block">Color</Label>
                                        <Input
                                            type="color"
                                            value={formColor}
                                            onChange={(e) => setFormColor(e.target.value)}
                                            className="w-16 h-10 p-1 bg-ui-bg-secondary border-ui-border-primary cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs text-ui-text-secondary mb-1 block">Group Name</Label>
                                        <Input
                                            placeholder="Group name"
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            className="bg-ui-bg-secondary border-ui-border-primary focus:ring-ui-accent-primary"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-ui-text-secondary mb-1 block">Description</Label>
                                    <Input
                                        placeholder="Description"
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        className="bg-ui-bg-secondary border-ui-border-primary focus:ring-ui-accent-primary"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        onClick={() => setIsEditing(false)}
                                        size="sm"
                                        variant="outline"
                                        className="border-ui-border-primary hover:bg-ui-bg-quaternary"
                                    >
                                        <MdCancel className="mr-1" /> Cancel
                                    </Button>
                                    <Button
                                        onClick={handleUpdateGroup}
                                        size="sm"
                                        className="bg-ui-success-bg hover:bg-ui-success-bg/90 text-ui-success-text border border-ui-success-border"
                                    >
                                        <MdSave className="mr-1" /> Save Changes
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

                    <CardContent className="flex-1 overflow-hidden p-0">
                        {selectedGroup ? (
                            <div className="grid grid-cols-2 gap-0 h-full divide-x divide-ui-border-primary">
                                {/* Current Members */}
                                <div className="flex flex-col h-full overflow-hidden">
                                    <div className="p-4 border-b border-ui-border-primary bg-ui-bg-tertiary/30">
                                        <h4 className="font-semibold text-ui-text-primary flex items-center text-sm">
                                            <MdPeople className="mr-2 text-ui-accent-primary" />
                                            Current Members
                                            <span className="ml-2 px-2 py-0.5 rounded-full bg-ui-bg-tertiary text-xs text-ui-text-secondary border border-ui-border-primary">
                                                {groupMembers.length}
                                            </span>
                                        </h4>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                        {groupMembers.map(member => (
                                            <div
                                                key={member.id}
                                                className="flex items-center justify-between p-3 bg-ui-bg-tertiary rounded-lg border border-transparent hover:border-ui-border-primary transition-colors group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-ui-accent-secondary-bg flex items-center justify-center text-ui-accent-secondary-text font-bold text-xs">
                                                        {member.name?.[0] || member.email[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-ui-text-primary text-sm">{member.name}</p>
                                                        <p className="text-xs text-ui-text-muted">{member.email}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-ui-text-muted hover:text-ui-danger-text hover:bg-ui-danger-bg opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <MdRemoveCircle className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        ))}
                                        {groupMembers.length === 0 && (
                                            <div className="text-center py-12 text-ui-text-muted">
                                                <p className="text-sm">No members yet</p>
                                                <p className="text-xs mt-1">Add users from the right panel</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Add Members */}
                                <div className="flex flex-col h-full overflow-hidden bg-ui-bg-tertiary/10">
                                    <div className="p-4 border-b border-ui-border-primary space-y-3">
                                        <h4 className="font-semibold text-ui-text-primary text-sm">Add Members</h4>
                                        <div className="relative">
                                            <Input
                                                placeholder="Search users..."
                                                value={memberSearch}
                                                onChange={(e) => setMemberSearch(e.target.value)}
                                                className="bg-ui-bg-tertiary border-ui-border-primary pl-9 focus:ring-ui-accent-primary"
                                            />
                                            <MdPeople className="absolute left-3 top-2.5 text-ui-text-muted" />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                        {availableUsers.map(user => (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between p-3 bg-ui-bg-tertiary rounded-lg border border-transparent hover:border-ui-border-primary transition-colors group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-ui-bg-quaternary flex items-center justify-center text-ui-text-secondary font-bold text-xs">
                                                        {user.name?.[0] || user.email[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-ui-text-primary text-sm">{user.name}</p>
                                                        <p className="text-xs text-ui-text-muted">{user.email}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => handleAddMember(user.id)}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-ui-success-text hover:bg-ui-success-bg hover:text-ui-success-text"
                                                >
                                                    <MdAdd className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        ))}
                                        {availableUsers.length === 0 && (
                                            <div className="text-center py-12 text-ui-text-muted">
                                                <p className="text-sm">
                                                    {memberSearch ? 'No users found' : 'All users are members'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-24 text-ui-text-muted flex flex-col items-center justify-center h-full">
                                <div className="p-6 bg-ui-bg-tertiary rounded-full mb-4">
                                    <MdPeople className="h-12 w-12 opacity-30" />
                                </div>
                                <p className="text-lg font-medium text-ui-text-secondary">No group selected</p>
                                <p className="text-sm mt-2 max-w-xs mx-auto">Select a group from the list on the left to view details and manage members</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
