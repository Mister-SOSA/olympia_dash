from flask import Flask, request, jsonify
from pydantic import BaseModel, Field, ValidationError
from database.queries import QueryBuilder

app = Flask(__name__)

# Logging
import logging
logging.basicConfig(level=logging.INFO)

@app.before_request
def log_request_info():
    logging.info(f"Request Headers: {request.headers}")
    logging.info(f"Request Body: {request.get_data()}")

@app.after_request
def log_response_info(response):
    logging.info(f"Response: {response.status_code}")
    return response

# Input Validation Schema
class WidgetQueryParams(BaseModel):
    table: str = Field(default='widgets', pattern='^[a-zA-Z_]+$')
    columns: list[str] = Field(default=[])
    filters: str = None
    sort: str = None
    limit: int = Field(default=10, ge=1, le=100)
    offset: int = Field(default=0, ge=0)

# Widget Query Endpoint
@app.route('/api/widgets', methods=['POST'])
def get_widgets_post():
    """
    API endpoint to fetch widget data dynamically using POST and QueryBuilder.
    """
    try:
        # Validate input using Pydantic
        data = request.get_json()
        validated_data = WidgetQueryParams(**data)

        # Extract parameters
        table = validated_data.table
        columns = validated_data.columns
        filters = validated_data.filters
        sort = validated_data.sort
        limit = validated_data.limit
        offset = validated_data.offset

        # Build the query
        qb = QueryBuilder(table)
        qb = qb.select(columns if columns else ['*'])
        if filters:
            qb = qb.where(filters)
        if sort:
            column, direction = sort.split(':')
            qb = qb.order_by(column, direction)
        qb = qb.paginate(limit, offset)

        query = qb.build_query()

        # Execute query and return results
        results = QueryBuilder.execute_query(query)

        return jsonify({
            "success": True,
            "data": results
        }), 200

    except ValidationError as e:
        return jsonify({
            "success": False,
            "error": e.errors()
        }), 400
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True)