"""
User groups management routes.
"""

from flask import Blueprint, request, jsonify
from auth.database import (
    create_group,
    get_all_groups,
    get_group_by_id,
    update_group,
    delete_group,
    add_user_to_group,
    remove_user_from_group,
    get_user_groups,
    get_user_by_id,
    log_action
)
from auth.middleware import (
    require_role,
    get_client_ip
)

groups_bp = Blueprint('groups', __name__)

@groups_bp.route('', methods=['GET'])
@require_role('admin')
def list_groups():
    """List all user groups."""
    try:
        groups = get_all_groups()
        return jsonify({
            'success': True,
            'groups': groups
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@groups_bp.route('', methods=['POST'])
@require_role('admin')
def create_new_group():
    """Create a new user group."""
    try:
        admin_user = request.current_user  # type: ignore
        data = request.get_json()
        
        name = data.get('name')
        description = data.get('description')
        color = data.get('color', '#3b82f6')
        
        if not name:
            return jsonify({
                'success': False,
                'error': 'Group name is required'
            }), 400
        
        group_id = create_group(name, description, color, admin_user['id'])
        
        if not group_id:
            return jsonify({
                'success': False,
                'error': 'Group name already exists'
            }), 400
        
        log_action(admin_user['id'], 'group_created', f'Created group: {name}', get_client_ip())
        
        return jsonify({
            'success': True,
            'group_id': group_id,
            'message': 'Group created successfully'
        }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@groups_bp.route('/<int:group_id>', methods=['GET'])
@require_role('admin')
def get_group(group_id):
    """Get detailed information about a specific group."""
    try:
        group = get_group_by_id(group_id)
        
        if not group:
            return jsonify({
                'success': False,
                'error': 'Group not found'
            }), 404
        
        return jsonify({
            'success': True,
            'group': group
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@groups_bp.route('/<int:group_id>', methods=['PUT'])
@require_role('admin')
def update_group_details(group_id):
    """Update group details."""
    try:
        admin_user = request.current_user  # type: ignore
        data = request.get_json()
        
        group = get_group_by_id(group_id)
        if not group:
            return jsonify({
                'success': False,
                'error': 'Group not found'
            }), 404
        
        name = data.get('name')
        description = data.get('description')
        color = data.get('color')
        
        success = update_group(group_id, name, description, color)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Failed to update group'
            }), 400
        
        log_action(admin_user['id'], 'group_updated', f'Updated group: {group["name"]}', get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'Group updated successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@groups_bp.route('/<int:group_id>', methods=['DELETE'])
@require_role('admin')
def delete_group_endpoint(group_id):
    """Delete a group."""
    try:
        admin_user = request.current_user  # type: ignore
        
        group = get_group_by_id(group_id)
        if not group:
            return jsonify({
                'success': False,
                'error': 'Group not found'
            }), 404
        
        success = delete_group(group_id)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Failed to delete group'
            }), 400
        
        log_action(admin_user['id'], 'group_deleted', f'Deleted group: {group["name"]}', get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'Group deleted successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@groups_bp.route('/<int:group_id>/members', methods=['POST'])
@require_role('admin')
def add_member_to_group(group_id):
    """Add a user to a group."""
    try:
        admin_user = request.current_user  # type: ignore
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User ID is required'
            }), 400
        
        # Check if group exists
        group = get_group_by_id(group_id)
        if not group:
            return jsonify({
                'success': False,
                'error': 'Group not found'
            }), 404
        
        # Check if user exists
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        success = add_user_to_group(group_id, user_id, admin_user['id'])
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'User is already a member of this group'
            }), 400
        
        log_action(admin_user['id'], 'user_added_to_group', 
                   f'Added {user["email"]} to group "{group["name"]}"', get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'User added to group successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@groups_bp.route('/<int:group_id>/members/<int:user_id>', methods=['DELETE'])
@require_role('admin')
def remove_member_from_group(group_id, user_id):
    """Remove a user from a group."""
    try:
        admin_user = request.current_user  # type: ignore
        
        group = get_group_by_id(group_id)
        if not group:
            return jsonify({
                'success': False,
                'error': 'Group not found'
            }), 404
        
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        success = remove_user_from_group(group_id, user_id)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'User is not a member of this group'
            }), 400
        
        log_action(admin_user['id'], 'user_removed_from_group', 
                   f'Removed {user["email"]} from group "{group["name"]}"', get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'User removed from group successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@groups_bp.route('/user/<int:user_id>', methods=['GET'])
@require_role('admin')
def get_user_groups_endpoint(user_id):
    """Get all groups a user belongs to."""
    try:
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        groups = get_user_groups(user_id)
        
        return jsonify({
            'success': True,
            'groups': groups
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@groups_bp.route('/<int:group_id>/members/bulk', methods=['POST'])
@require_role('admin')
def bulk_add_members(group_id):
    """Add multiple users to a group at once."""
    try:
        admin_user = request.current_user  # type: ignore
        data = request.get_json()
        user_ids = data.get('user_ids', [])
        
        if not user_ids:
            return jsonify({
                'success': False,
                'error': 'User IDs are required'
            }), 400
        
        group = get_group_by_id(group_id)
        if not group:
            return jsonify({
                'success': False,
                'error': 'Group not found'
            }), 404
        
        added_count = 0
        for user_id in user_ids:
            if add_user_to_group(group_id, user_id, admin_user['id']):
                added_count += 1
        
        log_action(admin_user['id'], 'bulk_users_added_to_group', 
                   f'Added {added_count} user(s) to group "{group["name"]}"', get_client_ip())
        
        return jsonify({
            'success': True,
            'message': f'Added {added_count} users to group',
            'added_count': added_count
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
