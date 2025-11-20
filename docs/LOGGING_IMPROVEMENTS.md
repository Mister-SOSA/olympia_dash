# Logging Improvements

## Overview
Enhanced audit logging throughout the application to provide thorough, actionable information about user activities and system events.

## Key Changes

### 1. Enhanced Audit Log Data Structure
**File**: `/api/auth/database.py`

- Updated `get_audit_logs()` to JOIN with users table
- Now includes `user_email` and `user_name` in all audit log entries
- Provides richer context without additional queries

```python
# Before: Only had user_id
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?

# After: Includes user details
SELECT 
    al.id, al.user_id, al.action, al.details, al.ip_address, al.created_at,
    u.email as user_email, u.name as user_name
FROM audit_log al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC LIMIT ?
```

### 2. Detailed Logging Messages

#### Preferences (`/api/auth/preferences_routes.py`)
- **Before**: Generic "Full preferences update"
- **After**: Lists specific keys changed, e.g., "Updated preferences: dashboard.layout, theme, widgets and more"

#### Widget Permissions (`/api/auth/widget_routes.py`)
- **Before**: `"Granted widget_123 to user 5"`
- **After**: `'Granted "view" access to widget "widget_123" for user@example.com'`

#### User Management (`/api/auth/admin_routes.py`)
- **Role Changes**: `"Changed user@example.com role from user to admin"`
- **Status Changes**: `"Set user@example.com status to inactive"`
- **Permission Grants**: `'Granted permission "dashboard.edit" to user@example.com'`
- **Session Revocations**: `"Revoked 3 session(s) for user@example.com"`

#### Group Management (`/api/auth/groups_routes.py`)
- **Member Addition**: `'Added user@example.com to group "Administrators"'`
- **Member Removal**: `'Removed user@example.com from group "Administrators"'`
- **Bulk Operations**: `'Added 5 user(s) to group "Developers"'`

#### Bulk Widget Operations (`/api/auth/widget_routes.py`)
- **Bulk Grants**: `"Granted 15 permissions: 5 widgets (widget_a, widget_b, widget_c and 2 more) to 3 users"`
- **Bulk Revocations**: `"Revoked 10 permissions: 2 widgets (widget_x, widget_y) from 5 users"`

### 3. New Logging Events

#### Token Refresh (`/api/auth/routes.py`)
- Added logging for token refreshes (rate-limited to once per hour per user to avoid spam)
- Action: `token_refreshed`
- Details: `"Access token refreshed"`
- Helps track active user sessions and authentication patterns

### 4. Admin Panel UI Improvements

#### Activity Panel (`/dash_frontend/src/components/admin/ActivityPanel.tsx`)
- Already displays user email and name
- Shows formatted timestamps in local timezone
- Provides visual indicators for different action types

#### Main Admin Page (`/dash_frontend/src/app/admin/page.tsx`)
- **Before**: Showed "User #123"
- **After**: Shows:
  - User name (primary, bold)
  - User email (secondary, small text)
  - "System" label for system-generated events

#### TypeScript Interface Updates
```typescript
interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  details: string | null;
  ip_address: string | null;
  created_at: string;
  user_email?: string;      // NEW
  user_name?: string;       // NEW
}
```

## Logging Actions Reference

### Authentication
- `login` - User successfully logged in via OAuth
- `logout` - User logged out
- `token_refreshed` - Access token was refreshed (max once/hour per user)
- `session_deleted` - User deleted a specific session
- `device_paired` - Device successfully paired
- `device_auth` - Device authenticated
- `device_session_deleted` - Device session removed

### User Management (Admin)
- `role_changed` - User role modified (user ↔ admin)
- `user_status_changed` - User activated/deactivated
- `permission_granted` - Specific permission granted to user
- `permission_revoked` - Specific permission revoked from user
- `sessions_revoked` - All user sessions invalidated

### Group Management (Admin)
- `group_created` - New group created
- `group_updated` - Group details modified
- `group_deleted` - Group removed
- `user_added_to_group` - User added to group
- `user_removed_from_group` - User removed from group
- `bulk_users_added_to_group` - Multiple users added to group

### Widget Permissions (Admin)
- `widget_permission_granted` - Widget access granted to user
- `widget_permission_revoked` - Widget access revoked from user
- `group_widget_permission_granted` - Widget access granted to group
- `group_widget_permission_revoked` - Widget access revoked from group
- `bulk_widget_permissions_granted` - Multiple widget permissions granted
- `bulk_widget_permissions_revoked` - Multiple widget permissions revoked

### Preferences (User)
- `preferences_updated` - User preferences modified (with key details)
- `preferences_deleted` - Specific preference key deleted

### System (Admin)
- `system_cleanup` - System cleanup performed (old sessions, logs, etc.)
- `device_session_deleted` - Device session removed by admin

## Benefits

### For Administrators
1. **Better Visibility**: See exactly what users are doing
2. **Accountability**: Track who made what changes with email addresses
3. **Troubleshooting**: Detailed error context for debugging
4. **Audit Trail**: Complete history of system modifications
5. **Security**: Monitor authentication patterns and suspicious activity

### For Developers
1. **Debugging**: Rich context for investigating issues
2. **Performance**: Optimized queries with JOINs instead of multiple lookups
3. **Consistency**: Standardized logging format across all modules
4. **Maintainability**: Clear logging patterns to follow

### For Compliance
1. **GDPR/SOC2**: Comprehensive audit trails
2. **Access Control**: Complete permission change history
3. **Data Changes**: Track all preference modifications
4. **User Activity**: Monitor data access and modifications

## Usage Examples

### Viewing Logs in Admin Panel
1. Navigate to Admin → Activity tab
2. Filter by:
   - Time range (1h, 24h, 7d, 30d)
   - Action type (auth, admin, widget, system)
   - Search text (emails, actions, details)
   - Specific user

### Exporting Logs
- Click "Export CSV" in Activity Panel
- Includes all filtered logs with full details
- Useful for compliance reporting and analysis

### API Access
```bash
# Get last 100 audit logs
GET /api/auth/admin/audit-logs?limit=100

# Get logs for specific user
GET /api/auth/admin/audit-logs?user_id=5&limit=50
```

## Future Enhancements

### Potential Additions
1. **Log Levels**: INFO, WARN, ERROR categories
2. **Retention Policies**: Auto-archive old logs
3. **Real-time Alerts**: Notify admins of suspicious activity
4. **Analytics Dashboard**: Visualize user behavior patterns
5. **Search Improvements**: Full-text search across all fields
6. **Webhook Integration**: Send logs to external SIEM systems

### Performance Considerations
- Token refresh logging is rate-limited to once/hour per user
- Audit log queries use indexed columns (user_id, created_at)
- Consider partitioning audit_log table when it grows large
- Implement log rotation/archiving for production deployments
