"""
Flask API for the Olympia Dashboard.

This application provides two endpoints:
1. POST /api/widgets: Executes either a raw SQL query or dynamically builds a query.
2. GET /api/humidity: Retrieves current relative humidity data from the Open-Meteo API.
"""

import logging
import colorlog
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests_cache
import openmeteo_requests
from retry_requests import retry
from database.queries import QueryBuilder

# Configure colorized logging with uniform format
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
logger = colorlog.getLogger()
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
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/api/widgets', methods=['POST'])
def get_widgets_post():
    """
    Handle POST requests to retrieve widget data.

    Accepts a JSON payload that either contains a 'raw_query' to be executed directly,
    or parameters to build a dynamic query:
      - table: the table to query (required if not using 'raw_query')
      - columns: list of columns to select (default: ["*"])
      - filters: conditions for the WHERE clause
      - group_by: columns to group by
      - sort: sort order
      - join: join clause(s)
      - limit: limit for pagination
      - offset: offset for pagination (default: 0)
      - module: the name of the module requesting the query
    """
    try:
        module = request.headers.get("module")
        data = request.get_json(force=True)
        if not data:
            return jsonify({"success": False, "error": "No JSON payload provided"}), 400

        # If a raw SQL query is provided, execute it directly.
        raw_query = data.get("raw_query")
        if raw_query:
            results = QueryBuilder.execute_query(raw_query)
            logger.info('Module: %s | Endpoint: /api/widgets | Action: Executed raw query', module)
            return jsonify({"success": True, "data": results}), 200

        # Ensure required parameters are provided.
        table = data.get("table")
        if not table:
            return jsonify({"success": False, "error": "Table parameter is required"}), 400

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
        logger.info('Module: %s | Endpoint: /api/widgets | Action: Executed dynamic query | Query: %s', module, query)
        return jsonify({"success": True, "data": results}), 200

    except Exception as e:
        logger.error('Module: %s | Endpoint: /api/widgets | Error: %s | Query: %s', module, e, query if 'query' in locals() else 'N/A')
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/humidity', methods=['GET'])
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
        return jsonify({"success": False, "error": str(e)}), 500



if __name__ == "__main__":
    # DISABLE DEBUG FOR PROD
    app.run(debug=True, port=5001, host='172.19.1.95')