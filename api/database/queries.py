from database.connection import DatabaseConnection
import colorlog
import logging

# Configure colorized logging with uniform format
logger = colorlog.getLogger()
# Only add the handler if one isn't already attached.
if not any(isinstance(h, colorlog.StreamHandler) for h in logger.handlers):
    handler = colorlog.StreamHandler()
    handler.setFormatter(colorlog.ColoredFormatter(
        '%(log_color)s%(asctime)s - %(levelname)-8s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        log_colors={
            'DEBUG':    'cyan',
            'INFO':     'green',
            'WARNING':  'yellow',
            'ERROR':    'red',
            'CRITICAL': 'bold_red',
        }
    ))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

class QueryBuilder:
    def __init__(self, table):
        """
        Initialize the QueryBuilder with a table name.
        """
        self.table = table
        self.columns = []
        self.filters = []
        self.sort = None
        self.limit = None
        self.offset = None
        self.group_by = []
        self.join = None  # New attribute for JOIN clause

    def select(self, columns):
        """
        Specify the columns to select.
        """
        self.columns = columns
        return self

    def where(self, condition):
        """
        Add a WHERE condition.
        """
        self.filters.append(condition)
        return self

    def join_clause(self, join):
        """
        Add a JOIN clause.
        Expected format:
        join = {
            "table": "other_table",
            "on": "main_table.column = other_table.column",
            "type": "LEFT"  # Optional, defaults to INNER if not specified
        }
        """
        join_type = join.get("type", "INNER").upper()
        self.join = f"{join_type} JOIN {join['table']} ON {join['on']}"
        return self

    def order_by(self, sort):
        """
        Add an ORDER BY clause. Handles various formats like:
        - "month ASC"
        - "month"
        - ["month ASC", "another_column DESC"]
        """
        if isinstance(sort, str):
            parts = sort.split()
            column = parts[0]
            direction = parts[1].upper() if len(parts) > 1 else "ASC"
            self.sort = f"{column} {direction}"
        elif isinstance(sort, list):
            self.sort = ", ".join(sort)
        else:
            raise ValueError(f"Invalid sort format: {sort}")
        return self

    def group_by_clause(self, columns):
        """
        Add a GROUP BY clause.
        """
        self.group_by = columns
        return self

    def paginate(self, limit, offset):
        """
        Add LIMIT and OFFSET for pagination.
        """
        self.limit = limit
        self.offset = offset
        return self

    def build_query(self):
        """
        Generate the SQL query string.
        """
        query = f"SELECT {', '.join(self.columns) if self.columns else '*'} FROM {self.table}"
        
        # Add JOIN clause if present
        if self.join:
            query += f" {self.join}"
        
        # Add WHERE conditions
        if self.filters:
            query += f" WHERE {' AND '.join(self.filters)}"
        
        # Add GROUP BY clause
        if self.group_by:
            query += f" GROUP BY {', '.join(self.group_by)}"
        
        # Add ORDER BY clause
        if self.sort:
            query += f" ORDER BY {self.sort}"
        else:
            query += " ORDER BY (SELECT NULL)"  # Default order required for SQL Server with OFFSET
        
        # Add pagination
        if self.limit is not None and self.offset is not None:
            query += f" OFFSET {self.offset or 0} ROWS FETCH NEXT {self.limit} ROWS ONLY"
        
        return query

    @staticmethod
    def execute_query(query, params=None):
        """
        Execute the given SQL query and return the results as a list of dictionaries.
        """
        db = DatabaseConnection()
        logger.info("Opening database connection for query: %s", query)
        connection = db.get_connection()
        cursor = connection.cursor()
        try:
            if params:
                logger.info("Executing parameterized query with params: %s", params)
                cursor.execute(query, params)  # Parameterized query
            else:
                logger.info("Executing query without parameters.")
                cursor.execute(query)
            
            # Fetch results and column names
            results = cursor.fetchall()
            columns = [column[0] for column in cursor.description]
            logger.info("Query executed successfully, fetched %d rows.", len(results))
            return [dict(zip(columns, row)) for row in results]
        except Exception as e:
            logger.error("Error executing query: %s", e)
            raise
        finally:
            cursor.close()
            connection.close()
            logger.info("Closed database connection for query.")