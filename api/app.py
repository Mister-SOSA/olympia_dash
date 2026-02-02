"""
Flask API for the Olympia Dashboard.

This application provides two endpoints:
1. POST /api/widgets: Executes either a raw SQL query or dynamically builds a query.
2. GET /api/humidity: Retrieves current relative humidity data from the Open-Meteo API.
"""

import os
import logging
import colorlog
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room
import requests_cache
import openmeteo_requests
from retry_requests import retry
from database.queries import QueryBuilder
from database.query_registry import QueryRegistry, QueryRegistryError
from auth.routes import auth_bp
from auth.device_routes import device_bp
from auth.admin_routes import admin_bp
from auth.preferences_routes import preferences_bp
from auth.groups_routes import groups_bp
from auth.widget_routes import widget_bp
from auth.analytics_routes import analytics_bp
from auth.custom_widget_routes import custom_widget_bp
from auth.middleware import require_auth
from services.usda_mpr import get_beef_prices, get_beef_heart_prices
from services.unifi_access import get_entry_logs as fetch_entry_logs
from services.ac_infinity import (
    get_all_controllers, get_controller_by_id, set_fan_speed,
    get_port_settings, set_port_mode, update_port_settings, MODE_NAMES,
    get_all_port_settings
)

# Configure colorized logging with uniform format
logger = colorlog.getLogger()
# Only add the handler if one isn't already attached to prevent duplicate logs.
if not any(isinstance(h, colorlog.StreamHandler) for h in logger.handlers):
    handler = colorlog.StreamHandler()
    handler.setFormatter(colorlog.ColoredFormatter(
        '%(log_color)s%(asctime)s - %(levelname)-8s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        log_colors={
            'DEBUG':    'cyan',
            'INFO':     'green',
            'WARNING':  'yellow',
            'ERROR':    'red',
            'CRITICAL': 'bold_red',
        }
    ))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Open-Meteo API client configuration with caching and retries.
CACHE_EXPIRE_SECONDS = 3600
cache_session = requests_cache.CachedSession('.cache', expire_after=CACHE_EXPIRE_SECONDS)
retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
openmeteo_client = openmeteo_requests.Client(session=retry_session)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_PARAMS = {
    "latitude": 41.9353,
    "longitude": -87.8656,
    "current": "relative_humidity_2m"
}

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": False,
        "max_age": 3600
    }
})

# Determine async mode based on environment
# - Production (Gunicorn + eventlet): eventlet monkey-patching is done in wsgi.py BEFORE import
# - Development (python app.py): uses 'threading' for simpler debugging
def _get_async_mode():
    """Determine the best async mode for the current environment.
    
    IMPORTANT: When running with Gunicorn + eventlet, the monkey_patch() is 
    called in wsgi.py BEFORE this module is imported. This ensures all 
    standard library modules are patched before they're used.
    
    We detect if eventlet is already patched by checking for its hub.
    """
    # Check if eventlet has already been monkey-patched (production mode via wsgi.py)
    try:
        import eventlet
        if eventlet.patcher.is_monkey_patched('socket'):
            logger.info('eventlet monkey-patching detected (production mode)')
            return 'eventlet'
    except ImportError:
        pass
    
    # Development mode - use threading for easier debugging
    logger.info('Using threading mode (development)')
    return 'threading'

_async_mode = _get_async_mode()

# Initialize SocketIO for real-time preference sync
socketio = SocketIO(
    app, 
    cors_allowed_origins="*", 
    async_mode=_async_mode,
    ping_timeout=60,
    ping_interval=25,
    # Disable verbose logging for Socket.IO internals
    engineio_logger=False,
    logger=False
)

# Track active sessions per room (module-level for persistence)
active_sessions: dict[str, set[str]] = {}

# WebSocket handlers
@socketio.on('connect')
def handle_connect():
    logger.info(f'Client connected: {request.sid}')  # type: ignore[attr-defined]

