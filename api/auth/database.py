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
    
    # User preferences table - flexible JSON storage for unlimited preferences
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_preferences (
            user_id INTEGER PRIMARY KEY,
            preferences TEXT NOT NULL DEFAULT '{}',
            version INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # User groups table for organizing users
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            color TEXT DEFAULT '#3b82f6',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
    ''')
    
    # Group membership table (many-to-many relationship)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS group_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            added_by INTEGER,
            FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE(group_id, user_id)
        )
    ''')
    
    # Widget permissions for individual users
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS widget_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            widget_id TEXT NOT NULL,
            access_level TEXT DEFAULT 'view',
            granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            granted_by INTEGER,
            expires_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE(user_id, widget_id)
        )
    ''')
    
    # Widget permissions for groups
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS group_widget_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            widget_id TEXT NOT NULL,
            access_level TEXT DEFAULT 'view',
            granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            granted_by INTEGER,
            expires_at TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
            FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE(group_id, widget_id)
        )
    ''')
    
    # Role permissions table for system-wide capabilities
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS role_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            permission TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(role, permission)
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
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON user_preferences(updated_at)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_widget_permissions_user_id ON widget_permissions(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_group_widget_permissions_group_id ON group_widget_permissions(group_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role)')
    
    conn.commit()
    conn.close()

# User management functions
def create_user(email, name, microsoft_id, role='user'):
    """Create a new user. First user becomes admin automatically."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Check if this is the first user
        cursor.execute('SELECT COUNT(*) FROM users')
        user_count = cursor.fetchone()[0]
        
        # First user gets admin role
        if user_count == 0:
            role = 'admin'
        
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

# User preferences functions
import json

def get_user_preferences(user_id):
    """Get all preferences for a user. Returns empty dict if no preferences exist."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT preferences, version, updated_at 
        FROM user_preferences 
        WHERE user_id = ?
    ''', (user_id,))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        try:
            prefs = json.loads(result[0])
            return {
                'preferences': prefs,
                'version': result[1],
                'updated_at': result[2]
            }
        except json.JSONDecodeError:
            return {'preferences': {}, 'version': 1, 'updated_at': None}
    
    return {'preferences': {}, 'version': 0, 'updated_at': None}

def set_user_preferences(user_id, preferences, expected_version=None):
    """
    Set all preferences for a user. 
    Uses optimistic locking with version if expected_version is provided.
    Returns the new version number, or None if version conflict occurred.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        preferences_json = json.dumps(preferences)
        
        # Check if preferences exist
        cursor.execute('SELECT version FROM user_preferences WHERE user_id = ?', (user_id,))
        result = cursor.fetchone()
        
        if result:
            current_version = result[0]
            
            # Check for version conflict if expected_version provided
            if expected_version is not None and current_version != expected_version:
                conn.close()
                return None  # Version conflict
            
            new_version = current_version + 1
            cursor.execute('''
                UPDATE user_preferences 
                SET preferences = ?, version = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ''', (preferences_json, new_version, user_id))
        else:
            # Create new preferences record
            new_version = 1
            cursor.execute('''
                INSERT INTO user_preferences (user_id, preferences, version)
                VALUES (?, ?, ?)
            ''', (user_id, preferences_json, new_version))
        
        conn.commit()
        conn.close()
        return new_version
    except Exception as e:
        conn.close()
        raise e

def update_user_preferences(user_id, preference_updates, expected_version=None):
    """
    Update specific preferences for a user (partial update).
    Merges the updates with existing preferences.
    Uses optimistic locking with version if expected_version is provided.
    Returns the new version number, or None if version conflict occurred.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get current preferences
        current = get_user_preferences(user_id)
        current_prefs = current['preferences']
        current_version = current['version']
        
        # Check for version conflict if expected_version provided
        if expected_version is not None and current_version != expected_version:
            conn.close()
            return None  # Version conflict
        
        # Deep merge the preferences
        def deep_merge(base, updates):
            """Recursively merge updates into base."""
            for key, value in updates.items():
                if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                    deep_merge(base[key], value)
                else:
                    base[key] = value
            return base
        
        merged_prefs = deep_merge(current_prefs, preference_updates)
        
        # Save merged preferences
        return set_user_preferences(user_id, merged_prefs, current_version)
    except Exception as e:
        conn.close()
        raise e

def delete_user_preferences(user_id, preference_keys):
    """
    Delete specific preference keys for a user.
    preference_keys can be a string (single key) or list of strings (multiple keys).
    Supports dot notation for nested keys (e.g., 'dashboard.layout').
    Returns the new version number.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get current preferences
        current = get_user_preferences(user_id)
        prefs = current['preferences']
        current_version = current['version']
        
        # Ensure preference_keys is a list
        if isinstance(preference_keys, str):
            preference_keys = [preference_keys]
        
        # Delete each key
        for key in preference_keys:
            if '.' in key:
                # Handle nested keys
                parts = key.split('.')
                obj = prefs
                for part in parts[:-1]:
                    if part in obj and isinstance(obj[part], dict):
                        obj = obj[part]
                    else:
                        break
                else:
                    if parts[-1] in obj:
                        del obj[parts[-1]]
            else:
                # Simple key
                if key in prefs:
                    del prefs[key]
        
        # Save updated preferences
        return set_user_preferences(user_id, prefs, current_version)
    except Exception as e:
        conn.close()
        raise e

# Initialize database on import
init_db()

# ============ User Groups Management ============

def create_group(name, description=None, color='#3b82f6', created_by=None):
    """Create a new user group."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO user_groups (name, description, color, created_by)
            VALUES (?, ?, ?, ?)
        ''', (name, description, color, created_by))
        conn.commit()
        group_id = cursor.lastrowid
        return group_id
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def get_all_groups():
    """Get all user groups."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT 
            g.*,
            COUNT(DISTINCT gm.user_id) as member_count,
            COUNT(DISTINCT gwp.widget_id) as widget_count
        FROM user_groups g
        LEFT JOIN group_members gm ON g.id = gm.group_id
        LEFT JOIN group_widget_permissions gwp ON g.id = gwp.group_id
        GROUP BY g.id
        ORDER BY g.name
    ''')
    groups = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return groups

def get_group_by_id(group_id):
    """Get a group by ID with member details."""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get group info
    cursor.execute('SELECT * FROM user_groups WHERE id = ?', (group_id,))
    group = cursor.fetchone()
    
    if not group:
        conn.close()
        return None
    
    group_dict = dict(group)
    
    # Get members
    cursor.execute('''
        SELECT u.id, u.email, u.name, u.role, gm.added_at
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ?
        ORDER BY u.email
    ''', (group_id,))
    group_dict['members'] = [dict(row) for row in cursor.fetchall()]
    
    # Get widget permissions
    cursor.execute('''
        SELECT widget_id, access_level, granted_at, expires_at
        FROM group_widget_permissions
        WHERE group_id = ?
        ORDER BY widget_id
    ''', (group_id,))
    group_dict['widget_permissions'] = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return group_dict

def update_group(group_id, name=None, description=None, color=None):
    """Update group details."""
    conn = get_db()
    cursor = conn.cursor()
    
    updates = []
    params = []
    
    if name is not None:
        updates.append('name = ?')
        params.append(name)
    if description is not None:
        updates.append('description = ?')
        params.append(description)
    if color is not None:
        updates.append('color = ?')
        params.append(color)
    
    if not updates:
        conn.close()
        return False
    
    updates.append('updated_at = CURRENT_TIMESTAMP')
    params.append(group_id)
    
    query = f"UPDATE user_groups SET {', '.join(updates)} WHERE id = ?"
    cursor.execute(query, params)
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    return success

def delete_group(group_id):
    """Delete a group (cascades to members and permissions)."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM user_groups WHERE id = ?', (group_id,))
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    return success

