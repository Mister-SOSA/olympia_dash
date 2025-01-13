from flask import Flask, request, jsonify
from flask_cors import CORS
from database.queries import QueryBuilder
import logging

app = Flask(__name__)

# Enable CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure logging
logging.basicConfig(level=logging.INFO)

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


if __name__ == "__main__":
    app.run(debug=True, port=5001)