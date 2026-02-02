#!/usr/bin/env python3
"""
Script to create an admin user or promote an existing user to admin.
Usage: python create_admin.py email@domain.com
"""

import sys
import os

# Add the api directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from auth.database import get_user_by_email, update_user_role, create_user

def create_or_promote_admin(email):
    """Create a new admin user or promote an existing user to admin."""
    
    # Check if user exists
    user = get_user_by_email(email)
    
    if user:
        if user['role'] == 'admin':
            print(f"✓ User {email} is already an admin.")
            return
        
        # Promote to admin
        update_user_role(user['id'], 'admin')
        print(f"✓ User {email} has been promoted to admin.")
    else:
        # Create new user as admin
        print(f"User {email} not found in database.")
        print("Note: Users are automatically created on first Microsoft OAuth login.")
        print("\nTo make this user an admin after their first login, run:")
        print(f"  python api/scripts/create_admin.py {email}")
        print("\nOr manually update the database:")
        print(f"  sqlite3 api/auth.db \"UPDATE users SET role = 'admin' WHERE email = '{email}';\"")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python create_admin.py email@domain.com")
        sys.exit(1)
    
    email = sys.argv[1]
    
    if '@' not in email:
        print("Error: Invalid email address")
        sys.exit(1)
    
    create_or_promote_admin(email)
