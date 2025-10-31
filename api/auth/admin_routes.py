"""
Admin routes for user and permission management.
"""

from flask import Blueprint, request, jsonify
from auth.database import (
    get_all_users,
    get_user_by_id,
    update_user_role,
    toggle_user_active,
    delete_all_user_sessions,
    grant_permission,
    revoke_permission,
    get_user_permissions,
    get_audit_logs,
    log_action
)
from auth.middleware import (
    require_role,
    get_client_ip
)

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/users', methods=['GET'])
@require_role('admin')
def list_users():
    """List all users."""
    try:
        users = get_all_users()
        
        # Add permissions to each user
        for user in users:
            user['permissions'] = get_user_permissions(user['id'])
        
        return jsonify({
            'success': True,
            'users': users
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@require_role('admin')
def get_user(user_id):
    """Get detailed information about a specific user."""
    try:
        user = get_user_by_id(user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        # Get user permissions
        user['permissions'] = get_user_permissions(user_id)
        
        # Get user sessions
        from auth.database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, created_at, last_used, user_agent, ip_address 
            FROM sessions 
            WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
            ORDER BY last_used DESC
        ''', (user_id,))
        sessions = [dict(row) for row in cursor.fetchall()]
        
        cursor.execute('''
            SELECT id, created_at, last_used, device_name 
            FROM device_sessions 
            WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
            ORDER BY last_used DESC
        ''', (user_id,))
        device_sessions = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        user['sessions'] = sessions
        user['device_sessions'] = device_sessions
        
        return jsonify({
            'success': True,
            'user': user
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@require_role('admin')
def change_user_role(user_id):
    """Change a user's role."""
    try:
        admin_user = request.current_user  # type: ignore
        data = request.get_json()
        new_role = data.get('role')
        
        if not new_role or new_role not in ['user', 'admin']:
            return jsonify({
                'success': False,
                'error': 'Invalid role. Must be "user" or "admin"'
            }), 400
        
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        # Prevent self-demotion
        if user_id == admin_user['id'] and new_role != 'admin':
            return jsonify({
                'success': False,
                'error': 'You cannot change your own role'
            }), 400
        
        update_user_role(user_id, new_role)
        log_action(admin_user['id'], 'role_changed', f'Changed user {user_id} role to {new_role}', get_client_ip())
        
        return jsonify({
            'success': True,
            'message': f'User role changed to {new_role}'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/users/<int:user_id>/toggle-active', methods=['PUT'])
@require_role('admin')
def toggle_user_status(user_id):
    """Toggle user active status."""
    try:
        admin_user = request.current_user  # type: ignore
        
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        # Prevent self-deactivation
        if user_id == admin_user['id']:
            return jsonify({
                'success': False,
                'error': 'You cannot deactivate your own account'
            }), 400
        
        toggle_user_active(user_id)
        new_status = 'active' if not user['is_active'] else 'inactive'
        
        # If deactivating, end all sessions
        if new_status == 'inactive':
            delete_all_user_sessions(user_id)
        
        log_action(admin_user['id'], 'user_status_changed', f'User {user_id} set to {new_status}', get_client_ip())
        
        return jsonify({
            'success': True,
            'message': f'User set to {new_status}'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/users/<int:user_id>/permissions', methods=['POST'])
@require_role('admin')
def add_permission(user_id):
    """Grant a permission to a user."""
    try:
        admin_user = request.current_user  # type: ignore
        data = request.get_json()
        permission = data.get('permission')
        
        if not permission:
            return jsonify({
                'success': False,
                'error': 'Permission required'
            }), 400
        
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        success = grant_permission(user_id, permission, admin_user['id'])
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Permission already granted or error occurred'
            }), 400
        
        log_action(admin_user['id'], 'permission_granted', f'Granted {permission} to user {user_id}', get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'Permission granted'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/users/<int:user_id>/permissions/<permission>', methods=['DELETE'])
@require_role('admin')
def remove_permission(user_id, permission):
    """Revoke a permission from a user."""
    try:
        admin_user = request.current_user  # type: ignore
        
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        revoke_permission(user_id, permission)
        log_action(admin_user['id'], 'permission_revoked', f'Revoked {permission} from user {user_id}', get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'Permission revoked'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/users/<int:user_id>/sessions', methods=['DELETE'])
@require_role('admin')
def revoke_all_sessions(user_id):
    """Revoke all sessions for a user."""
    try:
        admin_user = request.current_user  # type: ignore
        
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        delete_all_user_sessions(user_id)
        log_action(admin_user['id'], 'sessions_revoked', f'Revoked all sessions for user {user_id}', get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'All sessions revoked'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/audit-logs', methods=['GET'])
@require_role('admin')
def get_logs():
    """Get audit logs."""
    try:
        limit = request.args.get('limit', 100, type=int)
        user_id = request.args.get('user_id', None, type=int)
        
        logs = get_audit_logs(limit, user_id)
        
        return jsonify({
            'success': True,
            'logs': logs
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/stats', methods=['GET'])
@require_role('admin')
def get_stats():
    """Get system statistics."""
    try:
        from auth.database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        # Count total users
        cursor.execute('SELECT COUNT(*) FROM users')
        total_users = cursor.fetchone()[0]
        
        # Count active users
        cursor.execute('SELECT COUNT(*) FROM users WHERE is_active = 1')
        active_users = cursor.fetchone()[0]
        
        # Count admins
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
        admin_count = cursor.fetchone()[0]
        
        # Count active sessions
        cursor.execute('SELECT COUNT(*) FROM sessions WHERE expires_at > CURRENT_TIMESTAMP')
        active_sessions = cursor.fetchone()[0]
        
        # Count active device sessions
        cursor.execute('SELECT COUNT(*) FROM device_sessions WHERE expires_at > CURRENT_TIMESTAMP')
        active_device_sessions = cursor.fetchone()[0]
        
        # Recent logins (last 24 hours)
        cursor.execute("""
            SELECT COUNT(*) FROM users 
            WHERE last_login > datetime('now', '-1 day')
        """)
        recent_logins = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_users': total_users,
                'active_users': active_users,
                'admin_count': admin_count,
                'active_sessions': active_sessions,
                'active_device_sessions': active_device_sessions,
                'recent_logins': recent_logins
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
