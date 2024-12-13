import pyodbc
from config import Config

class DatabaseConnection:
    def __init__(self):
        config = Config.SQL_SERVER_CONFIG
        self.connection_string = (
            f"DRIVER={{{config['driver']}}};"
            f"SERVER={config['server']};"
            f"DATABASE={config['database']};"
            f"UID={config['username']};"
            f"PWD={config['password']};"
            f"TrustServerCertificate={config['trust_server_certificate']};"
        )
        if config.get('trust_server_certificate', '').lower() == 'true':
            self.connection_string += "TrustServerCertificate=Yes;"

    def get_connection(self):
        """Establish and return a new database connection."""
        try:
            connection = pyodbc.connect(self.connection_string)
            return connection
        except pyodbc.Error as e:
            print(f"Error connecting to the database: {e}")
            raise