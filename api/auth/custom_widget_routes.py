"""
Custom Widget Builder API routes.

Handles CRUD operations for user-created custom widgets.
"""

import uuid
from flask import Blueprint, request, jsonify
from auth.database import (
    create_custom_widget,
    get_custom_widget,
    get_user_custom_widgets,
    get_accessible_custom_widgets,
    update_custom_widget,
    delete_custom_widget,
    share_custom_widget,
    get_shared_widget_templates,
    log_action
)
from auth.middleware import require_auth, require_role, get_client_ip

custom_widget_bp = Blueprint('custom_widgets', __name__)


def _emit_widget_update(user_id: int, widget_id: str, action: str):
    """Helper to emit custom widget updates via WebSocket."""
    try:
        from app import socketio
        # Emit to the user's room
        socketio.emit('custom_widget_updated', {
            'widget_id': widget_id,
            'action': action,  # 'created', 'updated', 'deleted', 'shared'
        }, room=f'user_{user_id}')
    except ImportError:
        pass  # Socket not available


@custom_widget_bp.route('', methods=['GET'])
@require_auth
def list_custom_widgets():
    """
    Get all custom widgets accessible to the current user.
    
    Query params:
        - own_only: If 'true', only return widgets created by the user
    """
    try:
        current_user = request.current_user  # type: ignore
        user_id = current_user['id']
        own_only = request.args.get('own_only', 'false').lower() == 'true'
        
        if own_only:
            widgets = get_user_custom_widgets(user_id)
        else:
            widgets = get_accessible_custom_widgets(user_id)
        
        return jsonify({
            'success': True,
            'widgets': widgets,
            'count': len(widgets)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@custom_widget_bp.route('/<widget_id>', methods=['GET'])
@require_auth
def get_widget(widget_id):
    """Get a specific custom widget by ID."""
    try:
        current_user = request.current_user  # type: ignore
        user_id = current_user['id']
        is_admin = current_user.get('role') == 'admin'
        
        widget = get_custom_widget(widget_id)
        
        if not widget:
            return jsonify({
                'success': False,
                'error': 'Widget not found'
            }), 404
        
        # Check access: owner, admin, shared, or has permission
        has_access = (
            widget['creator_id'] == user_id or
            is_admin or
            widget.get('is_shared')
        )
        
        if not has_access:
            # TODO: Also check widget_permissions table
            return jsonify({
                'success': False,
                'error': 'Access denied'
            }), 403
        
        return jsonify({
            'success': True,
            'widget': widget
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@custom_widget_bp.route('', methods=['POST'])
@require_auth
def create_widget():
    """
    Create a new custom widget.
    
    Expected body:
    {
        "title": "My Widget",
        "description": "Description of the widget",
        "category": "Sales",  // optional, defaults to "Custom"
        "visualization_type": "bar",  // bar, line, pie, table, single_value, gauge
        "data_source": {
            "type": "query_registry",
            "query_id": "SalesByDayBar",
            "params": {}
        },
        "config": {
            "x_field": "period",
            "y_field": "total",
            // ... visualization-specific config
        },
        "default_size": {"w": 4, "h": 4},
        "min_size": {"w": 2, "h": 2},  // optional
        "max_size": {"w": 12, "h": 8},  // optional
        "settings_schema": { ... }  // optional custom settings
    }
    """
    try:
        current_user = request.current_user  # type: ignore
        user_id = current_user['id']
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['title', 'visualization_type', 'data_source', 'config']
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing)}'
            }), 400
        
        # Validate visualization type
        valid_viz_types = ['bar', 'line', 'pie', 'table', 'single_value', 'gauge', 'custom']
        if data['visualization_type'] not in valid_viz_types:
            return jsonify({
                'success': False,
                'error': f'Invalid visualization type. Must be one of: {", ".join(valid_viz_types)}'
            }), 400
        
        # Validate data source
        valid_source_types = ['none', 'query_registry', 'api_endpoint', 'static']
        source_type = data['data_source'].get('type') if isinstance(data['data_source'], dict) else None
        if source_type not in valid_source_types:
            return jsonify({
                'success': False,
                'error': f'Invalid data source type. Must be one of: {", ".join(valid_source_types)}'
            }), 400
        
        # Generate widget ID
        widget_id = f"cw_{uuid.uuid4().hex[:12]}"
        
        # Create the widget
        create_custom_widget(
            widget_id=widget_id,
            creator_id=user_id,
            title=data['title'],
            description=data.get('description'),
            category=data.get('category', 'Custom'),
            visualization_type=data['visualization_type'],
            data_source=data['data_source'],
            config=data['config'],
            default_size=data.get('default_size', {'w': 4, 'h': 4}),
            min_size=data.get('min_size'),
            max_size=data.get('max_size'),
            settings_schema=data.get('settings_schema'),
            is_template=data.get('is_template', False)
        )
        
        # Log the action
        log_action(user_id, 'create_custom_widget', f'Created widget: {widget_id} - {data["title"]}', get_client_ip())
        
        # Emit update
        _emit_widget_update(user_id, widget_id, 'created')
        
        # Return the created widget
        widget = get_custom_widget(widget_id)
        
        return jsonify({
            'success': True,
            'widget': widget,
            'message': 'Custom widget created successfully'
        }), 201
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@custom_widget_bp.route('/<widget_id>', methods=['PUT', 'PATCH'])
@require_auth
def update_widget(widget_id):
    """
    Update an existing custom widget.
    
    User must be the creator or have 'edit' permission.
    """
    try:
        current_user = request.current_user  # type: ignore
        user_id = current_user['id']
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Update the widget
        success = update_custom_widget(widget_id, user_id, data)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Widget not found or no changes made'
            }), 404
        
        # Log the action
        log_action(user_id, 'update_custom_widget', f'Updated widget: {widget_id}', get_client_ip())
        
        # Emit update to all sessions
        _emit_widget_update(user_id, widget_id, 'updated')
        
        # Return updated widget
        widget = get_custom_widget(widget_id)
        
        return jsonify({
            'success': True,
            'widget': widget,
            'message': 'Widget updated successfully'
        }), 200
        
    except PermissionError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 403
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@custom_widget_bp.route('/<widget_id>', methods=['DELETE'])
@require_auth
def delete_widget(widget_id):
    """Delete a custom widget. Only creator or admin can delete."""
    try:
        current_user = request.current_user  # type: ignore
        user_id = current_user['id']
        is_admin = current_user.get('role') == 'admin'
        
        success = delete_custom_widget(widget_id, user_id, is_admin)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Widget not found or permission denied'
            }), 404
        
        # Log the action
        log_action(user_id, 'delete_custom_widget', f'Deleted widget: {widget_id}', get_client_ip())
        
        # Emit update
        _emit_widget_update(user_id, widget_id, 'deleted')
        
        return jsonify({
            'success': True,
            'message': 'Widget deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@custom_widget_bp.route('/<widget_id>/share', methods=['POST'])
@require_auth
def toggle_share_widget(widget_id):
    """Toggle the shared status of a widget. Only creator can change."""
    try:
        current_user = request.current_user  # type: ignore
        user_id = current_user['id']
        data = request.get_json() or {}
        
        is_shared = data.get('is_shared', True)
        
        success = share_custom_widget(widget_id, user_id, is_shared)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Widget not found or permission denied'
            }), 404
        
        # Log the action
        action = 'shared' if is_shared else 'unshared'
        log_action(user_id, f'{action}_custom_widget', f'{action.capitalize()} widget: {widget_id}', get_client_ip())
        
        # Emit update
        _emit_widget_update(user_id, widget_id, action)
        
        return jsonify({
            'success': True,
            'is_shared': is_shared,
            'message': f'Widget {action} successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@custom_widget_bp.route('/templates', methods=['GET'])
@require_auth
def list_templates():
    """Get all available widget templates (admin-created public widgets)."""
    try:
        templates = get_shared_widget_templates()
        
        return jsonify({
            'success': True,
            'templates': templates,
            'count': len(templates)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@custom_widget_bp.route('/<widget_id>/duplicate', methods=['POST'])
@require_auth
def duplicate_widget(widget_id):
    """
    Duplicate an existing widget to create a copy for the current user.
    Useful for creating widgets from templates or making personal copies.
    """
    try:
        current_user = request.current_user  # type: ignore
        user_id = current_user['id']
        data = request.get_json() or {}
        
        # Get the source widget
        source_widget = get_custom_widget(widget_id)
        
        if not source_widget:
            return jsonify({
                'success': False,
                'error': 'Source widget not found'
            }), 404
        
        # Check access (must be owner, shared, or template)
        has_access = (
            source_widget['creator_id'] == user_id or
            source_widget.get('is_shared') or
            source_widget.get('is_template')
        )
        
        if not has_access:
            return jsonify({
                'success': False,
                'error': 'Access denied to source widget'
            }), 403
        
        # Generate new ID
        new_widget_id = f"cw_{uuid.uuid4().hex[:12]}"
        
        # Create the duplicate
        new_title = data.get('title', f"{source_widget['title']} (Copy)")
        
        create_custom_widget(
            widget_id=new_widget_id,
            creator_id=user_id,
            title=new_title,
            description=source_widget.get('description'),
            category=source_widget.get('category', 'Custom'),
            visualization_type=source_widget['visualization_type'],
            data_source=source_widget['data_source'],
            config=source_widget['config'],
            default_size=source_widget['default_size'],
            min_size=source_widget.get('min_size'),
            max_size=source_widget.get('max_size'),
            settings_schema=source_widget.get('settings_schema'),
            is_template=False  # Duplicates are never templates
        )
        
        # Log the action
        log_action(user_id, 'duplicate_custom_widget', 
                   f'Duplicated widget {widget_id} as {new_widget_id}', get_client_ip())
        
        # Emit update
        _emit_widget_update(user_id, new_widget_id, 'created')
        
        # Return the new widget
        widget = get_custom_widget(new_widget_id)
        
        return jsonify({
            'success': True,
            'widget': widget,
            'message': 'Widget duplicated successfully'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
