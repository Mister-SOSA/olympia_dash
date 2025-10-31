"""
SQLite database for authentication and user management.
This is separate from the read-only SQL Server database.
"""

import sqlite3
import os
from datetime import datetime, timedelta
import secrets
from pathlib import Path

# Use /app/data in Docker, local path otherwise
DB_DIR = Path('/app/data') if os.path.exists('/app/data') else Path(__file__).parent.parent
DB_PATH = DB_DIR / 'auth.db'

# Ensure directory exists
DB_DIR.mkdir(parents=True, exist_ok=True)

def get_db():
    """Get a database connection."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the authentication database with all required tables."""
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            microsoft_id TEXT UNIQUE,
            role TEXT DEFAULT 'user',
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    ''')
    
    # Sessions table for JWT refresh tokens
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            refresh_token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_agent TEXT,
            ip_address TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Device codes table for TV pairing
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS device_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_code TEXT UNIQUE NOT NULL,
            user_code TEXT UNIQUE NOT NULL,
            user_id INTEGER,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            paired_at TIMESTAMP,
            device_name TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Device sessions table for paired devices
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS device_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_code_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            refresh_token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            device_name TEXT,
            FOREIGN KEY (device_code_id) REFERENCES device_codes(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Permissions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            permission TEXT NOT NULL,
            granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            granted_by INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE(user_id, permission)
        )
    ''')
    
    # Audit log table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    ''')
    
    # Rate limiting table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rate_limits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            identifier TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            count INTEGER DEFAULT 1,
            window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(identifier, endpoint)
        )
    ''')
    
    # Create indexes for better performance
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_device_codes_user_code ON device_codes(user_code)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON device_sessions(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON permissions(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, endpoint)')
    
    conn.commit()
    conn.close()

# User management functions
def create_user(email, name, microsoft_id, role='user'):
    """Create a new user."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (email, name, microsoft_id, role)
            VALUES (?, ?, ?, ?)
        ''', (email, name, microsoft_id, role))
        conn.commit()
        user_id = cursor.lastrowid
        return user_id
    except sqlite3.IntegrityError:
        # User already exists, update their info
        cursor.execute('''
            UPDATE users 
            SET name = ?, microsoft_id = ?, last_login = CURRENT_TIMESTAMP
            WHERE email = ?
        ''', (name, microsoft_id, email))
        conn.commit()
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        return cursor.fetchone()[0]
    finally:
        conn.close()

def get_user_by_email(email):
    """Get user by email."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None

def get_user_by_id(user_id):
    """Get user by ID."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None

def update_last_login(user_id):
    """Update user's last login timestamp."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    ''', (user_id,))
    conn.commit()
    conn.close()

def get_all_users():
    """Get all users."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users ORDER BY created_at DESC')
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return users

def update_user_role(user_id, role):
    """Update user's role."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET role = ? WHERE id = ?', (role, user_id))
    conn.commit()
    conn.close()

def toggle_user_active(user_id):
    """Toggle user active status."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET is_active = NOT is_active WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()

# Session management functions
def create_session(user_id, refresh_token, expires_at, user_agent=None, ip_address=None):
    """Create a new session."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO sessions (user_id, refresh_token, expires_at, user_agent, ip_address)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_id, refresh_token, expires_at, user_agent, ip_address))
    conn.commit()
    session_id = cursor.lastrowid
    conn.close()
    return session_id

def get_session_by_refresh_token(refresh_token):
    """Get session by refresh token."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM sessions WHERE refresh_token = ?', (refresh_token,))
    session = cursor.fetchone()
    conn.close()
    return dict(session) if session else None

def delete_session(refresh_token):
    """Delete a session."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM sessions WHERE refresh_token = ?', (refresh_token,))
    conn.commit()
    conn.close()

def delete_all_user_sessions(user_id):
    """Delete all sessions for a user."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM sessions WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()

def cleanup_expired_sessions():
    """Remove expired sessions."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP')
    conn.commit()
    conn.close()

# Device pairing functions
def generate_device_code():
    """Generate a device code and user code pair."""
    device_code = secrets.token_urlsafe(32)
    # Generate a 6-character alphanumeric code (easier to type)
    user_code = ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(6))
    return device_code, user_code

def create_device_code(device_name=None):
    """Create a new device code for pairing."""
    device_code, user_code = generate_device_code()
    expires_at = datetime.now() + timedelta(minutes=15)  # Code expires in 15 minutes
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO device_codes (device_code, user_code, expires_at, device_name)
        VALUES (?, ?, ?, ?)
    ''', (device_code, user_code, expires_at, device_name))
    conn.commit()
    code_id = cursor.lastrowid
    conn.close()
    
    return {
        'device_code': device_code,
        'user_code': user_code,
        'expires_at': expires_at.isoformat(),
        'id': code_id
    }

def get_device_code_by_user_code(user_code):
    """Get device code by user code."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM device_codes WHERE user_code = ?', (user_code,))
    code = cursor.fetchone()
    conn.close()
    return dict(code) if code else None

