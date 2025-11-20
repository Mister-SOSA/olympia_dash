"""
Widget permissions management routes.
"""

from flask import Blueprint, request, jsonify
from auth.database import (
    grant_widget_permission,
    revoke_widget_permission,
    grant_group_widget_permission,
    revoke_group_widget_permission,
    get_user_widget_permissions,
    check_widget_access,
    get_all_widget_permissions,
    bulk_grant_widget_permissions,
    bulk_revoke_widget_permissions,
    get_user_by_id,
    get_group_by_id,
    log_action
)
from auth.middleware import (
    require_role,
    require_auth,
    get_client_ip
)

widget_bp = Blueprint('widgets', __name__)

@widget_bp.route('/permissions', methods=['GET'])
@require_role('admin')
def list_all_permissions():
    """Get all widget permissions (user and group)."""
    try:
        permissions = get_all_widget_permissions()
        return jsonify({
            'success': True,
            **permissions
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@widget_bp.route('/permissions/user/<int:user_id>', methods=['GET'])
@require_auth
def get_user_permissions(user_id):
    """Get all widget permissions for a specific user."""
    try:
        current_user = request.current_user  # type: ignore
        
        # Users can view their own permissions, admins can view anyone's
        if current_user['id'] != user_id and current_user['role'] != 'admin':
            return jsonify({
                'success': False,
                'error': 'Unauthorized'
            }), 403
        
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        permissions = get_user_widget_permissions(user_id)
        
        return jsonify({
            'success': True,
            'permissions': permissions
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@widget_bp.route('/permissions/user/<int:user_id>/widget/<widget_id>', methods=['POST'])
@require_role('admin')
def grant_user_widget_permission(user_id, widget_id):
    """Grant a widget permission to a user."""
    try:
        admin_user = request.current_user  # type: ignore
        data = request.get_json() or {}
        
        access_level = data.get('access_level', 'view')
        expires_at = data.get('expires_at')
        
        if access_level not in ['view', 'edit', 'admin']:
            return jsonify({
                'success': False,
                'error': 'Invalid access level. Must be view, edit, or admin'
            }), 400
        
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        success = grant_widget_permission(user_id, widget_id, access_level, admin_user['id'], expires_at)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Failed to grant permission'
            }), 400
        
        log_action(admin_user['id'], 'widget_permission_granted', 
                   f'Granted "{access_level}" access to widget "{widget_id}" for {user["email"]}', 
                   get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'Permission granted successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@widget_bp.route('/permissions/user/<int:user_id>/widget/<widget_id>', methods=['DELETE'])
@require_role('admin')
def revoke_user_widget_permission(user_id, widget_id):
    """Revoke a widget permission from a user."""
    try:
        admin_user = request.current_user  # type: ignore
        
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        success = revoke_widget_permission(user_id, widget_id)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Permission not found'
            }), 404
        
        log_action(admin_user['id'], 'widget_permission_revoked', 
                   f'Revoked widget "{widget_id}" from {user["email"]}', 
                   get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'Permission revoked successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@widget_bp.route('/permissions/group/<int:group_id>/widget/<widget_id>', methods=['POST'])
@require_role('admin')
def grant_group_widget_permission_route(group_id, widget_id):
    """Grant a widget permission to a group."""
    try:
        admin_user = request.current_user  # type: ignore
        data = request.get_json() or {}
        
        access_level = data.get('access_level', 'view')
        expires_at = data.get('expires_at')
        
        if access_level not in ['view', 'edit', 'admin']:
            return jsonify({
                'success': False,
                'error': 'Invalid access level. Must be view, edit, or admin'
            }), 400
        
        group = get_group_by_id(group_id)
        if not group:
            return jsonify({
                'success': False,
                'error': 'Group not found'
            }), 404
        
        success = grant_group_widget_permission(group_id, widget_id, access_level, admin_user['id'], expires_at)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Failed to grant permission'
            }), 400
        
        log_action(admin_user['id'], 'group_widget_permission_granted', 
                   f'Granted "{access_level}" access to widget "{widget_id}" for group "{group["name"]}"', 
                   get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'Permission granted successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@widget_bp.route('/permissions/group/<int:group_id>/widget/<widget_id>', methods=['DELETE'])
@require_role('admin')
def revoke_group_widget_permission_route(group_id, widget_id):
    """Revoke a widget permission from a group."""
    try:
        admin_user = request.current_user  # type: ignore
        
        group = get_group_by_id(group_id)
        if not group:
            return jsonify({
                'success': False,
                'error': 'Group not found'
            }), 404
        
        success = revoke_group_widget_permission(group_id, widget_id)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Permission not found'
            }), 404
        
        log_action(admin_user['id'], 'group_widget_permission_revoked', 
                   f'Revoked widget "{widget_id}" from group "{group["name"]}"', 
                   get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'Permission revoked successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@widget_bp.route('/permissions/check', methods=['POST'])
@require_auth
def check_widget_permission():
    """Check if current user has access to a specific widget."""
    try:
        current_user = request.current_user  # type: ignore
        data = request.get_json()
        
        widget_id = data.get('widget_id')
        required_level = data.get('required_level', 'view')
        
        if not widget_id:
            return jsonify({
                'success': False,
                'error': 'Widget ID is required'
            }), 400
        
        has_access = check_widget_access(current_user['id'], widget_id, required_level)
        
        return jsonify({
            'success': True,
            'has_access': has_access
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@widget_bp.route('/permissions/bulk/grant', methods=['POST'])
@require_role('admin')
def bulk_grant_permissions():
    """Grant widget permissions to multiple users at once."""
    try:
        admin_user = request.current_user  # type: ignore
        data = request.get_json()
        
        user_ids = data.get('user_ids', [])
        widget_ids = data.get('widget_ids', [])
        access_level = data.get('access_level', 'view')
        
        if not user_ids or not widget_ids:
            return jsonify({
                'success': False,
                'error': 'User IDs and widget IDs are required'
            }), 400
        
        if access_level not in ['view', 'edit', 'admin']:
            return jsonify({
                'success': False,
                'error': 'Invalid access level'
            }), 400
        
        count = bulk_grant_widget_permissions(user_ids, widget_ids, access_level, admin_user['id'])
        
        # Create detailed log message
        widget_list = ', '.join(widget_ids[:3]) + (f' and {len(widget_ids)-3} more' if len(widget_ids) > 3 else '')
        log_action(admin_user['id'], 'bulk_widget_permissions_granted', 
                   f'Granted {count} permissions: {len(widget_ids)} widgets ({widget_list}) to {len(user_ids)} users', 
                   get_client_ip())
        
        return jsonify({
            'success': True,
            'message': f'Granted {count} permissions',
            'count': count
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@widget_bp.route('/permissions/bulk/revoke', methods=['POST'])
@require_role('admin')
def bulk_revoke_permissions():
    """Revoke widget permissions from multiple users at once."""
    try:
        admin_user = request.current_user  # type: ignore
        data = request.get_json()
        
        user_ids = data.get('user_ids', [])
        widget_ids = data.get('widget_ids', [])
        
        if not user_ids or not widget_ids:
            return jsonify({
                'success': False,
                'error': 'User IDs and widget IDs are required'
            }), 400
        
        count = bulk_revoke_widget_permissions(user_ids, widget_ids)
        
        # Create detailed log message
        widget_list = ', '.join(widget_ids[:3]) + (f' and {len(widget_ids)-3} more' if len(widget_ids) > 3 else '')
        log_action(admin_user['id'], 'bulk_widget_permissions_revoked', 
                   f'Revoked {count} permissions: {len(widget_ids)} widgets ({widget_list}) from {len(user_ids)} users', 
                   get_client_ip())
        
        return jsonify({
            'success': True,
            'message': f'Revoked {count} permissions',
            'count': count
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@widget_bp.route('/available', methods=['GET'])
@require_auth
def get_available_widgets():
    """Get list of widgets current user has access to."""
    try:
        current_user = request.current_user  # type: ignore
        
        # Get user's widget permissions
        permissions = get_user_widget_permissions(current_user['id'])
        
        # Admins have access to all widgets
        if current_user['role'] == 'admin':
            return jsonify({
                'success': True,
                'permissions': permissions,
                'all_access': True
            }), 200
        
        return jsonify({
            'success': True,
            'permissions': permissions,
            'all_access': False
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