@socketio.on('join')
def handle_join(data):
    """Join user-specific room for receiving preference updates"""
    from flask_socketio import emit
    user_id = data.get('user_id')
    session_id = data.get('session_id', 'unknown')
    logger.info(f'🔵 JOIN REQUEST - User: {user_id}, Session: {session_id[:8]}..., SID: {request.sid}')  # type: ignore[attr-defined]
    
    if user_id:
        room = f'user_{user_id}'
        join_room(room)
        
        # Track this session
        if room not in active_sessions:
            active_sessions[room] = set()
        active_sessions[room].add(request.sid)  # type: ignore[attr-defined]
        
        session_count = len(active_sessions[room])
        logger.info(f'✅ JOINED - Session {session_id[:8]}... (SID: {request.sid}) joined room {room}')  # type: ignore[attr-defined]
        logger.info(f'   📊 Total sessions in {room}: {session_count}')
        logger.info(f'   📊 Active SIDs in room: {[sid[:8] for sid in active_sessions[room]]}')
        
        # Send confirmation to joining client
        emit('joined', {'room': room, 'session_count': session_count})
        logger.info(f'📤 SENT joined confirmation to {request.sid}')  # type: ignore[attr-defined]
        
        # If this is a second+ session, notify ALL clients in room (including the one that just joined)
        if session_count > 1:
            emit('session_count_updated', {'session_count': session_count}, to=room, namespace='/')
            logger.info(f'📤 Broadcasted session count update: {session_count} to room {room}')
    else:
        logger.warning('⚠️ Join request missing user_id')

@socketio.on('broadcast_preferences')
def handle_broadcast_preferences(data):
    """Broadcast preferences to other sessions - triggered after save"""
    from flask_socketio import emit
    
    user_id = data.get('user_id')
    preferences = data.get('preferences')
    version = data.get('version')
    origin_session_id = data.get('origin_session_id')
    
    if not user_id:
        return
    
    room = f'user_{user_id}'
    session_count = len(active_sessions.get(room, set()))
    
    logger.info(f'📡 Broadcast request - Room: {room}, Sessions: {session_count}')
    
    if session_count <= 1:
        logger.info(f'⏭️ Skipping - only 1 session')
        return
    
    payload = {
        'preferences': preferences,
        'version': version,
        'origin_session_id': origin_session_id
    }
    
    # Emit to room (works from socket context!)
    emit('preferences_updated', payload, to=room, namespace='/')
    logger.info(f'✅ Broadcast sent to {session_count} sessions')

@socketio.on('test_broadcast')
def handle_test_broadcast(data):
    """Test broadcast functionality"""
    from flask_socketio import emit
    user_id = data.get('user_id')
    logger.info(f'🧪 TEST BROADCAST requested for user {user_id}')
    
    if user_id:
        room = f'user_{user_id}'
        test_payload = {'message': 'Test broadcast working!', 'timestamp': str(data)}
        
        logger.info(f'📡 Sending test to room {room}')
        emit('test_received', test_payload, to=room, namespace='/')
        logger.info(f'✅ Test broadcast sent')

@socketio.on('disconnect')
def handle_disconnect():
    from flask_socketio import emit
    
    # Clean up session tracking
    for room, sessions in list(active_sessions.items()):
        if request.sid in sessions:  # type: ignore[attr-defined]
            sessions.remove(request.sid)  # type: ignore[attr-defined]
            remaining_count = len(sessions)
            logger.info(f'❌ Client {request.sid} disconnected from {room}')  # type: ignore[attr-defined]
            logger.info(f'   📊 Remaining sessions in {room}: {remaining_count}')
            
            # Notify remaining sessions about count change
            if remaining_count > 0:
                emit('session_count_updated', {'session_count': remaining_count}, to=room, namespace='/')
                logger.info(f'📤 Notified remaining sessions - count: {remaining_count}')
            
            if remaining_count == 0:
                del active_sessions[room]
    
    if not any(request.sid in sessions for sessions in active_sessions.values()):  # type: ignore[attr-defined]
        logger.info(f'❌ Client disconnected: {request.sid}')  # type: ignore[attr-defined]


