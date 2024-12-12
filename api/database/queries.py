from .connection import get_db_connection


def build_dynamic_query(
    table: str,
    columns: list[str] = None,
    conditions: dict = None,
    limit: int = None,
    offset: int = None,
    joins: list[str] = None,
    order_by: list[str] = None,
    group_by: list[str] = None
) -> str:
    """
    Build a fully dynamic SQL query based on the provided arguments.

    Args:
        table (str): The primary table to fetch data from.
        columns (list[str], optional): Specific columns to retrieve. Defaults to None (fetch all columns).
        conditions (dict, optional): A dictionary of column-value pairs for WHERE conditions. Defaults to None.
        limit (int, optional): Number of rows to fetch. Defaults to None (fetch all rows).
        offset (int, optional): Offset for pagination. Defaults to None.
        joins (list[str], optional): List of JOIN clauses. Example: ["INNER JOIN orders ON users.id = orders.user_id"].
        order_by (list[str], optional): List of columns for ORDER BY. Example: ["created_at DESC", "id ASC"].
        group_by (list[str], optional): List of columns for GROUP BY.

    Returns:
        str: The dynamically built SQL query.
    """
    # Base SELECT clause
    columns_part = ", ".join(columns) if columns else "*"
    query = f"SELECT {columns_part} FROM {table}"

    # Add JOIN clauses
    if joins:
        for join in joins:
            query += f" {join}"

    # Add WHERE conditions
    if conditions:
        conditions_part = " AND ".join([f"{col} = ?" for col in conditions.keys()])
        query += f" WHERE {conditions_part}"

    # Add GROUP BY
    if group_by:
        query += f" GROUP BY {', '.join(group_by)}"

    # Add ORDER BY
    if order_by:
        query += f" ORDER BY {', '.join(order_by)}"

    # Add LIMIT and OFFSET
    if limit:
        query += f" LIMIT {limit}"
        if offset:
            query += f" OFFSET {offset}"

    return query


def execute_dynamic_query(
    table: str,
    columns: list[str] = None,
    conditions: dict = None,
    limit: int = None,
    offset: int = None,
    joins: list[str] = None,
    order_by: list[str] = None,
    group_by: list[str] = None
) -> list[dict]:
    """
    Execute a dynamically built query and return the results.

    Args:
        See `build_dynamic_query`.

    Returns:
        list[dict]: A list of rows, where each row is represented as a dictionary.
    """
    query = build_dynamic_query(
        table, columns, conditions, limit, offset, joins, order_by, group_by
    )
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, tuple(conditions.values()) if conditions else ())
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]