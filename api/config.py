"""
Configuration management for Olympia Dashboard API.

OLYMPIA SUITE UNIFIED AUTH
==========================
This config follows the same patterns as all Olympia Suite apps.
Critical: JWT_SECRET must be the same across all suite apps for SSO to work.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ========================================================================
    # OLYMPIA SUITE JWT CONFIGURATION (CRITICAL FOR SSO)
    # These values MUST be identical across olympia_dash and OlyChat
    # ========================================================================
    JWT_SECRET = os.getenv('JWT_SECRET')
    if not JWT_SECRET:
        raise ValueError(
            "JWT_SECRET environment variable is required for Olympia Suite auth. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    JWT_ALGORITHM = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES = 15
    REFRESH_TOKEN_EXPIRE_DAYS = 30
    
    # ========================================================================
    # SQL Server Configuration
    # ========================================================================
    SQL_SERVER_CONFIG = {
        'server': os.getenv('SQL_SERVER', ''),
        'database': os.getenv('SQL_DATABASE', ''),
        'username': os.getenv('SQL_USERNAME', ''),
        'password': os.getenv('SQL_PASSWORD', ''),
        'driver': os.getenv('SQL_DRIVER', ''),
        'trust_server_certificate': os.getenv('SQL_TRUST_CERT', '')
    }
    
    # ========================================================================
    # Microsoft OAuth Configuration
    # Recommendation: Use a SINGLE Azure AD app registration with multiple
    # redirect URIs for all Olympia Suite apps
    # ========================================================================
    MICROSOFT_CLIENT_ID = os.getenv('MICROSOFT_CLIENT_ID')
    MICROSOFT_CLIENT_SECRET = os.getenv('MICROSOFT_CLIENT_SECRET')
    MICROSOFT_TENANT_ID = os.getenv('MICROSOFT_TENANT_ID')
    MICROSOFT_REDIRECT_URI = os.getenv('MICROSOFT_REDIRECT_URI')
    ALLOWED_DOMAINS = os.getenv('ALLOWED_DOMAINS', '')
    
    # ========================================================================
    # CORS Configuration
    # Include all Olympia Suite app origins
    # ========================================================================
    _cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000')
    CORS_ORIGINS = [origin.strip() for origin in _cors_origins.split(',') if origin.strip()]
