from sqlalchemy import Table, select, and_, or_
from .connection import engine, metadata


def build_dynamic_query(
    table_name: str,
    columns: list[str] = None,
    conditions: dict = None,
    limit: int = None,
    offset: int = None,
    joins: list[str] = None,  # SQLAlchemy handles joins differently
    order_by: list[str] = None,
    group_by: list[str] = None
):
    """
    Build a fully dynamic SQLAlchemy query based on the provided arguments.
    """
    # Reflect the table
    table = Table(table_name, metadata, autoload_with=engine)

    # Select specific columns or all columns
    if columns:
        query = select([table.c[col] for col in columns])
    else:
        query = select([table])

    # Add WHERE conditions
    if conditions:
        condition_clauses = []
        for col, (op, val) in conditions.items():
            if op == "BETWEEN" and isinstance(val, list) and len(val) == 2:
                condition_clauses.append(table.c[col].between(val[0], val[1]))
            elif op == "=":
                condition_clauses.append(table.c[col] == val)
            elif op == ">":
                condition_clauses.append(table.c[col] > val)
            elif op == "<":
                condition_clauses.append(table.c[col] < val)
        query = query.where(and_(*condition_clauses))

    # Add GROUP BY
    if group_by:
        query = query.group_by(*[table.c[col] for col in group_by])

    # Add ORDER BY
    if order_by:
        query = query.order_by(*[table.c[col] for col in order_by])

    # Add LIMIT and OFFSET
    if limit:
        query = query.limit(limit)
    if offset:
        query = query.offset(offset)

    return query


def execute_dynamic_query(
    table_name: str,
    columns: list[str] = None,
    conditions: dict = None,
    limit: int = None,
    offset: int = None,
    joins: list[str] = None,  # Joins can be handled in the query if needed
    order_by: list[str] = None,
    group_by: list[str] = None
) -> list[dict]:
    """
    Execute a dynamically built SQLAlchemy query and return the results.
    """
    query = build_dynamic_query(
        table_name, columns, conditions, limit, offset, joins, order_by, group_by
    )

    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row) for row in result]