def add_user_to_group(group_id, user_id, added_by=None):
    """Add a user to a group."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO group_members (group_id, user_id, added_by)
            VALUES (?, ?, ?)
        ''', (group_id, user_id, added_by))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def remove_user_from_group(group_id, user_id):
    """Remove a user from a group."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', (group_id, user_id))
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    return success

def get_user_groups(user_id):
    """Get all groups a user belongs to."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT g.* FROM user_groups g
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = ?
        ORDER BY g.name
    ''', (user_id,))
    groups = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return groups

# ============ Widget Permissions Management ============

def grant_widget_permission(user_id, widget_id, access_level='view', granted_by=None, expires_at=None):
    """Grant widget permission to a specific user."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO widget_permissions (user_id, widget_id, access_level, granted_by, expires_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, widget_id, access_level, granted_by, expires_at))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        # Update existing permission
        cursor.execute('''
            UPDATE widget_permissions 
            SET access_level = ?, granted_by = ?, expires_at = ?, granted_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND widget_id = ?
        ''', (access_level, granted_by, expires_at, user_id, widget_id))
        conn.commit()
        return True
    finally:
        conn.close()

def revoke_widget_permission(user_id, widget_id):
    """Revoke widget permission from a user."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM widget_permissions WHERE user_id = ? AND widget_id = ?', (user_id, widget_id))
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    return success

def grant_group_widget_permission(group_id, widget_id, access_level='view', granted_by=None, expires_at=None):
    """Grant widget permission to a group."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO group_widget_permissions (group_id, widget_id, access_level, granted_by, expires_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (group_id, widget_id, access_level, granted_by, expires_at))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        # Update existing permission
        cursor.execute('''
            UPDATE group_widget_permissions 
            SET access_level = ?, granted_by = ?, expires_at = ?, granted_at = CURRENT_TIMESTAMP
            WHERE group_id = ? AND widget_id = ?
        ''', (access_level, granted_by, expires_at, group_id, widget_id))
        conn.commit()
        return True
    finally:
        conn.close()