def get_device_code_by_device_code(device_code):
    """Get device code by device code."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM device_codes WHERE device_code = ?', (device_code,))
    code = cursor.fetchone()
    conn.close()
    return dict(code) if code else None

def pair_device_code(user_code, user_id):
    """Pair a device code with a user."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE device_codes 
        SET user_id = ?, paired_at = CURRENT_TIMESTAMP
        WHERE user_code = ? AND expires_at > CURRENT_TIMESTAMP AND user_id IS NULL
    ''', (user_id, user_code))
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    return success

def create_device_session(device_code_id, user_id, refresh_token, expires_at, device_name=None):
    """Create a device session after successful pairing."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO device_sessions (device_code_id, user_id, refresh_token, expires_at, device_name)
        VALUES (?, ?, ?, ?, ?)
    ''', (device_code_id, user_id, refresh_token, expires_at, device_name))
    conn.commit()
    session_id = cursor.lastrowid
    conn.close()
    return session_id

def get_device_session_by_refresh_token(refresh_token):
    """Get device session by refresh token."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM device_sessions WHERE refresh_token = ?', (refresh_token,))
    session = cursor.fetchone()
    conn.close()
    return dict(session) if session else None

def cleanup_expired_device_codes():
    """Remove expired device codes."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM device_codes WHERE expires_at < CURRENT_TIMESTAMP AND user_id IS NULL')
    conn.commit()
    conn.close()

# Permissions functions
def grant_permission(user_id, permission, granted_by=None):
    """Grant a permission to a user."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO permissions (user_id, permission, granted_by)
            VALUES (?, ?, ?)
        ''', (user_id, permission, granted_by))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def revoke_permission(user_id, permission):
    """Revoke a permission from a user."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM permissions WHERE user_id = ? AND permission = ?', (user_id, permission))
    conn.commit()
    conn.close()

def get_user_permissions(user_id):
    """Get all permissions for a user."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT permission FROM permissions WHERE user_id = ?', (user_id,))
    permissions = [row[0] for row in cursor.fetchall()]
    conn.close()
    return permissions

def has_permission(user_id, permission):
    """Check if user has a specific permission."""
    permissions = get_user_permissions(user_id)
    return permission in permissions

# Audit log functions
def log_action(user_id, action, details=None, ip_address=None):
    """Log an action to the audit log."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO audit_log (user_id, action, details, ip_address)
        VALUES (?, ?, ?, ?)
    ''', (user_id, action, details, ip_address))
    conn.commit()
    conn.close()

def get_audit_logs(limit=100, user_id=None):
    """Get audit logs."""
    conn = get_db()
    cursor = conn.cursor()
    if user_id:
        cursor.execute('''
            SELECT * FROM audit_log WHERE user_id = ? 
            ORDER BY created_at DESC LIMIT ?
        ''', (user_id, limit))
    else:
        cursor.execute('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?', (limit,))
    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return logs

# Rate limiting functions
def check_rate_limit(identifier, endpoint, max_requests=10, window_minutes=1):
    """Check if request should be rate limited."""
    conn = get_db()
    cursor = conn.cursor()
    
    window_start = datetime.now() - timedelta(minutes=window_minutes)
    
    cursor.execute('''
        SELECT count, window_start FROM rate_limits 
        WHERE identifier = ? AND endpoint = ?
    ''', (identifier, endpoint))
    
    result = cursor.fetchone()
    
    if result:
        count, stored_window = result
        count = int(count)  # Convert to int
        stored_window = datetime.fromisoformat(stored_window)
        
        if stored_window < window_start:
            # Reset window
            cursor.execute('''
                UPDATE rate_limits 
                SET count = 1, window_start = CURRENT_TIMESTAMP
                WHERE identifier = ? AND endpoint = ?
            ''', (identifier, endpoint))
            conn.commit()
            conn.close()
            return False
        elif count >= max_requests:
            conn.close()
            return True
        else:
            cursor.execute('''
                UPDATE rate_limits 
                SET count = count + 1
                WHERE identifier = ? AND endpoint = ?
            ''', (identifier, endpoint))
            conn.commit()
            conn.close()
            return False
    else:
        cursor.execute('''
            INSERT INTO rate_limits (identifier, endpoint, count)
            VALUES (?, ?, 1)
        ''', (identifier, endpoint))
        conn.commit()
        conn.close()
        return False

# Initialize database on import
init_db()
