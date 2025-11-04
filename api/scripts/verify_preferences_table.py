#!/usr/bin/env python3
"""
Script to verify the user_preferences table was created successfully.
Run this after starting the API to ensure the database migration worked.
"""

import sys
import os

# Add parent directory to path to import auth modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth.database import get_db

def verify_preferences_table():
    """Verify that the user_preferences table exists and has the correct schema."""
    print("Verifying user_preferences table...")
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='user_preferences'
        """)
        
        if not cursor.fetchone():
            print("❌ ERROR: user_preferences table does not exist!")
            print("   The table should be created automatically when the API starts.")
            print("   Try restarting the API server.")
            conn.close()
            return False
        
        print("✅ user_preferences table exists")
        
        # Check table schema
        cursor.execute("PRAGMA table_info(user_preferences)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}
        
        expected_columns = {
            'user_id': 'INTEGER',
            'preferences': 'TEXT',
            'version': 'INTEGER',
            'created_at': 'TIMESTAMP',
            'updated_at': 'TIMESTAMP'
        }
        
        all_columns_present = True
        for col_name, col_type in expected_columns.items():
            if col_name not in columns:
                print(f"❌ ERROR: Column '{col_name}' is missing!")
                all_columns_present = False
            else:
                print(f"✅ Column '{col_name}' ({columns[col_name]}) exists")
        
        if not all_columns_present:
            conn.close()
            return False
        
        # Check for indexes
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='index' AND tbl_name='user_preferences'
        """)
        indexes = [row[0] for row in cursor.fetchall()]
        
        if 'idx_user_preferences_updated_at' in indexes:
            print("✅ Index 'idx_user_preferences_updated_at' exists")
        else:
            print("⚠️  WARNING: Index 'idx_user_preferences_updated_at' is missing")
        
        # Get count of preference records
        cursor.execute("SELECT COUNT(*) FROM user_preferences")
        count = cursor.fetchone()[0]
        print(f"\n📊 Current preference records: {count}")
        
        conn.close()
        
        print("\n✅ Database schema verification complete!")
        print("   The user preferences system is ready to use.")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    success = verify_preferences_table()
    sys.exit(0 if success else 1)

