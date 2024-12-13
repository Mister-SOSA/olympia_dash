from flask import Flask, request, jsonify
from flask_cors import CORS
from database.queries import QueryBuilder
import logging

app = Flask(__name__)

# Enable CORS
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# Configure logging
logging.basicConfig(level=logging.INFO)

@app.route('/api/widgets', methods=['POST'])
def get_widgets_post():
    """
    API endpoint to fetch widget data dynamically using QueryBuilder.
    """
    try:
        # Parse the incoming JSON payload
        data = request.get_json()
        logging.info(f"Received Payload: {data}")

        table = data.get('table')
        columns = data.get('columns', ['*'])
        filters = data.get('filters', None)
        limit = data.get('limit', None)
        offset = data.get('offset', None)

        # Initialize QueryBuilder
        qb = QueryBuilder(table)
        qb = qb.select(columns)

        if filters:
            qb = qb.where(filters)

        qb = qb.paginate(limit, offset)
        query = qb.build_query()

        # Log the generated query
        logging.info(f"Generated Query: {query}")

        # Execute the query and fetch results
        results = QueryBuilder.execute_query(query)

        return jsonify({"success": True, "data": results}), 200
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)