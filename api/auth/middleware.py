"""
Authentication middleware and utilities.
"""

import jwt
import os
from datetime import datetime, timedelta
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

# JWT configuration
JWT_SECRET = os.getenv('JWT_SECRET', os.urandom(32).hex())
JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 30

def generate_access_token(user_id, email, role):
    """Generate a JWT access token."""
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'type': 'access',
        'exp': datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_refresh_token(user_id, email):
    """Generate a JWT refresh token."""
    payload = {
        'user_id': user_id,
        'email': email,
        'type': 'refresh',
        'exp': datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token):
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
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
