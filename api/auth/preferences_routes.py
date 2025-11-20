"""
User preferences API routes.
Provides endpoints for managing user preferences with versioning support.
"""

from flask import Blueprint, request, jsonify
from auth.database import (
    get_user_preferences,
    set_user_preferences,
    update_user_preferences,
    delete_user_preferences,
    log_action
)
from auth.middleware import require_auth, get_client_ip, rate_limit
import logging

preferences_bp = Blueprint('preferences', __name__)
logger = logging.getLogger(__name__)

@preferences_bp.route('/preferences', methods=['GET'])
@require_auth
@rate_limit(max_requests=300, window_minutes=1)
def get_preferences():
    """
    Get all user preferences.
    Returns preferences object with version and timestamp.
    Supports admin impersonation via query parameter.
    """
    try:
        user = request.current_user  # type: ignore
        
        # Check for impersonation (admin only)
        impersonated_user_id = request.args.get('impersonated_user_id', type=int)
        target_user_id = user['id']
        
        if impersonated_user_id and user['role'] == 'admin':
            target_user_id = impersonated_user_id
            logger.info(f'🎭 Admin {user["id"]} fetching preferences for user {target_user_id}')
        
        result = get_user_preferences(target_user_id)
        
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

@preferences_bp.route('/preferences', methods=['PUT'])
@require_auth
@rate_limit(max_requests=300, window_minutes=1)
def replace_preferences():
    """
    Replace all user preferences.
    Supports optimistic locking with version parameter.
    
    Request body:
    {
        "preferences": { ... },
        "version": 5  // optional, for optimistic locking
    }
    """
    try:
        user = request.current_user  # type: ignore
        data = request.get_json()
        
        if not data or 'preferences' not in data:
            return jsonify({
                'success': False,
                'error': 'Preferences object required'
            }), 400
        
        preferences = data['preferences']
        expected_version = data.get('version')
        session_id = data.get('session_id')
        impersonated_user_id = data.get('impersonated_user_id')
        
        # Determine which user's preferences to save
        target_user_id = user['id']
        is_impersonating = False
        
        if impersonated_user_id and user['role'] == 'admin':
            # Admin is impersonating another user
            target_user_id = impersonated_user_id
            is_impersonating = True
            logger.info(f'🎭 IMPERSONATION - Admin {user["id"]} saving as user {target_user_id}')
        
        logger.info(f'💾 SAVE REQUEST - Target User: {target_user_id}, Session: {session_id[:8] if session_id else "none"}..., Version: {expected_version}')
        
        new_version = set_user_preferences(target_user_id, preferences, expected_version)
        
        if new_version is None:
            logger.warning('⚠️ Version conflict!')
            return jsonify({
                'success': False,
                'error': 'Version conflict detected. Please refresh and try again.',
                'conflict': True
            }), 409
        
        logger.info(f'✅ SAVED - New version: {new_version}')
        # Client will trigger broadcast via WebSocket after receiving save response
        
        # Log with more detail about what changed
        pref_keys = list(preferences.keys()) if isinstance(preferences, dict) else ['unknown']
        details = f'Updated preferences: {', '.join(pref_keys[:5])}' + (' and more' if len(pref_keys) > 5 else '')
        log_action(user['id'], 'preferences_updated', details, get_client_ip())
        
        return jsonify({
            'success': True,
            'version': new_version,
            'message': 'Preferences saved successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@preferences_bp.route('/preferences', methods=['PATCH'])
@require_auth
@rate_limit(max_requests=300, window_minutes=1)
def update_preferences():
    """
    Update specific preferences (partial update).
    Merges provided preferences with existing ones.
    Supports optimistic locking with version parameter.
    
    Request body:
    {
        "preferences": { 
            "dashboard": {
                "layout": [...]
            }
        },
        "version": 5  // optional, for optimistic locking
    }
    """
    try:
        user = request.current_user  # type: ignore
        data = request.get_json()
        
        if not data or 'preferences' not in data:
            return jsonify({
                'success': False,
                'error': 'Preferences object required'
            }), 400
        
        preference_updates = data['preferences']
        expected_version = data.get('version')
        session_id = data.get('session_id')
        impersonated_user_id = data.get('impersonated_user_id')
        
        # Determine target user (support impersonation)
        target_user_id = user['id']
        if impersonated_user_id and user['role'] == 'admin':
            target_user_id = impersonated_user_id
            logger.info(f'🎭 IMPERSONATION - Admin {user["id"]} updating as user {target_user_id}')
        
        new_version = update_user_preferences(target_user_id, preference_updates, expected_version)
        
        if new_version is None:
            return jsonify({
                'success': False,
                'error': 'Version conflict detected. Please refresh and try again.',
                'conflict': True
            }), 409
        
        # Client will trigger broadcast via WebSocket after receiving save response
        # Log with more detail about what changed
        pref_keys = list(preference_updates.keys()) if isinstance(preference_updates, dict) else ['unknown']
        details = f'Updated preferences: {", ".join(pref_keys[:5])}' + (' and more' if len(pref_keys) > 5 else '')
        log_action(target_user_id, 'preferences_updated', details, get_client_ip())
        
        return jsonify({
            'success': True,
            'version': new_version,
            'message': 'Preferences updated successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@preferences_bp.route('/preferences/<path:preference_key>', methods=['DELETE'])
@require_auth
@rate_limit(max_requests=100, window_minutes=1)
def delete_preference(preference_key):
    """
    Delete a specific preference by key.
    Supports dot notation for nested keys (e.g., 'dashboard.layout').
    
    Example: DELETE /api/preferences/dashboard.layout
    """
    try:
        user = request.current_user  # type: ignore
        
        new_version = delete_user_preferences(user['id'], preference_key)
        
        log_action(user['id'], 'preferences_deleted', f'Deleted preference: {preference_key}', get_client_ip())
        
        return jsonify({
            'success': True,
            'version': new_version,
            'message': f'Preference {preference_key} deleted successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@preferences_bp.route('/preferences/batch-delete', methods=['POST'])
@require_auth
@rate_limit(max_requests=100, window_minutes=1)
def batch_delete_preferences():
    """
    Delete multiple preferences at once.
    
    Request body:
    {
        "keys": ["dashboard.layout", "theme.color", ...]
    }
    """
    try:
        user = request.current_user  # type: ignore
        data = request.get_json()
        
        if not data or 'keys' not in data:
            return jsonify({
                'success': False,
                'error': 'Keys array required'
            }), 400
        
        keys = data['keys']
        
        if not isinstance(keys, list):
            return jsonify({
                'success': False,
                'error': 'Keys must be an array'
            }), 400
        
        new_version = delete_user_preferences(user['id'], keys)
        
        log_action(user['id'], 'preferences_deleted', f'Deleted {len(keys)} preferences', get_client_ip())
        
        return jsonify({
            'success': True,
            'version': new_version,
            'message': f'{len(keys)} preferences deleted successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

