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
    """
    # Base SELECT clause
    columns_part = ", ".join(columns) if columns else "*"
    query = f"SELECT {columns_part} FROM {table}"

    # Add JOIN clauses
    if joins:
        query += " " + " ".join(joins)

    # Add WHERE conditions
    if conditions:
        conditions_part = " AND ".join(
            [f"{col} {op} ?" for col, (op, _) in conditions.items()]
        )
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
    """
    query = build_dynamic_query(
        table, columns, conditions, limit, offset, joins, order_by, group_by
    )
    with get_db_connection() as conn:
        cursor = conn.cursor()
        condition_values = [val for _, val in conditions.values()] if conditions else []
        cursor.execute(query, tuple(condition_values))
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]