def revoke_group_widget_permission(group_id, widget_id):
    """Revoke widget permission from a group."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM group_widget_permissions WHERE group_id = ? AND widget_id = ?', (group_id, widget_id))
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    return success

def get_user_widget_permissions(user_id):
    """
    Get all widget permissions for a user (both direct and through groups).
    Returns a dict mapping widget_id to access_level.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get direct permissions
    cursor.execute('''
        SELECT widget_id, access_level FROM widget_permissions
        WHERE user_id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    ''', (user_id,))
    direct_permissions = {row[0]: row[1] for row in cursor.fetchall()}
    
    # Get group permissions
    cursor.execute('''
        SELECT gwp.widget_id, gwp.access_level 
        FROM group_widget_permissions gwp
        JOIN group_members gm ON gwp.group_id = gm.group_id
        WHERE gm.user_id = ? AND (gwp.expires_at IS NULL OR gwp.expires_at > CURRENT_TIMESTAMP)
    ''', (user_id,))
    group_permissions = {row[0]: row[1] for row in cursor.fetchall()}
    
    conn.close()
    
    # Merge permissions (direct permissions override group permissions)
    all_permissions = {**group_permissions, **direct_permissions}
    return all_permissions

def check_widget_access(user_id, widget_id, required_level='view'):
    """
    Check if a user has access to a specific widget.
    Access levels: 'view', 'edit', 'admin'
    """
    # Admins have access to everything
    user = get_user_by_id(user_id)
    if user and user['role'] == 'admin':
        return True
    
    permissions = get_user_widget_permissions(user_id)
    user_level = permissions.get(widget_id)
    
    if not user_level:
        return False
    
    # Define access level hierarchy
    levels = {'view': 1, 'edit': 2, 'admin': 3}
    return levels.get(user_level, 0) >= levels.get(required_level, 0)

def get_all_widget_permissions():
    """Get all widget permissions with user/group details."""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get user permissions
    cursor.execute('''
        SELECT 
            wp.id,
            wp.widget_id,
            wp.access_level,
            wp.granted_at,
            wp.expires_at,
            u.id as user_id,
            u.email,
            u.name,
            'user' as permission_type
        FROM widget_permissions wp
        JOIN users u ON wp.user_id = u.id
        ORDER BY wp.widget_id, u.email
    ''')
    user_permissions = [dict(row) for row in cursor.fetchall()]
    
    # Get group permissions
    cursor.execute('''
        SELECT 
            gwp.id,
            gwp.widget_id,
            gwp.access_level,
            gwp.granted_at,
            gwp.expires_at,
            g.id as group_id,
            g.name as group_name,
            g.color,
            'group' as permission_type
        FROM group_widget_permissions gwp
        JOIN user_groups g ON gwp.group_id = g.id
        ORDER BY gwp.widget_id, g.name
    ''')
    group_permissions = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        'user_permissions': user_permissions,
        'group_permissions': group_permissions
    }

def bulk_grant_widget_permissions(user_ids, widget_ids, access_level='view', granted_by=None):
    """Grant multiple widget permissions to multiple users."""
    conn = get_db()
    cursor = conn.cursor()
    
    success_count = 0
    for user_id in user_ids:
        for widget_id in widget_ids:
            try:
                cursor.execute('''
                    INSERT OR REPLACE INTO widget_permissions (user_id, widget_id, access_level, granted_by)
                    VALUES (?, ?, ?, ?)
                ''', (user_id, widget_id, access_level, granted_by))
                success_count += 1
            except Exception:
                pass
    
    conn.commit()
    conn.close()
    return success_count

def bulk_revoke_widget_permissions(user_ids, widget_ids):
    """Revoke multiple widget permissions from multiple users."""
    conn = get_db()
    cursor = conn.cursor()
    
    placeholders_users = ','.join('?' * len(user_ids))
    placeholders_widgets = ','.join('?' * len(widget_ids))
    
    cursor.execute(f'''
        DELETE FROM widget_permissions 
        WHERE user_id IN ({placeholders_users}) AND widget_id IN ({placeholders_widgets})
    ''', user_ids + widget_ids)
    
    conn.commit()
    deleted = cursor.rowcount
    conn.close()
    return deleted

# ============ Role-Based Permissions ============

def get_role_permissions(role):
    """Get all system permissions for a role."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT permission FROM role_permissions WHERE role = ?', (role,))
    permissions = [row[0] for row in cursor.fetchall()]
    conn.close()
    return permissions

def has_role_permission(user_id, permission):
    """Check if user has a specific role-based permission."""
    user = get_user_by_id(user_id)
    if not user:
        return False
    
    role_perms = get_role_permissions(user['role'])
    return permission in role_perms

