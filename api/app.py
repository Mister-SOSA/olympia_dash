import json
from flask import Flask, jsonify, request
from database.queries import execute_dynamic_query

app = Flask(__name__)

@app.route('/api/data/advanced', methods=['GET'])
def get_advanced_data() -> tuple:
    """
    API endpoint for advanced dynamic queries.
    Query parameters:
        - table (str): The name of the table.
        - columns (str, optional): Comma-separated list of columns to fetch.
        - conditions (str, optional): JSON object of column-value pairs for filtering.
        - limit (int, optional): Number of rows to fetch.
        - offset (int, optional): Offset for pagination.
        - joins (str, optional): Comma-separated JOIN clauses.
        - order_by (str, optional): Comma-separated columns for ordering. Example: "created_at DESC,id ASC".
        - group_by (str, optional): Comma-separated columns for grouping.

    Example:
        /api/data/advanced?table=users&columns=id,name&conditions={"status":"active"}&limit=100&order_by=created_at DESC
    """
    # Parse query parameters
    table = request.args.get('table', '')
    if not table:
        return jsonify({"status": "error", "message": "Table name is required"}), 400

    columns = request.args.get('columns', '').split(',') if request.args.get('columns') else None
    conditions = json.loads(request.args.get('conditions', '{}')) if request.args.get('conditions') else None
    limit = int(request.args.get('limit', 0)) if request.args.get('limit') else None
    offset = int(request.args.get('offset', 0)) if request.args.get('offset') else None
    joins = request.args.get('joins', '').split(',') if request.args.get('joins') else None
    order_by = request.args.get('order_by', '').split(',') if request.args.get('order_by') else None
    group_by = request.args.get('group_by', '').split(',') if request.args.get('group_by') else None

    try:
        # Execute the dynamic query
        data = execute_dynamic_query(table, columns, conditions, limit, offset, joins, order_by, group_by)
        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)