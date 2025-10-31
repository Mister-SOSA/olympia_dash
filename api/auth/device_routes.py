"""
Device pairing routes for TV dashboards.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from auth.database import (
    create_device_code,
    get_device_code_by_user_code,
    get_device_code_by_device_code,
    pair_device_code,
    create_device_session,
    get_user_by_id,
    log_action
)
from auth.middleware import (
    generate_access_token,
    generate_refresh_token,
    require_auth,
    get_client_ip,
    rate_limit
)

device_bp = Blueprint('device', __name__)

@device_bp.route('/code', methods=['POST'])
@rate_limit(max_requests=100, window_minutes=1)
def request_device_code():
    """
    Request a new device code for pairing.
    This is called by the TV dashboard to get a code to display.
    """
    try:
        data = request.get_json() or {}
        device_name = data.get('device_name', 'Unknown Device')
        
        # Generate device code
        code_data = create_device_code(device_name)
        
        return jsonify({
            'success': True,
            'device_code': code_data['device_code'],
            'user_code': code_data['user_code'],
            'expires_at': code_data['expires_at'],
            'verification_url': '/pair',  # Frontend route
            'interval': 5  # Seconds to wait between polling
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@device_bp.route('/pair', methods=['POST'])
@require_auth
@rate_limit(max_requests=100, window_minutes=1)
def pair_device():
    """
    Pair a device code with the authenticated user.
    This is called from the /pair page after user authenticates.
    """
    try:
        user = request.current_user  # type: ignore
        data = request.get_json()
        user_code = data.get('user_code', '').upper()
        
        if not user_code:
            return jsonify({
                'success': False,
                'error': 'User code required'
            }), 400
        
        # Get device code
        device_code_data = get_device_code_by_user_code(user_code)
        
        if not device_code_data:
            return jsonify({
                'success': False,
                'error': 'Invalid code'
            }), 404
        
        # Check if expired
        expires_at = datetime.fromisoformat(device_code_data['expires_at'])
        if expires_at < datetime.now():
            return jsonify({
                'success': False,
                'error': 'Code has expired'
            }), 400
        
        # Check if already paired
        if device_code_data['user_id']:
            return jsonify({
                'success': False,
                'error': 'Code has already been used'
            }), 400
        
        # Pair the device
        success = pair_device_code(user_code, user['id'])
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Failed to pair device'
            }), 500
        
        log_action(user['id'], 'device_paired', f'Device paired with code {user_code}', get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'Device paired successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@device_bp.route('/poll', methods=['POST'])
@rate_limit(max_requests=1000, window_minutes=1)  # Very high limit for polling
def poll_device_code():
    """
    Poll to check if device code has been paired.
    This is called by the TV dashboard to check if user has paired the device.
    """
    try:
        data = request.get_json()
        device_code = data.get('device_code')
        
        if not device_code:
            return jsonify({
                'success': False,
                'error': 'Device code required'
            }), 400
        
        # Get device code
        device_code_data = get_device_code_by_device_code(device_code)
        
        if not device_code_data:
            return jsonify({
                'success': False,
                'error': 'Invalid device code'
            }), 404
        
        # Check if expired
        expires_at = datetime.fromisoformat(device_code_data['expires_at'])
        if expires_at < datetime.now():
            return jsonify({
                'success': False,
                'error': 'Code has expired',
                'status': 'expired'
            }), 400
        
        # Check if paired
        if not device_code_data['user_id']:
            return jsonify({
                'success': True,
                'status': 'pending',
                'message': 'Waiting for user to pair device'
            }), 200
        
        # Device has been paired, generate tokens
        user = get_user_by_id(device_code_data['user_id'])
        
        if not user or not user['is_active']:
            return jsonify({
                'success': False,
                'error': 'User not found or inactive'
            }), 401
        
        # Generate tokens
        access_token = generate_access_token(user['id'], user['email'], user['role'])
        refresh_token = generate_refresh_token(user['id'], user['email'])
        
        # Create device session
        expires_at = datetime.now() + timedelta(days=30)
        create_device_session(
            device_code_data['id'],
            user['id'],
            refresh_token,
            expires_at,
            device_code_data['device_name']
        )
        
        log_action(user['id'], 'device_auth', 'Device authenticated successfully', get_client_ip())
        
        return jsonify({
            'success': True,
            'status': 'authorized',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'role': user['role']
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@device_bp.route('/sessions', methods=['GET'])
@require_auth
def get_device_sessions():
    """Get all active device sessions for current user."""
    try:
        user = request.current_user  # type: ignore
        from auth.database import get_db
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, created_at, last_used, device_name 
            FROM device_sessions 
            WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
            ORDER BY last_used DESC
        ''', (user['id'],))
        sessions = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({
            'success': True,
            'device_sessions': sessions
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@device_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@require_auth
def delete_device_session(session_id):
    """Delete a specific device session."""
    try:
        user = request.current_user  # type: ignore
        from auth.database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        # Make sure session belongs to user
        cursor.execute('SELECT id FROM device_sessions WHERE id = ? AND user_id = ?', (session_id, user['id']))
        session = cursor.fetchone()
        
        if not session:
            return jsonify({
                'success': False,
                'error': 'Device session not found'
            }), 404
        
        cursor.execute('DELETE FROM device_sessions WHERE id = ?', (session_id,))
        conn.commit()
        conn.close()
        
        log_action(user['id'], 'device_session_deleted', f'Device session {session_id} deleted', get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'Device session deleted'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
