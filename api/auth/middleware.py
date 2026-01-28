"""
Authentication middleware and utilities.

OLYMPIA SUITE UNIFIED AUTH
==========================
This middleware is part of the Olympia Suite unified authentication system.
All Olympia apps (dash, chat, etc.) use the same JWT structure and secrets,
enabling seamless SSO across the suite.

Requirements for suite-wide auth:
1. Same JWT_SECRET environment variable across all apps
2. Same JWT_ALGORITHM (HS256)
3. Same token claims structure (user_id, email, role, type, iss, aud)
"""

import jwt
import os
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify
from auth.database import (
    get_user_by_id, 
    get_session_by_refresh_token,
    get_device_session_by_refresh_token,
    update_last_login,
    log_action,
    has_permission,
    check_rate_limit
)

# ============================================================================
# OLYMPIA SUITE JWT CONFIGURATION
# These values MUST match across all Olympia Suite apps for SSO to work
# ============================================================================
JWT_SECRET = os.getenv('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError(
        "JWT_SECRET environment variable is required for Olympia Suite auth. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 30

# Suite-wide issuer and audience claims
JWT_ISSUER = 'olympia-suite'
JWT_AUDIENCE = ['olympia-dash', 'olympia-chat']  # All valid suite apps


def generate_access_token(user_id, email, role, app_id='olympia-dash'):
    """
    Generate a JWT access token valid across all Olympia Suite apps.
    
    Args:
        user_id: User's database ID
        email: User's email
        role: User's role (user/admin)
        app_id: The app generating this token (for audit purposes)
    """
    now = datetime.now(timezone.utc)
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'type': 'access',
        'iss': JWT_ISSUER,           # Issuer: identifies this as an Olympia Suite token
        'aud': JWT_AUDIENCE,         # Audience: all suite apps can validate this token
        'app': app_id,               # Which app originally issued this token
        'exp': now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        'iat': now,
        'nbf': now,                  # Not valid before now
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def generate_refresh_token(user_id, email, app_id='olympia-dash'):
    """
    Generate a JWT refresh token valid across all Olympia Suite apps.
    """
    now = datetime.now(timezone.utc)
    payload = {
        'user_id': user_id,
        'email': email,
        'type': 'refresh',
        'iss': JWT_ISSUER,
        'aud': JWT_AUDIENCE,
        'app': app_id,
        'exp': now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        'iat': now,
        'nbf': now,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token, verify_audience=True):
    """
    Decode and verify a JWT token from any Olympia Suite app.
    
    Args:
        token: The JWT token string
        verify_audience: Whether to verify the audience claim (default True)
    
    Returns:
        The decoded payload dict, or None if invalid
    """
    try:
        decode_options = {'verify_aud': verify_audience}
        
        payload = jwt.decode(
            token, 
            JWT_SECRET, 
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE if verify_audience else None,
            options=decode_options
        )
        return payload
    except jwt.ExpiredSignatureError:
        print(f"[Auth] Token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"[Auth] Invalid token: {e}")
        return None

def get_token_from_header():
    """Extract token from Authorization header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None
    
    return parts[1]

def get_current_user():
    """Get the current authenticated user from the request."""
    token = get_token_from_header()
    if not token:
        return None
    
    payload = decode_token(token)
    if not payload or payload.get('type') != 'access':
        return None
    
    user = get_user_by_id(payload['user_id'])
    if not user or not user['is_active']:
        return None
    
    return user

def require_auth(f):
    """Decorator to require authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'error': 'Authentication required'
            }), 401
        
        # Add user to request context
        request.current_user = user  # type: ignore
        return f(*args, **kwargs)
    
    return decorated_function

def require_role(*roles):
    """Decorator to require specific role(s)."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({
                    'success': False,
                    'error': 'Authentication required'
                }), 401
            
            if user['role'] not in roles:
                return jsonify({
                    'success': False,
                    'error': 'Insufficient permissions'
                }), 403
            
            request.current_user = user  # type: ignore
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def require_permission(permission):
    """Decorator to require a specific permission."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({
                    'success': False,
                    'error': 'Authentication required'
                }), 401
            
            # Admins have all permissions
            if user['role'] == 'admin':
                request.current_user = user  # type: ignore
                return f(*args, **kwargs)
            
            if not has_permission(user['id'], permission):
                return jsonify({
                    'success': False,
                    'error': f'Permission required: {permission}'
                }), 403
            
            request.current_user = user  # type: ignore
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def rate_limit(max_requests=10, window_minutes=1):
    """Decorator to rate limit requests."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Use IP address or user ID as identifier
            user = get_current_user()
            identifier = str(user['id']) if user else request.remote_addr
            endpoint = request.endpoint
            
            if check_rate_limit(identifier, endpoint, max_requests, window_minutes):
                return jsonify({
                    'success': False,
                    'error': 'Rate limit exceeded. Please try again later.'
                }), 429
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def validate_domain(email):
    """Validate that email is from allowed domain."""
    allowed_domains = os.getenv('ALLOWED_DOMAINS', '').split(',')
    if not allowed_domains or not allowed_domains[0]:
        return True  # No domain restriction
    
    email_domain = email.split('@')[1] if '@' in email else ''
    return email_domain in allowed_domains

def get_client_ip():
    """Get the client's IP address."""
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        return forwarded_for.split(',')[0]
    return request.remote_addr

def get_user_agent():
    """Get the user agent string."""
    return request.headers.get('User-Agent', '')
