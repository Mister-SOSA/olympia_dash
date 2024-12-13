from database.connection import DatabaseConnection

class QueryBuilder:
    def __init__(self, table):
        self.table = table
        self.columns = []
        self.filters = []
        self.sort = None
        self.limit = None
        self.offset = None

    def select(self, columns):
        """Specify columns to select."""
        self.columns = columns
        return self

    def where(self, condition):
        """Add a WHERE condition."""
        self.filters.append(condition)
        return self

    def order_by(self, column, direction="ASC"):
        """Add an ORDER BY clause."""
        self.sort = f"{column} {direction}"
        return self

    def paginate(self, limit, offset):
        """Add LIMIT and OFFSET for pagination."""
        self.limit = limit
        self.offset = offset
        return self

    def build_query(self):
        """Generate the SQL query string."""
        query = f"SELECT {', '.join(self.columns) if self.columns else '*'} FROM {self.table}"
        if self.filters:
            query += f" WHERE {' AND '.join(self.filters)}"
        if self.sort:
            query += f" ORDER BY {self.sort}"
        else:
            query += " ORDER BY (SELECT NULL)"  # SQL Server requires ORDER BY
        if self.limit is not None and self.offset is not None:
            query += f" OFFSET {self.offset or 0} ROWS FETCH NEXT {self.limit} ROWS ONLY"
        return query

    @staticmethod
    def execute_query(query, params=None):
        """Execute the given SQL query."""
        db = DatabaseConnection()
        connection = db.get_connection()
        cursor = connection.cursor()
        try:
            if params:
                cursor.execute(query, params)  # Parameterized query
            else:
                cursor.execute(query)
            results = cursor.fetchall()
            columns = [column[0] for column in cursor.description]
            return [dict(zip(columns, row)) for row in results]
        finally:
            cursor.close()
            connection.close()