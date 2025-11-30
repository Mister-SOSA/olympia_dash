"""
Analytics tracking routes for user activity monitoring.
These routes are called by the frontend to track user engagement.
"""

from flask import Blueprint, request, jsonify
from auth.database import (
    track_page_view,
    track_widget_interaction,
    start_activity_session,
    update_activity_session,
    end_activity_session,
    track_feature_usage,
    update_last_active
)
from auth.middleware import require_auth, get_client_ip

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/pageview', methods=['POST'])
@require_auth
def record_page_view():
    """Record a page view event."""
    try:
        user = request.current_user  # type: ignore
        data = request.get_json() or {}
        
        page = data.get('page', '/')
        referrer = data.get('referrer')
        device_type = data.get('device_type', 'desktop')
        user_agent = request.headers.get('User-Agent', '')
        
        track_page_view(
            user_id=user['id'],
            page=page,
            referrer=referrer,
            user_agent=user_agent,
            device_type=device_type
        )
        
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@analytics_bp.route('/widget', methods=['POST'])
@require_auth
def record_widget_interaction():
    """Record a widget interaction event."""
    try:
        user = request.current_user  # type: ignore
        data = request.get_json() or {}
        
        widget_id = data.get('widget_id')
        widget_type = data.get('widget_type')
        interaction_type = data.get('interaction_type', 'view')
        metadata = data.get('metadata')
        
        if not widget_id or not widget_type:
            return jsonify({
                'success': False,
                'error': 'widget_id and widget_type are required'
            }), 400
        
        track_widget_interaction(
            user_id=user['id'],
            widget_id=widget_id,
            widget_type=widget_type,
            interaction_type=interaction_type,
            metadata=metadata
        )
        
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@analytics_bp.route('/session/start', methods=['POST'])
@require_auth
def start_session():
    """Start a new activity session."""
    try:
        user = request.current_user  # type: ignore
        data = request.get_json() or {}
        
        device_type = data.get('device_type', 'desktop')
        
        session_id = start_activity_session(
            user_id=user['id'],
            device_type=device_type
        )
        
        # Update last_active timestamp
        update_last_active(user['id'])
        
        return jsonify({
            'success': True,
            'session_id': session_id
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@analytics_bp.route('/session/heartbeat', methods=['POST'])
@require_auth
def session_heartbeat():
    """Update activity session with heartbeat."""
    try:
        user = request.current_user  # type: ignore
        data = request.get_json() or {}
        
        session_id = data.get('session_id')
        page_count_increment = data.get('page_count', 0)
        widget_count_increment = data.get('widget_count', 0)
        
        if not session_id:
            return jsonify({
                'success': False,
                'error': 'session_id is required'
            }), 400
        
        update_activity_session(
            session_id=session_id,
            page_count_increment=page_count_increment,
            widget_count_increment=widget_count_increment
        )
        
        # Update last_active timestamp on every heartbeat
        update_last_active(user['id'])
        
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@analytics_bp.route('/session/end', methods=['POST'])
@require_auth
def end_session():
    """End an activity session."""
    try:
        data = request.get_json() or {}
        
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({
                'success': False,
                'error': 'session_id is required'
            }), 400
        
        end_activity_session(session_id=session_id)
        
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@analytics_bp.route('/feature', methods=['POST'])
@require_auth
def record_feature_usage():
    """Record a feature usage event."""
    try:
        user = request.current_user  # type: ignore
        data = request.get_json() or {}
        
        feature_name = data.get('feature_name')
        
        if not feature_name:
            return jsonify({
                'success': False,
                'error': 'feature_name is required'
            }), 400
        
        track_feature_usage(
            user_id=user['id'],
            feature_name=feature_name
        )
        
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@analytics_bp.route('/batch', methods=['POST'])
@require_auth
def record_batch_events():
    """Record multiple analytics events in a single request (for efficiency)."""
    try:
        user = request.current_user  # type: ignore
        data = request.get_json() or {}
        user_agent = request.headers.get('User-Agent', '')
        
        events = data.get('events', [])
        session_id = data.get('session_id')
        
        page_views = 0
        widget_interactions = 0
        
        for event in events:
            event_type = event.get('type')
            
            if event_type == 'pageview':
                track_page_view(
                    user_id=user['id'],
                    page=event.get('page', '/'),
                    referrer=event.get('referrer'),
                    user_agent=user_agent,
                    device_type=event.get('device_type', 'desktop')
                )
                page_views += 1
                
            elif event_type == 'widget':
                if event.get('widget_id') and event.get('widget_type'):
                    track_widget_interaction(
                        user_id=user['id'],
                        widget_id=event.get('widget_id'),
                        widget_type=event.get('widget_type'),
                        interaction_type=event.get('interaction_type', 'view'),
                        metadata=event.get('metadata')
                    )
                    widget_interactions += 1
                    
            elif event_type == 'feature':
                if event.get('feature_name'):
                    track_feature_usage(
                        user_id=user['id'],
                        feature_name=event.get('feature_name')
                    )
        
        # Update session with counts if provided
        if session_id and (page_views > 0 or widget_interactions > 0):
            update_activity_session(
                session_id=session_id,
                page_count_increment=page_views,
                widget_count_increment=widget_interactions
            )
        
        return jsonify({
            'success': True,
            'processed': len(events),
            'page_views': page_views,
            'widget_interactions': widget_interactions
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
