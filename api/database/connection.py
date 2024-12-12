import pyodbc
from config import Config
from contextlib import contextmanager

@contextmanager
def get_db_connection():
    """
    Context manager to get a database connection
    """
    connection = None

    try:
        connection = pyodbc.connect(
            f"DRIVER={Config.SQL_SERVER_CONFIG['driver']};"
            f"SERVER={Config.SQL_SERVER_CONFIG['server']};"
            f"DATABASE={Config.SQL_SERVER_CONFIG['database']};"
            f"UID={Config.SQL_SERVER_CONFIG['username']};"
            f"PWD={Config.SQL_SERVER_CONFIG['password']};"
            f"TrustServerCertificate={Config.SQL_SERVER_CONFIG['trust_server_certificate']};"
        )
        yield connection
    
    except Exception as e:
        print(f"Database connection error: {e}")
        raise

    finally:
        if connection:
            connection.close()