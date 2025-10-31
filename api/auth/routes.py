"""
Authentication routes for Microsoft OAuth and device pairing.
"""

import os
import msal
import requests
from flask import Blueprint, request, jsonify, redirect
from datetime import datetime, timedelta
from auth.database import (
    create_user,
    get_user_by_email,
    create_session,
    get_session_by_refresh_token,
    delete_session,
    delete_all_user_sessions,
    update_last_login,
    log_action,
    create_device_code,
    get_device_code_by_user_code,
    get_device_code_by_device_code,
    pair_device_code,
    create_device_session,
    get_device_session_by_refresh_token,
    cleanup_expired_sessions,
    cleanup_expired_device_codes
)
from auth.middleware import (
    generate_access_token,
    generate_refresh_token,
    decode_token,
    require_auth,
    validate_domain,
    get_client_ip,
    get_user_agent,
    rate_limit
)

auth_bp = Blueprint('auth', __name__)

# Microsoft OAuth configuration
CLIENT_ID = os.getenv('MICROSOFT_CLIENT_ID')
CLIENT_SECRET = os.getenv('MICROSOFT_CLIENT_SECRET')
TENANT_ID = os.getenv('MICROSOFT_TENANT_ID')
REDIRECT_URI = os.getenv('MICROSOFT_REDIRECT_URI')
AUTHORITY = f'https://login.microsoftonline.com/{TENANT_ID}'
SCOPE = ['User.Read']

def get_msal_app():
    """Get MSAL confidential client application."""
    return msal.ConfidentialClientApplication(
        CLIENT_ID,
        authority=AUTHORITY,
        client_credential=CLIENT_SECRET
    )

@auth_bp.route('/login', methods=['GET'])
@rate_limit(max_requests=100, window_minutes=1)
def login():
    """Initiate Microsoft OAuth login flow."""
    try:
        cleanup_expired_sessions()
        
        msal_app = get_msal_app()
        
        # Get state parameter from query string
        state = request.args.get('state')
        
        auth_url = msal_app.get_authorization_request_url(
            SCOPE,
            redirect_uri=REDIRECT_URI,
            state=state
        )
        
        return jsonify({
            'success': True,
            'auth_url': auth_url
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/callback', methods=['GET'])
@rate_limit(max_requests=100, window_minutes=1)
def callback():
    """Handle Microsoft OAuth callback."""
    try:
        code = request.args.get('code')
        if not code:
            return jsonify({
                'success': False,
                'error': 'No authorization code provided'
            }), 400
        
        # Exchange code for tokens
        msal_app = get_msal_app()
        result = msal_app.acquire_token_by_authorization_code(
            code,
            scopes=SCOPE,
            redirect_uri=REDIRECT_URI
        )
        
        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result.get('error_description', 'Authentication failed')
            }), 400
        
        # Get user info from Microsoft Graph
        access_token = result['access_token']
        graph_response = requests.get(
            'https://graph.microsoft.com/v1.0/me',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        if graph_response.status_code != 200:
            return jsonify({
                'success': False,
                'error': 'Failed to fetch user information'
            }), 400
        
        user_info = graph_response.json()
        email = user_info.get('mail') or user_info.get('userPrincipalName')
        name = user_info.get('displayName', '')
        microsoft_id = user_info.get('id')
        
        # Create or update user
        user_id = create_user(email, name, microsoft_id)
        user = get_user_by_email(email)
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'Failed to create user account'
            }), 500
        
        if not user['is_active']:
            return jsonify({
                'success': False,
                'error': 'Your account has been deactivated. Please contact an administrator.'
            }), 403
        
        # Generate tokens
        access_token_jwt = generate_access_token(user['id'], user['email'], user['role'])
        refresh_token_jwt = generate_refresh_token(user['id'], user['email'])
        
        # Create session
        expires_at = datetime.now() + timedelta(days=30)
        create_session(
            user['id'],
            refresh_token_jwt,
            expires_at,
            get_user_agent(),
            get_client_ip()
        )
        
        # Update last login
        update_last_login(user['id'])
        log_action(user['id'], 'login', 'OAuth login successful', get_client_ip())
        
        # Clean up old sessions and device codes
        cleanup_expired_sessions()
        cleanup_expired_device_codes()
        
        return jsonify({
            'success': True,
            'access_token': access_token_jwt,
            'refresh_token': refresh_token_jwt,
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

@auth_bp.route('/refresh', methods=['POST'])
@rate_limit(max_requests=100, window_minutes=1)
def refresh():
    """Refresh access token using refresh token."""
    try:
        data = request.get_json()
        refresh_token = data.get('refresh_token')
        
        if not refresh_token:
            return jsonify({
                'success': False,
                'error': 'Refresh token required'
            }), 400
        
        # Decode refresh token
        payload = decode_token(refresh_token)
        if not payload or payload.get('type') != 'refresh':
            return jsonify({
                'success': False,
                'error': 'Invalid refresh token'
            }), 401
        
        # Check if session exists (regular or device)
        session = get_session_by_refresh_token(refresh_token)
        if not session:
            session = get_device_session_by_refresh_token(refresh_token)
        
        if not session:
            return jsonify({
                'success': False,
                'error': 'Session not found'
            }), 401
        
        # Get user
        user_id = payload['user_id']
        from auth.database import get_user_by_id
        user = get_user_by_id(user_id)
        
        if not user or not user['is_active']:
            return jsonify({
                'success': False,
                'error': 'User not found or inactive'
            }), 401
        
        # Generate new access token
        access_token = generate_access_token(user['id'], user['email'], user['role'])
        
        return jsonify({
            'success': True,
            'access_token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    """Logout and invalidate refresh token."""
    try:
        data = request.get_json()
        refresh_token = data.get('refresh_token') if data else None
        
        if refresh_token:
            delete_session(refresh_token)
        
        user = request.current_user  # type: ignore
        log_action(user['id'], 'logout', 'User logged out', get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    """Get current user information."""
    try:
        user = request.current_user  # type: ignore
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'role': user['role'],
                'created_at': user['created_at'],
                'last_login': user['last_login']
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@auth_bp.route('/sessions', methods=['GET'])
@require_auth
def get_sessions():
    """Get all active sessions for current user."""
    try:
        user = request.current_user  # type: ignore
        from auth.database import get_db
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, created_at, last_used, user_agent, ip_address 
            FROM sessions 
            WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
            ORDER BY last_used DESC
        ''', (user['id'],))
        sessions = [dict(row) for row in cursor.fetchall()]
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

@auth_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@require_auth
def delete_session_by_id(session_id):
    """Delete a specific session."""
    try:
        user = request.current_user  # type: ignore
        from auth.database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        # Make sure session belongs to user
        cursor.execute('SELECT refresh_token FROM sessions WHERE id = ? AND user_id = ?', (session_id, user['id']))
        session = cursor.fetchone()
        
        if not session:
            return jsonify({
                'success': False,
                'error': 'Session not found'
            }), 404
        
        delete_session(session[0])
        conn.close()
        
        log_action(user['id'], 'session_deleted', f'Session {session_id} deleted', get_client_ip())
        
        return jsonify({
            'success': True,
            'message': 'Session deleted'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
