from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from config import Config

# Construct the database connection URL
DATABASE_URL = (
    f"mssql+pyodbc://{Config.SQL_SERVER_CONFIG['username']}:{Config.SQL_SERVER_CONFIG['password']}"
    f"@{Config.SQL_SERVER_CONFIG['server']}/{Config.SQL_SERVER_CONFIG['database']}?"
    f"driver={Config.SQL_SERVER_CONFIG['driver']}&TrustServerCertificate={Config.SQL_SERVER_CONFIG['trust_server_certificate']}"
)

# Create the SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create a metadata object for reflecting tables
metadata = MetaData()

# Create a session factory
Session = sessionmaker(bind=engine)

def get_db_session():
    """
    Provides a new SQLAlchemy session for database operations.
    """
    session = Session()
    try:
        yield session
    finally:
        session.close()