def emit_permissions_updated(user_id: int):
    """
    Emit a permissions_updated event to a specific user's room.
    This notifies all their connected sessions to refresh permissions.
    """
    room = f'user_{user_id}'
    socketio.emit('permissions_updated', {'user_id': user_id}, to=room, namespace='/')
    logger.info(f'📤 Emitted permissions_updated to room {room}')


def emit_permissions_updated_for_group(group_id: int):
    """
    Emit permissions_updated to all users in a group.
    """
    from auth.database import get_db
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT user_id FROM group_members WHERE group_id = ?', (group_id,))
    user_ids = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    for user_id in user_ids:
        emit_permissions_updated(user_id)
    
    logger.info(f'📤 Emitted permissions_updated to {len(user_ids)} users in group {group_id}')


# Register authentication blueprints with /api/auth prefix
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(device_bp, url_prefix='/api/auth/device')
app.register_blueprint(admin_bp, url_prefix='/api/auth/admin')
app.register_blueprint(preferences_bp, url_prefix='/api')
app.register_blueprint(groups_bp, url_prefix='/api/auth/admin/groups')
app.register_blueprint(widget_bp, url_prefix='/api/auth/widgets')
app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
app.register_blueprint(custom_widget_bp, url_prefix='/api/custom-widgets')

# App version - updated on each deployment to trigger client reloads
# You can also use BUILD_VERSION env var set during docker build
APP_VERSION = os.environ.get('BUILD_VERSION', None)

@app.route('/api/version', methods=['GET'])
def get_version():
    """
    Return current app version. Used by frontend to detect new deployments
    and automatically reload all connected clients (TVs, displays, etc.)
    """
    return jsonify({
        'version': APP_VERSION or app.config.get('START_TIME', 'unknown')
    })


