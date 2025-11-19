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
from auth.middleware import require_auth
from services.usda_mpr import get_beef_prices, get_beef_heart_prices

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

# Initialize SocketIO for real-time preference sync
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Track active sessions per room (use app context for persistence)
if not hasattr(app, 'active_sessions'):
    app.active_sessions = {}

# WebSocket handlers
@socketio.on('connect')
def handle_connect():
    logger.info(f'Client connected: {request.sid}')

@socketio.on('join')
def handle_join(data):
    """Join user-specific room for receiving preference updates"""
    from flask_socketio import emit, rooms
    user_id = data.get('user_id')
    session_id = data.get('session_id', 'unknown')
    logger.info(f'🔵 JOIN REQUEST - User: {user_id}, Session: {session_id[:8]}..., SID: {request.sid}')
    
    if user_id:
        room = f'user_{user_id}'
        join_room(room)
        
        # Track this session
        if room not in app.active_sessions:
            app.active_sessions[room] = set()
        app.active_sessions[room].add(request.sid)
        
        session_count = len(app.active_sessions[room])
        logger.info(f'✅ JOINED - Session {session_id[:8]}... (SID: {request.sid}) joined room {room}')
        logger.info(f'   📊 Total sessions in {room}: {session_count}')
        logger.info(f'   📊 Active SIDs in room: {[sid[:8] for sid in app.active_sessions[room]]}')
        
        # Send confirmation to joining client
        emit('joined', {'room': room, 'session_count': session_count})
        logger.info(f'📤 SENT joined confirmation to {request.sid}')
        
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
    session_count = len(app.active_sessions.get(room, set()))
    
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
    for room, sessions in list(app.active_sessions.items()):
        if request.sid in sessions:
            sessions.remove(request.sid)
            remaining_count = len(sessions)
            logger.info(f'❌ Client {request.sid} disconnected from {room}')
            logger.info(f'   📊 Remaining sessions in {room}: {remaining_count}')
            
            # Notify remaining sessions about count change
            if remaining_count > 0:
                emit('session_count_updated', {'session_count': remaining_count}, to=room, namespace='/')
                logger.info(f'📤 Notified remaining sessions - count: {remaining_count}')
            
            if remaining_count == 0:
                del app.active_sessions[room]
    
    if not any(request.sid in sessions for sessions in app.active_sessions.values()):
        logger.info(f'❌ Client disconnected: {request.sid}')

# Register authentication blueprints with /api/auth prefix
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(device_bp, url_prefix='/api/auth/device')
app.register_blueprint(admin_bp, url_prefix='/api/auth/admin')
app.register_blueprint(preferences_bp, url_prefix='/api')
app.register_blueprint(groups_bp, url_prefix='/api/auth/admin/groups')
app.register_blueprint(widget_bp, url_prefix='/api/auth/widgets')

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
        humidity = response[0].Current().Variables(0).Value()
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



if __name__ == "__main__":
    # Get configuration from environment variables
    debug_mode = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    port = int(os.getenv('FLASK_PORT', '5001'))
    host = os.getenv('FLASK_HOST', '0.0.0.0')  # 0.0.0.0 allows external connections
    
    # Use socketio.run instead of app.run for WebSocket support
    socketio.run(app, debug=debug_mode, port=port, host=host, allow_unsafe_werkzeug=True)