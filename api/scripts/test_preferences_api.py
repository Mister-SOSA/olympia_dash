#!/usr/bin/env python3
"""
Test script for the user preferences API.
This tests the preferences endpoints without needing to run the full Flask app.
"""

import sys
import os
import json

# Add parent directory to path to import auth modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth.database import (
    get_user_preferences,
    set_user_preferences,
    update_user_preferences,
    delete_user_preferences,
    create_user
)

def run_tests():
    """Run comprehensive tests of the preferences system."""
    print("🧪 Testing User Preferences System\n")
    print("=" * 60)
    
    # Create a test user
    print("\n1️⃣  Creating test user...")
    try:
        user_id = create_user(
            email="test_prefs@example.com",
            name="Test User",
            microsoft_id="test_prefs_123",
            role="user"
        )
        print(f"✅ Created test user with ID: {user_id}")
    except Exception as e:
        print(f"ℹ️  User might already exist, using existing user: {e}")
        from auth.database import get_user_by_email
        user = get_user_by_email("test_prefs@example.com")
        user_id = user['id'] if user else 1
    
    # Test 1: Get empty preferences
    print("\n2️⃣  Testing get_user_preferences (should be empty)...")
    result = get_user_preferences(user_id)
    assert result['preferences'] == {}, "Initial preferences should be empty"
    assert result['version'] == 0, "Initial version should be 0"
    print("✅ Empty preferences retrieved successfully")
    
    # Test 2: Set preferences
    print("\n3️⃣  Testing set_user_preferences...")
    test_prefs = {
        'dashboard': {
            'layout': [
                {'id': 'widget1', 'x': 0, 'y': 0, 'w': 4, 'h': 2, 'enabled': True}
            ],
            'presets': [None] * 9,
            'currentPresetType': 'grid'
        },
        'theme': {
            'color': 'blue',
            'darkMode': True
        }
    }
    
    version = set_user_preferences(user_id, test_prefs)
    assert version == 1, "Version should be 1 after first save"
    print(f"✅ Preferences saved successfully (version {version})")
    
    # Test 3: Get saved preferences
    print("\n4️⃣  Testing retrieval of saved preferences...")
    result = get_user_preferences(user_id)
    assert result['preferences']['dashboard']['layout'][0]['id'] == 'widget1'
    assert result['preferences']['theme']['darkMode'] == True
    assert result['version'] == 1
    print("✅ Preferences retrieved correctly")
    
    # Test 4: Update preferences (partial update)
    print("\n5️⃣  Testing update_user_preferences (partial update)...")
    updates = {
        'theme': {
            'color': 'red',
            'fontSize': 'large'
        },
        'notifications': {
            'enabled': True
        }
    }
    
    version = update_user_preferences(user_id, updates)
    assert version == 2, "Version should increment to 2"
    print(f"✅ Preferences updated (version {version})")
    
    # Verify the merge worked correctly
    result = get_user_preferences(user_id)
    assert result['preferences']['theme']['color'] == 'red', "Color should be updated"
    assert result['preferences']['theme']['darkMode'] == True, "darkMode should still exist"
    assert result['preferences']['theme']['fontSize'] == 'large', "fontSize should be added"
    assert result['preferences']['dashboard']['layout'][0]['id'] == 'widget1', "Dashboard layout should be unchanged"
    assert result['preferences']['notifications']['enabled'] == True, "Notifications should be added"
    print("✅ Partial update merged correctly")
    
    # Test 5: Optimistic locking (version conflict)
    print("\n6️⃣  Testing optimistic locking (version conflict)...")
    conflict_prefs = {'test': 'conflict'}
    result = set_user_preferences(user_id, conflict_prefs, expected_version=1)
    assert result is None, "Should return None on version conflict"
    print("✅ Version conflict detected correctly")
    
    # Test 6: Optimistic locking (success)
    print("\n7️⃣  Testing optimistic locking (success)...")
    current = get_user_preferences(user_id)
    current_version = current['version']
    success_prefs = {**current['preferences'], 'newKey': 'newValue'}
    result = set_user_preferences(user_id, success_prefs, expected_version=current_version)
    assert result is not None, "Should succeed with correct version"
    assert result == current_version + 1, "Version should increment"
    print(f"✅ Optimistic locking worked (version {result})")
    
    # Test 7: Delete preferences
    print("\n8️⃣  Testing delete_user_preferences...")
    version = delete_user_preferences(user_id, 'theme.fontSize')
    result = get_user_preferences(user_id)
    assert 'fontSize' not in result['preferences']['theme'], "fontSize should be deleted"
    assert 'color' in result['preferences']['theme'], "color should still exist"
    print("✅ Single key deleted successfully")
    
    # Test 8: Delete nested key
    print("\n9️⃣  Testing delete of nested preferences...")
    version = delete_user_preferences(user_id, ['notifications', 'newKey'])
    result = get_user_preferences(user_id)
    assert 'notifications' not in result['preferences'], "notifications should be deleted"
    assert 'newKey' not in result['preferences'], "newKey should be deleted"
    assert 'dashboard' in result['preferences'], "dashboard should still exist"
    print("✅ Multiple keys deleted successfully")
    
    # Test 9: Complex nested structure
    print("\n🔟  Testing complex nested structure...")
    complex_prefs = {
        'widgets': {
            'sales': {
                'config': {
                    'chartType': 'bar',
                    'colors': ['red', 'blue', 'green'],
                    'options': {
                        'animated': True,
                        'legend': {
                            'position': 'top',
                            'enabled': True
                        }
                    }
                }
            }
        }
    }
    
    version = update_user_preferences(user_id, complex_prefs)
    result = get_user_preferences(user_id)
    assert result['preferences']['widgets']['sales']['config']['options']['legend']['position'] == 'top'
    print("✅ Complex nested structure handled correctly")
    
    # Test 10: Large preferences (stress test)
    print("\n1️⃣1️⃣  Testing large preferences payload...")
    large_prefs = {
        'largeArray': [{'item': i, 'data': f'value_{i}'} for i in range(100)],
        'largeObject': {f'key_{i}': f'value_{i}' for i in range(100)}
    }
    
    version = update_user_preferences(user_id, large_prefs)
    result = get_user_preferences(user_id)
    assert len(result['preferences']['largeArray']) == 100
    assert len(result['preferences']['largeObject']) == 100
    print("✅ Large preferences payload handled successfully")
    
    print("\n" + "=" * 60)
    print("✅ All tests passed!")
    print("🎉 User preferences system is working correctly!\n")
    
    # Clean up: show final state
    final = get_user_preferences(user_id)
    print(f"📊 Final state:")
    print(f"   Version: {final['version']}")
    print(f"   Top-level keys: {list(final['preferences'].keys())}")
    print(f"   Total size: {len(json.dumps(final['preferences']))} bytes")

if __name__ == "__main__":
    try:
        run_tests()
        sys.exit(0)
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

