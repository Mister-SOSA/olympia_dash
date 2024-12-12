from .connection import get_db_connection

def fetch_all_data(table: str) -> list[dict]:
    """
    Fetch all rows from a table.

    Args:
        table (str): The name of the table to fetch data from.

    Returns:
        list[dict]: A list of rows, each represented as a dictionary.
    """
    query: str = f"SELECT * FROM {table}"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query)
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
    
def fetch_data_with_filter(table: str, column: str, value: str) -> list[dict]:
    """
    Fetch rows from a table that match a filter.

    Args:
        table (str): The name of the table to fetch data from.
        column (str): The column to filter on.
        value (str): The value to filter on.

    Returns:
        list[dict]: A list of rows, each represented as a dictionary.
    """
    query: str = f"SELECT * FROM {table} WHERE {column} = ?"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, value)
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
    
        