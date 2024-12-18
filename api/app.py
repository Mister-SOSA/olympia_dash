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
        table = data.get("table")
        columns = data.get("columns", ["*"])
        filters = data.get("filters", None)
        group_by = data.get("group_by", None)
        sort = data.get("sort", None)  # Can be "month ASC" or "month"

        # Initialize QueryBuilder
        qb = QueryBuilder(table)
        qb = qb.select(columns)

        if filters:
            qb = qb.where(filters)
        if group_by:
            qb = qb.group_by_clause(group_by)
        if sort:
            qb = qb.order_by(sort)  # Handles string or list formats dynamically

        query = qb.build_query()

        # Log the generated query
        logging.info(f"Generated Query: {query}")

        # Execute the query
        results = QueryBuilder.execute_query(query)
        return jsonify({"success": True, "data": results}), 200
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
        
if __name__ == "__main__":
    app.run(debug=True, port=5001, host='172.19.1.186')