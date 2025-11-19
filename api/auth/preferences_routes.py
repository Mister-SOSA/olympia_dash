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

# Get socketio instance
_socketio = None
def get_socketio():
    global _socketio
    if _socketio is None:
        from app import socketio
        _socketio = socketio
    return _socketio

def broadcast_preferences(user_id, preferences, version, origin_session_id=None):
    """Broadcast preference changes to all sessions for this user"""
    socketio = get_socketio()
    
    room = f'user_{user_id}'
    payload = {
        'preferences': preferences,
        'version': version,
        'origin_session_id': origin_session_id
    }
    
    logger.info(f'📡 Broadcasting to room {room}, version {version}')
    
    try:
        # Try different approaches
        # Approach 1: Standard emit
        socketio.emit('preferences_updated', payload, room=room, namespace='/')
        logger.info(f'✅ Method 1: Standard emit done')
        
        # Approach 2: Server-level emit
        socketio.server.emit('preferences_updated', payload, room=room, namespace='/')
        logger.info(f'✅ Method 2: Server emit done')
    except Exception as e:
        logger.error(f'❌ Broadcast error: {e}')
        import traceback
        traceback.print_exc()

@preferences_bp.route('/preferences', methods=['GET'])
@require_auth
@rate_limit(max_requests=300, window_minutes=1)
def get_preferences():
    """
    Get all user preferences.
    Returns preferences object with version and timestamp.
    """
    try:
        user = request.current_user  # type: ignore
        result = get_user_preferences(user['id'])
        
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
        
        logger.info(f'💾 SAVE REQUEST - User: {user["id"]}, Session: {session_id[:8] if session_id else "none"}..., Version: {expected_version}')
        
        new_version = set_user_preferences(user['id'], preferences, expected_version)
        
        if new_version is None:
            logger.warning('⚠️ Version conflict!')
            return jsonify({
                'success': False,
                'error': 'Version conflict detected. Please refresh and try again.',
                'conflict': True
            }), 409
        
        logger.info(f'✅ SAVED - New version: {new_version}')
        logger.info(f'🔊 CALLING broadcast_preferences...')
        
        # Broadcast to all other sessions
        broadcast_preferences(user['id'], preferences, new_version, session_id)
        
        log_action(user['id'], 'preferences_updated', 'Full preferences update', get_client_ip())
        
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
        
        new_version = update_user_preferences(user['id'], preference_updates, expected_version)
        
        if new_version is None:
            return jsonify({
                'success': False,
                'error': 'Version conflict detected. Please refresh and try again.',
                'conflict': True
            }), 409
        
        # Get full preferences and broadcast
        result = get_user_preferences(user['id'])
        broadcast_preferences(user['id'], result['preferences'], new_version, session_id)
        
        log_action(user['id'], 'preferences_updated', 'Partial preferences update', get_client_ip())
        
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

