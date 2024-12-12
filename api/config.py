import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQL_SERVER_CONFIG = {
        'server': os.getenv('SQL_SERVER', ''),
        'database': os.getenv('SQL_DATABASE', ''),
        'username': os.getenv('SQL_USERNAME', ''),
        'password': os.getenv('SQL_PASSWORD', ''),
        'driver': os.getenv('SQL_DRIVER', ''),
        'trust_server_certificate': os.getenv('SQL_TRUST_CERT', '')
    }