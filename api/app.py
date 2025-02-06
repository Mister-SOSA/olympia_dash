from flask import Flask, request, jsonify
from flask_cors import CORS
from database.queries import QueryBuilder
import logging
import openmeteo_requests
import requests_cache
import pandas as pd
from retry_requests import retry

app = Flask(__name__)

# OPEN-METEO API CONFIG
cache_session = requests_cache.CachedSession('.cache', expire_after = 3600)
retry_session = retry(cache_session, retries = 5, backoff_factor = 0.2)
openmeteo = openmeteo_requests.Client(session = retry_session)
url = "https://api.open-meteo.com/v1/forecast"
params = {
	"latitude": 41.9353,
	"longitude": -87.8656,
	"current": "relative_humidity_2m"
}

# Enable CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# disable logging
logging.basicConfig(level=logging.ERROR)

@app.route('/api/widgets', methods=['POST'])
def get_widgets_post():
    try:
        data = request.get_json()

        # Check if the user provided a raw query
        raw_query = data.get("raw_query")
        if raw_query:
            # Execute the raw query directly
            results = QueryBuilder.execute_query(raw_query)
            return jsonify({"success": True, "data": results}), 200

        # Extract parameters for dynamic query building
        table = data.get("table")
        columns = data.get("columns", ["*"])
        filters = data.get("filters", None)
        group_by = data.get("group_by", None)
        sort = data.get("sort", None)
        join = data.get("join", None)
        limit = data.get("limit", None)
        offset = data.get("offset", 0)

        # Initialize QueryBuilder
        qb = QueryBuilder(table)
        qb = qb.select(columns)

        if join:
            qb = qb.join_clause(join)
        if filters:
            qb = qb.where(filters)
        if group_by:
            qb = qb.group_by_clause(group_by)
        if sort:
            qb = qb.order_by(sort)
        if limit:
            qb = qb.paginate(limit, offset)

        query = qb.build_query()

        # Execute the dynamically built query
        results = QueryBuilder.execute_query(query)
        logging.info(f"Query: {query}")
        return jsonify({"success": True, "data": results}), 200
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/humidity', methods=['GET'])
def get_humidity():
    try:
        response = openmeteo.weather_api(url, params=params)
        data = response[0].Current().Variables(0).Value()
        print(data)
        return jsonify({"success": True, "data": data}), 200
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5001)