"""
Admin routes for user and permission management.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
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
    log_action,
    get_analytics_summary,
    get_user_analytics,
    cleanup_old_analytics
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
        # Log with user email and role transition
        target_email = user['email'] if user else f'user_{user_id}'
        old_role = user['role'] if user else 'unknown'
        log_action(admin_user['id'], 'role_changed', 
                   f'Changed {target_email} role from {old_role} to {new_role}', 
                   get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'User role updated successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/impersonate/<int:user_id>', methods=['POST'])
@require_role('admin')
def impersonate_user(user_id):
    """Allow admin to impersonate a user"""
    try:
        admin_user = request.current_user  # type: ignore
        
        # Get target user
        target_user = get_user_by_id(user_id)
        if not target_user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        # Prevent impersonating yourself
        if user_id == admin_user['id']:
            return jsonify({
                'success': False,
                'error': 'Cannot impersonate yourself'
            }), 400
        
        # Prevent impersonating other admins (safety)
        if target_user['role'] == 'admin':
            return jsonify({
                'success': False,
                'error': 'Cannot impersonate other admins'
            }), 403
        
        # Log the impersonation
        log_action(
            admin_user['id'], 
            'impersonation_started', 
            f'Admin {admin_user["email"]} impersonating user {target_user["email"]} (ID: {user_id})', 
            get_client_ip()
        )
        
        # Return impersonation data (admin keeps their token, but acts as target user)
        return jsonify({
            'success': True,
            'impersonated_user': {
                'id': target_user['id'],
                'email': target_user['email'],
                'name': target_user['name'],
                'role': target_user['role']
            },
            'admin_user': {
                'id': admin_user['id'],
                'email': admin_user['email'],
                'name': admin_user['name']
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/end-impersonation', methods=['POST'])
@require_role('admin')
def end_impersonation():
    """End admin impersonation session"""
    try:
        admin_user = request.current_user  # type: ignore
        data = request.get_json() or {}
        impersonated_email = data.get('impersonated_email', 'unknown')
        
        log_action(
            admin_user['id'],
            'impersonation_ended',
            f'Admin {admin_user["email"]} ended impersonation of {impersonated_email}',
            get_client_ip()
        )
        
        return jsonify({
            'success': True,
            'message': 'Impersonation ended'
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
        
        # Log with user email
        target_email = user['email'] if user else f'user_{user_id}'
        log_action(admin_user['id'], 'user_status_changed', 
                   f'Set {target_email} status to {new_status}', get_client_ip())
        
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
        
        # Log with user email
        target_email = user['email'] if user else f'user_{user_id}'
        log_action(admin_user['id'], 'permission_granted', 
                   f'Granted permission "{permission}" to {target_email}', get_client_ip())
        
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
        # Log with user email
        target_email = user['email'] if user else f'user_{user_id}'
        log_action(admin_user['id'], 'permission_revoked', 
                   f'Revoked permission "{permission}" from {target_email}', get_client_ip())
        
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
        
        # Get user email and count sessions for better logging
        from auth.database import get_db
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM sessions WHERE user_id = ?', (user_id,))
        session_count = cursor.fetchone()[0]
        conn.close()
        
        target_email = user['email'] if user else f'user_{user_id}'
        log_action(admin_user['id'], 'sessions_revoked', 
                   f'Revoked {session_count} session(s) for {target_email}', get_client_ip())
        
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
        import os
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
        
        # Count total preferences
        cursor.execute('SELECT COUNT(*) FROM user_preferences')
        total_preferences = cursor.fetchone()[0]
        
        # Count audit logs
        cursor.execute('SELECT COUNT(*) FROM audit_log')
        total_audit_logs = cursor.fetchone()[0]
        
        # Get database size
        from auth.database import DB_PATH
        db_size_bytes = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0
        db_size_mb = round(db_size_bytes / (1024 * 1024), 2)
        
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_users': total_users,
                'active_users': active_users,
                'admin_count': admin_count,
                'active_sessions': active_sessions,
                'active_device_sessions': active_device_sessions,
                'recent_logins': recent_logins,
                'total_preferences': total_preferences,
                'total_audit_logs': total_audit_logs,
                'db_size_mb': db_size_mb
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/device-sessions', methods=['GET'])
@require_role('admin')
def list_device_sessions():
    """List all active device sessions."""
    try:
        from auth.database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                ds.id,
                ds.user_id,
                ds.device_name,
                ds.created_at,
                ds.last_used,
                ds.expires_at,
                u.email,
                u.name
            FROM device_sessions ds
            JOIN users u ON ds.user_id = u.id
            WHERE ds.expires_at > CURRENT_TIMESTAMP
            ORDER BY ds.last_used DESC
        ''')
        
        sessions = []
        for row in cursor.fetchall():
            sessions.append({
                'id': row[0],
                'user_id': row[1],
                'device_name': row[2],
                'created_at': row[3],
                'last_used': row[4],
                'expires_at': row[5],
                'user_email': row[6],
                'user_name': row[7]
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'sessions': sessions
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/device-sessions/<int:session_id>', methods=['DELETE'])
@require_role('admin')
def delete_device_session(session_id):
    """Delete a specific device session."""
    try:
        admin_user = request.current_user  # type: ignore
        from auth.database import get_db
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Get session info before deleting
        cursor.execute('SELECT user_id, device_name FROM device_sessions WHERE id = ?', (session_id,))
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Device session not found'
            }), 404
        
        user_id, device_name = session
        
        cursor.execute('DELETE FROM device_sessions WHERE id = ?', (session_id,))
        conn.commit()
        conn.close()
        
        log_action(admin_user['id'], 'device_session_deleted', 
                   f'Deleted device session {session_id} for user {user_id} ({device_name})', 
                   get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'Device session deleted'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/preferences', methods=['GET'])
@require_role('admin')
def list_all_preferences():
    """List all user preferences (summary)."""
    try:
        from auth.database import get_db
        import json
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                up.user_id,
                u.email,
                u.name,
                up.version,
                up.updated_at,
                length(up.preferences) as size_bytes
            FROM user_preferences up
            JOIN users u ON up.user_id = u.id
            ORDER BY up.updated_at DESC
        ''')
        
        preferences = []
        for row in cursor.fetchall():
            preferences.append({
                'user_id': row[0],
                'user_email': row[1],
                'user_name': row[2],
                'version': row[3],
                'updated_at': row[4],
                'size_bytes': row[5]
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'preferences': preferences
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/preferences/<int:user_id>', methods=['GET'])
@require_role('admin')
def get_user_preferences_admin(user_id):
    """Get detailed preferences for a specific user."""
    try:
        from auth.database import get_user_preferences
        
        result = get_user_preferences(user_id)
        
        return jsonify({
            'success': True,
            'preferences': result['preferences'],
            'version': result['version'],
            'updated_at': result['updated_at']
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/system/cleanup', methods=['POST'])
@require_role('admin')
def cleanup_system():
    """Clean up expired sessions, device codes, and old audit logs."""
    try:
        admin_user = request.current_user  # type: ignore
        from auth.database import get_db, cleanup_expired_sessions, cleanup_expired_device_codes
        
        # Clean up expired sessions and device codes
        cleanup_expired_sessions()
        cleanup_expired_device_codes()
        
        # Optionally clean up old audit logs (keep last 10000)
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            DELETE FROM audit_log 
            WHERE id NOT IN (
                SELECT id FROM audit_log 
                ORDER BY created_at DESC 
                LIMIT 10000
            )
        ''')
        
        deleted_logs = cursor.rowcount
        
        # Clean up expired rate limits
        cursor.execute('''
            DELETE FROM rate_limits 
            WHERE window_start < datetime('now', '-1 hour')
        ''')
        
        deleted_rate_limits = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        log_action(admin_user['id'], 'system_cleanup', 
                   f'Cleaned up system: {deleted_logs} old logs, {deleted_rate_limits} rate limits', 
                   get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'System cleanup completed',
            'deleted_logs': deleted_logs,
            'deleted_rate_limits': deleted_rate_limits
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/system/health', methods=['GET'])
@require_role('admin')
def system_health():
    """Get detailed system health information."""
    try:
        from auth.database import get_db, DB_PATH
        import os
        from datetime import datetime, timedelta
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Check for issues
        issues = []
        
        # Check for expired sessions not cleaned up
        cursor.execute('SELECT COUNT(*) FROM sessions WHERE expires_at < CURRENT_TIMESTAMP')
        expired_sessions = cursor.fetchone()[0]
        if expired_sessions > 100:
            issues.append({
                'type': 'warning',
                'message': f'{expired_sessions} expired sessions need cleanup'
            })
        
        # Check for expired device codes
        cursor.execute('SELECT COUNT(*) FROM device_codes WHERE expires_at < CURRENT_TIMESTAMP')
        expired_codes = cursor.fetchone()[0]
        if expired_codes > 50:
            issues.append({
                'type': 'warning',
                'message': f'{expired_codes} expired device codes need cleanup'
            })
        
        # Check database size
        db_size_bytes = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0
        db_size_mb = round(db_size_bytes / (1024 * 1024), 2)
        if db_size_mb > 100:
            issues.append({
                'type': 'info',
                'message': f'Database size is {db_size_mb}MB'
            })
        
        # Check for inactive admins
        cursor.execute('''
            SELECT COUNT(*) FROM users 
            WHERE role = 'admin' AND is_active = 0
        ''')
        inactive_admins = cursor.fetchone()[0]
        if inactive_admins > 0:
            issues.append({
                'type': 'info',
                'message': f'{inactive_admins} inactive admin account(s)'
            })
        
        # Get recent error logs (if any)
        cursor.execute('''
            SELECT COUNT(*) FROM audit_log 
            WHERE action LIKE '%error%' 
            AND created_at > datetime('now', '-1 hour')
        ''')
        recent_errors = cursor.fetchone()[0]
        if recent_errors > 10:
            issues.append({
                'type': 'error',
                'message': f'{recent_errors} errors in the last hour'
            })
        
        conn.close()
        
        health_status = 'healthy' if not any(i['type'] == 'error' for i in issues) else 'degraded'
        
        return jsonify({
            'success': True,
            'status': health_status,
            'issues': issues,
            'db_size_mb': db_size_mb,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/export/users', methods=['GET'])
@require_role('admin')
def export_users():
    """Export user list as JSON."""
    try:
        users = get_all_users()
        
        # Add permissions to each user
        for user in users:
            user['permissions'] = get_user_permissions(user['id'])
        
        return jsonify({
            'success': True,
            'users': users,
            'exported_at': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/export/audit-logs', methods=['GET'])
@require_role('admin')
def export_audit_logs():
    """Export audit logs as JSON."""
    try:
        limit = request.args.get('limit', 1000, type=int)
        logs = get_audit_logs(limit)
        
        return jsonify({
            'success': True,
            'logs': logs,
            'exported_at': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============ Analytics Endpoints ============

@admin_bp.route('/analytics', methods=['GET'])
@require_role('admin')
def get_analytics():
    """Get comprehensive analytics data."""
    try:
        days = request.args.get('days', 30, type=int)
        
        # Clamp days to reasonable range
        days = max(1, min(days, 365))
        
        analytics = get_analytics_summary(days)
        
        return jsonify({
            'success': True,
            'analytics': analytics,
            'period_days': days,
            'generated_at': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@admin_bp.route('/analytics/user/<int:user_id>', methods=['GET'])
@require_role('admin')
def get_user_analytics_route(user_id):
    """Get analytics for a specific user."""
    try:
        days = request.args.get('days', 30, type=int)
        days = max(1, min(days, 365))
        
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        analytics = get_user_analytics(user_id, days)
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name']
            },
            'analytics': analytics,
            'period_days': days,
            'generated_at': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@admin_bp.route('/analytics/cleanup', methods=['POST'])
@require_role('admin')
def cleanup_analytics():
    """Clean up old analytics data."""
    try:
        admin_user = request.current_user  # type: ignore
        days_to_keep = request.args.get('days', 90, type=int)
        days_to_keep = max(30, min(days_to_keep, 365))
        
        result = cleanup_old_analytics(days_to_keep)
        
        log_action(admin_user['id'], 'analytics_cleanup', 
                   f'Cleaned up analytics: {result["page_views_deleted"]} page views, '
                   f'{result["widget_interactions_deleted"]} interactions, '
                   f'{result["sessions_deleted"]} sessions', 
                   get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'Analytics cleanup completed',
            'deleted': result
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@admin_bp.route('/analytics/realtime', methods=['GET'])
@require_role('admin')
def get_realtime_analytics():
    """Get real-time analytics (last 24 hours focus)."""
    try:
        from auth.database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        # Active users in last 15 minutes (based on heartbeat)
        cursor.execute('''
            SELECT COUNT(DISTINCT user_id) FROM user_activity_sessions
            WHERE last_heartbeat > datetime('now', '-15 minutes')
            AND (session_end IS NULL OR session_end > datetime('now', '-15 minutes'))
        ''')
        currently_active = cursor.fetchone()[0]
        
        # Page views in last hour by 5 min intervals
        cursor.execute('''
            SELECT 
                strftime('%H:%M', created_at, 'localtime') as time_slot,
                COUNT(*) as count
            FROM page_views
            WHERE created_at > datetime('now', '-1 hour')
            GROUP BY strftime('%Y-%m-%d %H:', created_at) || (CAST(strftime('%M', created_at) AS INTEGER) / 5 * 5)
            ORDER BY created_at
        ''')
        hourly_views = [dict(row) for row in cursor.fetchall()]
        
        # Widget interactions in last hour
        cursor.execute('''
            SELECT 
                widget_type,
                COUNT(*) as count
            FROM widget_interactions
            WHERE created_at > datetime('now', '-1 hour')
            GROUP BY widget_type
            ORDER BY count DESC
            LIMIT 10
        ''')
        recent_widget_activity = [dict(row) for row in cursor.fetchall()]
        
        # Recent sessions started
        cursor.execute('''
            SELECT 
                uas.user_id,
                u.email,
                u.name,
                uas.session_start,
                uas.device_type
            FROM user_activity_sessions uas
            JOIN users u ON uas.user_id = u.id
            WHERE uas.session_start > datetime('now', '-1 hour')
            ORDER BY uas.session_start DESC
            LIMIT 10
        ''')
        recent_sessions = [dict(row) for row in cursor.fetchall()]
        
        # Peak concurrent users today
        cursor.execute('''
            SELECT MAX(concurrent) as peak FROM (
                SELECT 
                    strftime('%Y-%m-%d %H', session_start) as hour,
                    COUNT(DISTINCT user_id) as concurrent
                FROM user_activity_sessions
                WHERE session_start > datetime('now', '-24 hours')
                GROUP BY hour
            )
        ''')
        peak_concurrent = cursor.fetchone()[0] or 0
        
        conn.close()
        
        return jsonify({
            'success': True,
            'realtime': {
                'currently_active': currently_active,
                'hourly_views': hourly_views,
                'recent_widget_activity': recent_widget_activity,
                'recent_sessions': recent_sessions,
                'peak_concurrent_today': peak_concurrent
            },
            'generated_at': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