@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for container orchestration and load balancers.
    
    Returns:
        200 OK if the service is healthy
        
    Used by:
        - Docker health checks
        - Kubernetes liveness/readiness probes
        - Load balancer health checks
        - Monitoring systems (Datadog, Prometheus, etc.)
    """
    return jsonify({
        'status': 'healthy',
        'service': 'olympia-api',
        'version': APP_VERSION or app.config.get('START_TIME', 'unknown'),
        'websocket_mode': _async_mode
    }), 200

@app.route('/api/widgets', methods=['POST'])
@require_auth
def get_widgets_post():
    """
    Handle POST requests to retrieve widget data.

        Accepts a JSON payload with either:
            - query_id: identifier for a registry-backed query plus optional "params" dict
            - table (legacy support): table name and accompanying builder parameters
                - columns: list of columns to select (default: ["*"])
                - filters: conditions for the WHERE clause
                - group_by: columns to group by
                - sort: sort order
                - join: join clause(s)
                - limit: limit for pagination
                - offset: offset for pagination (default: 0)
        The payload may also include "module" for logging purposes.
    """
    try:
        module = request.headers.get("module")
        data = request.get_json(force=True)
        if not data:
            return jsonify({"success": False, "error": "No JSON payload provided"}), 200
        if not module:
            module = data.get("module")

        query_id = data.get("query_id") or data.get("queryId")
        params = data.get("params") or {}
        current_user = getattr(request, "current_user", None)
        user_role = current_user.get("role") if isinstance(current_user, dict) else None

        if query_id:
            if params and not isinstance(params, dict):
                return jsonify({"success": False, "error": "Params must be an object"}), 200

            try:
                query_definition = QueryRegistry.build_query(query_id, params, user_role)
            except QueryRegistryError as exc:
                logger.warning(
                    'Module: %s | Endpoint: /api/widgets | QueryId: %s | Error: %s',
                    module,
                    query_id,
                    exc,
                )
                return jsonify({"success": False, "error": str(exc)}), 200

            table = query_definition.get("table")
            columns = query_definition.get("columns", ["*"])
            filters = query_definition.get("filters")
            group_by = query_definition.get("group_by")
            sort = query_definition.get("sort")
            join_clause = query_definition.get("join")
            limit = query_definition.get("limit")
            offset = query_definition.get("offset", 0)
            custom_sql = query_definition.get("custom_sql")

            if custom_sql:
                query = custom_sql
            else:
                qb = QueryBuilder(table).select(columns)
                if join_clause:
                    qb = qb.join_clause(join_clause)
                if filters:
                    qb = qb.where(filters)
                if group_by:
                    qb = qb.group_by_clause(group_by)
                if sort:
                    qb = qb.order_by(sort)
                if limit:
                    qb = qb.paginate(limit, offset)

                query = qb.build_query()

            results = QueryBuilder.execute_query(query)
            logger.info(
                'Module: %s | Endpoint: /api/widgets | Action: Executed registry query | QueryId: %s',
                module,
                query_id,
            )
            return jsonify({"success": True, "data": results}), 200

        # Ensure required parameters are provided.
        table = data.get("table")
        if not table:
            return jsonify({"success": False, "error": "Table parameter is required"}), 200

        # Extract dynamic query parameters.
        columns = data.get("columns", ["*"])
        filters = data.get("filters")
        group_by = data.get("group_by")
        sort = data.get("sort")
        join_clause = data.get("join")
        limit = data.get("limit")
        offset = data.get("offset", 0)

        # Build the dynamic query.
        qb = QueryBuilder(table).select(columns)
        if join_clause:
            qb = qb.join_clause(join_clause)
        if filters:
            qb = qb.where(filters)
        if group_by:
            qb = qb.group_by_clause(group_by)
        if sort:
            qb = qb.order_by(sort)
        if limit:
            qb = qb.paginate(limit, offset)

        query = qb.build_query()

        # Execute the built query.
        results = QueryBuilder.execute_query(query)
        logger.info(
            'Module: %s | Endpoint: /api/widgets | Action: Executed dynamic query | Query: %s',
            module,
            query,
        )
        return jsonify({"success": True, "data": results}), 200

    except Exception as e:
        logger.error('Module: %s | Endpoint: /api/widgets | Error: %s | Query: %s', module, e, query if 'query' in locals() else 'N/A')
        # Return error with HTTP 200 so the widget always receives a JSON response
        return jsonify({"success": False, "error": str(e)}), 200


@app.route('/api/humidity', methods=['GET'])
@require_auth
def get_humidity():
    """
    Retrieve current relative humidity data from the Open-Meteo API.
    
    The humidity is extracted from the API response based on its expected structure.
    Adjust the extraction logic if the API response format changes.
    """
    try:
        response = openmeteo_client.weather_api(OPEN_METEO_URL, params=OPEN_METEO_PARAMS)
        # Extract the current relative humidity value from the response.
        current = response[0].Current()
        humidity = current.Variables(0).Value()  # type: ignore[union-attr]
        return jsonify({"success": True, "data": humidity}), 200

    except Exception as e:
        logger.error('Endpoint: /api/humidity | Error: %s', e)
        return jsonify({"success": False, "error": str(e)}), 200


@app.route('/api/beef-prices', methods=['GET'])
@require_auth
def get_beef_prices_endpoint():
    """
    Retrieve USDA beef price data for Chemical Lean Fresh 50% and 85%.
    
    Data is cached for 24 hours. Pass ?refresh=true to force a refresh.
    """
    try:
        force_refresh = request.args.get('refresh', '').lower() == 'true'
        result = get_beef_prices(force_refresh=force_refresh)
        return jsonify({"success": True, "data": result['data']}), 200

    except Exception as e:
        logger.error('Endpoint: /api/beef-prices | Error: %s', e)
        return jsonify({"success": False, "error": str(e)}), 200


@app.route('/api/beef-heart-prices', methods=['GET'])
@require_auth
def get_beef_heart_prices_endpoint():
    """
    Retrieve USDA beef heart price data from by-product reports.
    
    Data is cached for 24 hours. Pass ?refresh=true to force a refresh.
    """
    try:
        force_refresh = request.args.get('refresh', '').lower() == 'true'
        result = get_beef_heart_prices(force_refresh=force_refresh)
        return jsonify({"success": True, "data": result['data']}), 200

    except Exception as e:
        logger.error('Endpoint: /api/beef-heart-prices | Error: %s', e)
        return jsonify({"success": False, "error": str(e)}), 200


@app.route('/api/access-logs', methods=['GET'])
@require_auth
def get_access_logs():
    """
    Retrieve entry/access logs from UniFi Access.
    
    Query Parameters:
        hours: Number of hours to look back (default: 24, max: 720)
        topic: Log topic filter - door_openings, critical, updates, 
               device_events, admin_activity, visitor (default: door_openings)
        page: Page number for pagination (default: 1)
        page_size: Results per page (default: 50, max: 100)
    """
    try:
        hours = min(int(request.args.get('hours', 24)), 720)  # Max 30 days
        topic = request.args.get('topic', 'door_openings')
        page = max(int(request.args.get('page', 1)), 1)
        page_size = min(int(request.args.get('page_size', 50)), 100)
        
        # Validate topic
        valid_topics = ['all', 'door_openings', 'critical', 'updates', 
                       'device_events', 'admin_activity', 'visitor']
        if topic not in valid_topics:
            topic = 'door_openings'
        
        result = fetch_entry_logs(
            hours_back=hours,
            topic=topic,
            page_num=page,
            page_size=page_size
        )
        
        if not result['success']:
            return jsonify({
                "success": False, 
                "error": result.get('error', 'Unknown error')
            }), 200
        
        return jsonify({
            "success": True, 
            "data": result['data'],
            "total": result.get('total', len(result['data']))
        }), 200

    except ValueError as e:
        logger.warning('Endpoint: /api/access-logs | Invalid parameter: %s', e)
        return jsonify({"success": False, "error": "Invalid parameter value"}), 200
    except Exception as e:
        logger.error('Endpoint: /api/access-logs | Error: %s', e)
        return jsonify({"success": False, "error": str(e)}), 200


# ============================================
# AC Infinity Fan Controller Routes
# ============================================

@app.route('/api/ac-infinity/controllers', methods=['GET'])
@require_auth
def get_ac_infinity_controllers():
    """
    Get all AC Infinity controllers and their status.
    
    Query Parameters:
        refresh: Set to 'true' to force refresh (bypass cache)
    
    Returns:
        List of controllers with:
        - deviceId, deviceName, deviceType
        - temperature, humidity, vpd
        - ports (connected fans) with current power levels
    """
    try:
        result = get_all_controllers()
        
        if not result['success']:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Unknown error')
            }), 200
        
        return jsonify({
            "success": True,
            "data": result['data'],
            "timestamp": result.get('timestamp')
        }), 200
        
    except Exception as e:
        logger.error('Endpoint: /api/ac-infinity/controllers | Error: %s', e)
        return jsonify({"success": False, "error": str(e)}), 200


@app.route('/api/ac-infinity/controllers/<device_id>', methods=['GET'])
@require_auth
def get_ac_infinity_controller(device_id):
    """
    Get a specific AC Infinity controller by device ID.
    
    Path Parameters:
        device_id: The controller's device ID
    
    Returns:
        Controller details including temperature, humidity, and port status
    """
    try:
        result = get_controller_by_id(device_id)
        
        if not result['success']:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Controller not found')
            }), 200
        
        return jsonify({
            "success": True,
            "data": result['data']
        }), 200
        
    except Exception as e:
        logger.error('Endpoint: /api/ac-infinity/controllers/%s | Error: %s', device_id, e)
        return jsonify({"success": False, "error": str(e)}), 200


@app.route('/api/ac-infinity/settings', methods=['GET'])
@require_auth
def get_ac_infinity_all_settings():
    """
    Get port settings for all controllers and ports in a single batch request.
    This is more efficient than making individual calls per port.
    
    Returns:
        Dict of settings organized by deviceId -> portIndex -> settings
    """
    try:
        result = get_all_port_settings()
        
        if not result['success']:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Failed to get settings')
            }), 200
        
        return jsonify({
            "success": True,
            "data": result['data'],
            "timestamp": result.get('timestamp')
        }), 200
        
    except Exception as e:
        logger.error('Endpoint: /api/ac-infinity/settings | Error: %s', e)
        return jsonify({"success": False, "error": str(e)}), 200


@app.route('/api/ac-infinity/controllers/<device_id>/ports/<int:port>/speed', methods=['POST'])
@require_auth
def set_ac_infinity_fan_speed(device_id, port):
    """
    Set the fan speed for a specific port on a controller.
    
    Path Parameters:
        device_id: The controller's device ID
        port: Port number (1-4)
    
    Body (JSON):
        speed: Speed level 0-10
    
    Returns:
        Success status
    """
    try:
        data = request.get_json()
        if not data or 'speed' not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'speed' in request body"
            }), 400
        
        speed = int(data['speed'])
        if not 0 <= speed <= 10:
            return jsonify({
                "success": False,
                "error": "Speed must be between 0 and 10"
            }), 400
        
        result = set_fan_speed(device_id, port, speed)
        
        if not result['success']:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Failed to set speed')
            }), 200
        
        return jsonify({
            "success": True,
            "message": result.get('message', f'Speed set to {speed}')
        }), 200
        
    except ValueError as e:
        logger.warning('Endpoint: /api/ac-infinity/.../speed | Invalid parameter: %s', e)
        return jsonify({"success": False, "error": "Invalid speed value"}), 400
    except Exception as e:
        logger.error('Endpoint: /api/ac-infinity/.../speed | Error: %s', e)
        return jsonify({"success": False, "error": str(e)}), 200


@app.route('/api/ac-infinity/controllers/<device_id>/ports/<int:port>/settings', methods=['GET'])
@require_auth
def get_ac_infinity_port_settings(device_id, port):
    """
    Get detailed settings for a specific port on a controller.
    
    Path Parameters:
        device_id: The controller's device ID
        port: Port number (1-4)
    
    Returns:
        Port settings including mode, triggers, etc.
    """
    try:
        result = get_port_settings(device_id, port)
        
        if not result['success']:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Failed to get settings')
            }), 200
        
        return jsonify({
            "success": True,
            "data": result['data']
        }), 200
        
    except Exception as e:
        logger.error('Endpoint: /api/ac-infinity/.../settings | Error: %s', e)
        return jsonify({"success": False, "error": str(e)}), 200


@app.route('/api/ac-infinity/controllers/<device_id>/ports/<int:port>/mode', methods=['POST'])
@require_auth
def set_ac_infinity_port_mode(device_id, port):
    """
    Set the operating mode for a specific port on a controller.
    
    Path Parameters:
        device_id: The controller's device ID
        port: Port number (1-4)
    
    Body (JSON):
        mode: Mode number (1=Off, 2=On, 3=Auto, 4=Timer to On, 5=Timer to Off, 6=Cycle, 7=Schedule, 8=VPD)
    
    Returns:
        Success status
    """
    try:
        data = request.get_json()
        if not data or 'mode' not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'mode' in request body"
            }), 400
        
        mode = int(data['mode'])
        if mode not in MODE_NAMES:
            return jsonify({
                "success": False,
                "error": f"Invalid mode: {mode}. Must be 1-8."
            }), 400
        
        result = set_port_mode(device_id, port, mode)
        
        if not result['success']:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Failed to set mode')
            }), 200
        
        return jsonify({
            "success": True,
            "message": result.get('message', f'Mode set to {MODE_NAMES[mode]}')
        }), 200
        
    except ValueError as e:
        logger.warning('Endpoint: /api/ac-infinity/.../mode | Invalid parameter: %s', e)
        return jsonify({"success": False, "error": "Invalid mode value"}), 400
    except Exception as e:
        logger.error('Endpoint: /api/ac-infinity/.../mode | Error: %s', e)
        return jsonify({"success": False, "error": str(e)}), 200


@app.route('/api/ac-infinity/controllers/<device_id>/ports/<int:port>/settings', methods=['POST'])
@require_auth
def update_ac_infinity_port_settings(device_id, port):
    """
    Update multiple settings for a specific port on a controller.
    
    Path Parameters:
        device_id: The controller's device ID
        port: Port number (1-4)
    
    Body (JSON):
        Any combination of:
        - mode: Mode number (1-8)
        - onSpeed: On speed (0-10)
        - offSpeed: Off speed (0-10)
        - tempHigh: Temperature high trigger (Auto mode, Celsius)
        - tempLow: Temperature low trigger (Auto mode, Celsius)
        - humidityHigh: Humidity high trigger (Auto mode, %)
        - humidityLow: Humidity low trigger (Auto mode, %)
        - targetVpd: Target VPD (VPD mode)
        - vpdHigh: VPD high trigger
        - vpdLow: VPD low trigger
    
    Returns:
        Success status
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "Missing request body"
            }), 400
        
        # Map frontend keys to API keys
        settings = {}
        if 'mode' in data:
            settings['atType'] = int(data['mode'])
        if 'onSpeed' in data:
            settings['onSpead'] = int(data['onSpeed'])
        if 'offSpeed' in data:
            settings['offSpead'] = int(data['offSpeed'])
        if 'tempHigh' in data:
            settings['devHt'] = int(data['tempHigh'])
        if 'tempHighF' in data:
            settings['devHtf'] = int(data['tempHighF'])
        if 'tempLow' in data:
            settings['devLt'] = int(data['tempLow'])
        if 'tempLowF' in data:
            settings['devLtf'] = int(data['tempLowF'])
        if 'humidityHigh' in data:
            settings['devHh'] = int(data['humidityHigh'])
        if 'humidityLow' in data:
            settings['devLh'] = int(data['humidityLow'])
        if 'targetVpd' in data:
            settings['targetVpd'] = int(float(data['targetVpd']) * 10)
        if 'vpdHigh' in data:
            settings['activeHtVpdNums'] = int(float(data['vpdHigh']) * 10)
        if 'vpdLow' in data:
            settings['activeLtVpdNums'] = int(float(data['vpdLow']) * 10)
        
        if not settings:
            return jsonify({
                "success": False,
                "error": "No valid settings provided"
            }), 400
        
        result = update_port_settings(device_id, port, settings)
        
        if not result['success']:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Failed to update settings')
            }), 200
        
        return jsonify({
            "success": True,
            "message": result.get('message', 'Settings updated')
        }), 200
        
    except ValueError as e:
        logger.warning('Endpoint: /api/ac-infinity/.../settings | Invalid parameter: %s', e)
        return jsonify({"success": False, "error": "Invalid parameter value"}), 400
    except Exception as e:
        logger.error('Endpoint: /api/ac-infinity/.../settings | Error: %s', e)
        return jsonify({"success": False, "error": str(e)}), 200


@app.route('/api/ac-infinity/modes', methods=['GET'])
@require_auth
def get_ac_infinity_modes():
    """
    Get available operating modes for AC Infinity controllers.
    
    Returns:
        List of available modes with their IDs and names
    """
    return jsonify({
        "success": True,
        "data": [
            {"id": k, "name": v}
            for k, v in MODE_NAMES.items()
        ]
    }), 200


if __name__ == "__main__":
    import time
    # Store startup time as version if BUILD_VERSION not set
    app.config['START_TIME'] = str(int(time.time()))
    
    # Get configuration from environment variables
    debug_mode = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    port = int(os.getenv('FLASK_PORT', '5001'))
    host = os.getenv('FLASK_HOST', '0.0.0.0')  # 0.0.0.0 allows external connections
    
    # Development mode: Use socketio.run with werkzeug
    # Production mode: Use Hypercorn via wsgi.py (this block won't run)
    logger.info(f'Starting development server on {host}:{port} (debug={debug_mode})')
    logger.info('For production, use: hypercorn --bind 0.0.0.0:5001 wsgi:app')
    socketio.run(app, debug=debug_mode, port=port, host=host, allow_unsafe_werkzeug=True)